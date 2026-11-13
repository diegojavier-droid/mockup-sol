-- DRAFT ONLY. Not in the production migration chain; not applied.
-- Generate a migration with the pinned Supabase CLI before an approved rollout.
-- Target must be verified independently as ijzpmwwjuvsgcsbcbzav. GUCs are opt-in,
-- not host attestation. No accounts, payments, refund policy or legacy rows change.
begin;
do $$
begin
  if current_setting('sol_mai.target_project_ref', true) is distinct from 'ijzpmwwjuvsgcsbcbzav'
     or current_setting('sol_mai.apply_team_scope', true) is distinct from 'yes' then
    raise exception 'isolated_team_scope_target_required';
  end if;
  if to_regclass('public.site_operating_creates') is null or to_regclass('public.site_operating_nonces') is null then
    raise exception 'isolated_site_setup_required';
  end if;
  if exists(select 1 from auth.users) or exists(select 1 from public.payments)
     or (select count(*) from public.staff_members) <> 1
     or not exists(select 1 from public.staff_members where email='site-owner@example.invalid' and role='owner' and is_active and deleted_at is null)
     or exists(select 1 from public.bookings b where not exists(select 1 from public.site_operating_creates s where s.booking_id=b.id))
     or exists(select 1 from public.customers c where not exists(select 1 from public.bookings b join public.site_operating_creates s on s.booking_id=b.id where b.customer_id=c.id)) then
    raise exception 'isolated_site_provenance_required';
  end if;
  if (select value from public.business_settings where key='refund_window_hours') is distinct from '24'::jsonb then
    raise exception 'existing_24_hour_policy_required';
  end if;
end $$;

alter table public.roles add column agenda_scope text not null default 'assigned'
  constraint roles_agenda_scope_valid check (agenda_scope in ('assigned','all'));

-- The protected owner already had full access. No other role is promoted.
update public.roles set agenda_scope='all' where slug='owner' and is_system;
do $$ begin
  if not exists(select 1 from public.roles where slug='owner' and is_system and agenda_scope='all') then
    raise exception 'protected_owner_role_required';
  end if;
end $$;
alter table public.roles add constraint roles_owner_scope_protected check (slug <> 'owner' or agenda_scope='all');
comment on column public.roles.agenda_scope is
  'Assigned restricts to bookings.staff_id = actor; NULL assignment is private to explicitly global operators. No implicit secretary mapping.';

create table public.booking_attention (
  booking_id uuid primary key references public.bookings(id) on delete restrict,
  started_at timestamptz not null,
  started_by uuid not null references public.staff_members(id) on delete restrict,
  finished_at timestamptz,
  finished_by uuid references public.staff_members(id) on delete restrict,
  constraint booking_attention_finish_pair check ((finished_at is null) = (finished_by is null)),
  constraint booking_attention_time_order check (finished_at is null or finished_at >= started_at)
);
alter table public.booking_attention enable row level security;
revoke all on public.booking_attention from public, anon, authenticated;
grant select, insert, update on public.booking_attention to service_role;
comment on table public.booking_attention is
  'Real server-recorded start/end only. No price, charge, payment, cleanup or capacity effect. Historical attention is not backfilled.';

-- New name preserves the legacy RPC return type and Site wrappers unchanged.
create function public.resolve_staff_session_scoped(p_email text)
returns table(staff_id uuid,display_name text,role text,role_name text,permisos jsonb,agenda_scope text,attention_enabled boolean)
language sql stable security invoker set search_path = public, pg_temp as $$
  select s.id,s.display_name,s.role,r.name,
    coalesce((select jsonb_object_agg(rp.module,rp.level) from public.role_permissions rp where rp.role_slug=s.role),'{}'::jsonb),
    r.agenda_scope,true
  from public.staff_members s join public.roles r on r.slug=s.role
  where s.email is not null and lower(s.email)=lower(btrim(p_email))
    and s.is_active and s.deleted_at is null
  limit 1;
$$;
revoke all on function public.resolve_staff_session_scoped(text) from public,anon,authenticated;
grant execute on function public.resolve_staff_session_scoped(text) to service_role;

create function public.record_booking_attention(p_booking_id uuid,p_action text,p_actor_id uuid)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  actor public.staff_members%rowtype;
  actor_role public.roles%rowtype;
  permission_level text;
  booking public.bookings%rowtype;
  attention public.booking_attention%rowtype;
  at_time timestamptz;
begin
  if p_booking_id is null or p_actor_id is null or p_action is null or p_action not in ('start','finish') then
    raise exception 'invalid_attention_request' using errcode='PT400';
  end if;
  -- Hold membership, scope and capability rows until commit, so deactivation,
  -- role change and permission downgrade cannot race authorization/write.
  select * into actor from public.staff_members where id=p_actor_id for share;
  if not found or not actor.is_active or actor.deleted_at is not null then
    raise exception 'attention_forbidden' using errcode='PT403';
  end if;
  select * into actor_role from public.roles where slug=actor.role for share;
  if not found then raise exception 'attention_forbidden' using errcode='PT403'; end if;
  select level into permission_level from public.role_permissions
    where role_slug=actor.role and module='calendario' for share;
  if permission_level is distinct from 'full' then
    raise exception 'attention_forbidden' using errcode='PT403';
  end if;
  select * into booking from public.bookings where id=p_booking_id for update;
  if not found or (actor_role.agenda_scope <> 'all' and booking.staff_id is distinct from actor.id) then
    raise exception 'booking_not_accessible' using errcode='PT404';
  end if;
  if booking.status not in ('confirmed','attended') then
    raise exception 'attention_invalid_status' using errcode='PT409';
  end if;
  select * into attention from public.booking_attention where booking_id=p_booking_id;
  if p_action='start' then
    if attention.booking_id is null then
      -- Never manufacture real timestamps for an attention previously closed.
      if exists(select 1 from public.service_execution_records where booking_id=p_booking_id) then
        raise exception 'attention_already_finished' using errcode='PT409';
      end if;
      at_time:=clock_timestamp();
      insert into public.booking_attention(booking_id,started_at,started_by)
        values(p_booking_id,at_time,actor.id) returning * into attention;
      perform public.record_audit(actor.id,actor.email,'booking_attention_started','booking',p_booking_id,
        jsonb_build_object('started_at',attention.started_at));
    end if;
  else
    if attention.booking_id is null then
      raise exception 'attention_not_started' using errcode='PT409';
    end if;
    if attention.finished_at is null then
      at_time:=clock_timestamp();
      if at_time < attention.started_at then raise exception 'attention_clock_error' using errcode='PT503'; end if;
      update public.booking_attention set finished_at=at_time,finished_by=actor.id
        where booking_id=p_booking_id returning * into attention;
      perform public.record_audit(actor.id,actor.email,'booking_attention_finished','booking',p_booking_id,
        jsonb_build_object('started_at',attention.started_at,'finished_at',attention.finished_at));
    end if;
  end if;
  return jsonb_build_object('booking_id',attention.booking_id,'started_at',attention.started_at,'finished_at',attention.finished_at);
end;
$$;
revoke all on function public.record_booking_attention(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.record_booking_attention(uuid,text,uuid) to service_role;
commit;
