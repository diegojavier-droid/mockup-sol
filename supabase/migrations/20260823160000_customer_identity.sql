-- =====================================================================
-- Sol Mai · V4.1 Fase 3 — Identidad de la clienta
--
-- Hoy las clientas no tienen identidad: una reserva se recupera con un
-- token secreto en la URL. No hay cuenta, ni "mis turnos", ni forma de
-- reconocer a alguien que ya vino.
--
-- El problema de fondo: la identidad operativa del salón es el TELÉFONO
-- (`customers.phone_e164` es único), y Google entrega EMAIL. Son dos
-- claves distintas para la misma persona.
--
-- Decisión D-14/D-03:
--   * `customers` sigue siendo LA PERSONA;
--   * `customer_identities` es CÓMO entra (Google, email+clave, …);
--   * una persona puede tener varias credenciales;
--   * el email coincidente vincula automáticamente;
--   * el teléfono coincidente NO entrega historial — el teléfono no es
--     autenticación. Queda vínculo pendiente y la clienta puede reservar
--     igual: no poder reservar sería el peor resultado posible.
-- =====================================================================

create table if not exists public.customer_identities (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references public.customers(id) on delete cascade,
  provider         text not null check (provider in ('google','password','manual')),
  -- Identificador estable del proveedor (el `sub` de Google). Para
  -- `manual` puede no existir.
  provider_subject text,
  email            text not null check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  -- pending: coincidió el teléfono pero no el email. Puede reservar,
  -- pero NO ve el historial hasta que el salón confirme.
  link_status      text not null default 'linked'
    check (link_status in ('linked','pending')),
  linked_at        timestamptz,
  linked_by        uuid references public.staff_members(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Una credencial pertenece a una sola persona.
create unique index if not exists customer_identities_provider_subject_key
  on public.customer_identities (provider, provider_subject)
  where provider_subject is not null;

create unique index if not exists customer_identities_provider_email_key
  on public.customer_identities (provider, lower(email));

create index if not exists customer_identities_customer_idx
  on public.customer_identities (customer_id);

revoke all on public.customer_identities from anon, authenticated;
grant all on public.customer_identities to service_role;
alter table public.customer_identities enable row level security;

comment on table public.customer_identities is
  'Formas de entrar de una persona. El teléfono NO es una credencial: coincidir de teléfono deja el vínculo en pending.';

-- ---------------------------------------------------------------------
-- Resolver identidad al entrar con Google
-- ---------------------------------------------------------------------
-- Devuelve a quién corresponde y si puede ver su historial.
--
--   matched_email  → vínculo automático, historial disponible
--   matched_phone  → vínculo PENDIENTE, sin historial, puede reservar
--   created        → persona nueva
--   needs_phone    → no alcanza el email para identificarla

create or replace function public.resolve_customer_identity(
  p_provider   text,
  p_subject    text,
  p_email      text,
  p_first_name text default null,
  p_last_name  text default null,
  p_phone      text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_identity public.customer_identities%rowtype;
  v_customer public.customers%rowtype;
  v_outcome  text;
begin
  if p_email is null or btrim(p_email) = '' then
    raise exception 'email_required';
  end if;

  -- 1. ¿Esta credencial ya se usó antes?
  select * into v_identity from public.customer_identities
   where provider = p_provider
     and (
       (p_subject is not null and provider_subject = p_subject)
       or lower(email) = lower(btrim(p_email))
     )
   limit 1;

  if found then
    select * into v_customer from public.customers where id = v_identity.customer_id;
    return jsonb_build_object(
      'outcome',        case when v_identity.link_status = 'pending' then 'pending_link' else 'known' end,
      'customer_id',    v_customer.id,
      'first_name',     v_customer.first_name,
      'link_status',    v_identity.link_status,
      'can_see_history', v_identity.link_status = 'linked'
    );
  end if;

  -- 2. ¿Hay una ficha con ese email? Doble coincidencia → vínculo automático.
  select * into v_customer from public.customers
   where email is not null and lower(email) = lower(btrim(p_email))
   limit 1;

  if found then
    insert into public.customer_identities (customer_id, provider, provider_subject, email, link_status, linked_at)
    values (v_customer.id, p_provider, p_subject, btrim(p_email), 'linked', now());
    return jsonb_build_object(
      'outcome',        'matched_email',
      'customer_id',    v_customer.id,
      'first_name',     v_customer.first_name,
      'link_status',    'linked',
      'can_see_history', true
    );
  end if;

  -- 3. ¿Hay una ficha con ese teléfono? El teléfono NO autentica: vínculo
  --    pendiente, sin historial, pero puede reservar.
  if p_phone is not null and btrim(p_phone) <> '' then
    select * into v_customer from public.customers where phone_e164 = btrim(p_phone) limit 1;
    if found then
      insert into public.customer_identities (customer_id, provider, provider_subject, email, link_status)
      values (v_customer.id, p_provider, p_subject, btrim(p_email), 'pending');
      return jsonb_build_object(
        'outcome',        'pending_link',
        'customer_id',    v_customer.id,
        'first_name',     null,          -- no se filtra el nombre de otra persona
        'link_status',    'pending',
        'can_see_history', false
      );
    end if;
  end if;

  -- 4. Nadie conocido. Sin teléfono no se puede crear la ficha: es la
  --    clave operativa con la que el salón encuentra a una persona.
  if p_phone is null or btrim(p_phone) = '' then
    return jsonb_build_object('outcome', 'needs_phone', 'can_see_history', false);
  end if;

  insert into public.customers (first_name, last_name, phone_e164, email)
  values (coalesce(nullif(btrim(p_first_name), ''), split_part(btrim(p_email), '@', 1)),
          nullif(btrim(p_last_name), ''), btrim(p_phone), btrim(p_email))
  returning * into v_customer;

  insert into public.customer_identities (customer_id, provider, provider_subject, email, link_status, linked_at)
  values (v_customer.id, p_provider, p_subject, btrim(p_email), 'linked', now());

  return jsonb_build_object(
    'outcome',        'created',
    'customer_id',    v_customer.id,
    'first_name',     v_customer.first_name,
    'link_status',    'linked',
    'can_see_history', true
  );
end;
$$;

revoke all on function public.resolve_customer_identity(text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.resolve_customer_identity(text, text, text, text, text, text)
  to service_role;

-- ---------------------------------------------------------------------
-- Confirmar o rechazar un vínculo pendiente (lo decide el salón)
-- ---------------------------------------------------------------------

create or replace function public.resolve_pending_link(
  p_identity_id uuid,
  p_approve     boolean,
  p_actor_id    uuid default null,
  p_actor_label text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_identity public.customer_identities%rowtype;
begin
  select * into v_identity from public.customer_identities where id = p_identity_id for update;
  if not found then
    raise exception 'identity_not_found';
  end if;

  if p_approve then
    update public.customer_identities
       set link_status = 'linked', linked_at = now(), linked_by = p_actor_id, updated_at = now()
     where id = p_identity_id;
  else
    delete from public.customer_identities where id = p_identity_id;
  end if;

  perform public.record_audit(
    p_actor_id, p_actor_label,
    case when p_approve then 'identity_linked' else 'identity_rejected' end,
    'customer', v_identity.customer_id,
    jsonb_build_object('identity_id', p_identity_id, 'email', v_identity.email)
  );

  return jsonb_build_object('resolved', true, 'approved', p_approve);
end;
$$;

revoke all on function public.resolve_pending_link(uuid, boolean, uuid, text)
  from public, anon, authenticated;
grant execute on function public.resolve_pending_link(uuid, boolean, uuid, text) to service_role;

-- ---------------------------------------------------------------------
-- Últimos servicios REALIZADOS
-- ---------------------------------------------------------------------
-- "Realizado" significa atención cerrada, nunca reserva creada. Una
-- reserva cancelada no es un servicio (RN-014).

create or replace function public.recent_services(
  p_customer_id uuid,
  p_limit       integer default 3
) returns table (
  service_slug text,
  service_name text,
  length_tier  text,
  last_done_at timestamptz,
  times_done   bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.slug,
    max(bi.snapshot_name)              as service_name,
    max(bi.snapshot_length_tier)       as length_tier,
    max(b.starts_at)                   as last_done_at,
    count(*)                           as times_done
  from public.bookings b
  join public.booking_items bi on bi.booking_id = b.id and bi.role = 'main'
  join public.services s       on s.id = bi.service_id
  where b.customer_id = p_customer_id
    and b.status = 'attended'
  group by s.slug
  order by max(b.starts_at) desc
  limit greatest(p_limit, 1);
$$;

revoke all on function public.recent_services(uuid, integer) from public, anon, authenticated;
grant execute on function public.recent_services(uuid, integer) to service_role;
