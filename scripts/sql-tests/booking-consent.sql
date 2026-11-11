\set ON_ERROR_STOP on
-- Run only on an isolated test database. All fixtures, triggers and writes
-- are rolled back. No production credentials or data are needed.
begin;

create function pg_temp.consent_test_booking(p_phone text, p_version text, p_start timestamptz,
                                           p_service text default 'corte-fem')
returns jsonb language sql as $$
  select public.create_online_booking(
    p_area_slug => 'peluqueria',
    p_starts_at => p_start,
    p_ends_at => p_start + interval '30 minutes',
    p_shown_duration_min => 30,
    p_price_display_mode => 'fixed',
    p_price_estimated_min => 1000,
    p_price_estimated_max => null,
    p_deposit_rate => 20,
    p_deposit_amount => 200,
    p_customer => jsonb_build_object('first_name', 'CI Consent', 'phone_e164', p_phone,
                                    'email', 'consent@example.test', 'accepts_marketing', true),
    p_items => jsonb_build_array(jsonb_build_object(
      'service_slug', p_service, 'role', 'main', 'name', 'CI service', 'price_amount', 1000,
      'length_tier', 'medio', 'duration_min', 30, 'process_min', 0, 'setup_min', 0,
      'personalization', jsonb_build_object('alergias', 'si-leves'))),
    p_terms_version => p_version,
    p_customer_note => 'Synthetic test note'
  );
$$;

create function pg_temp.fail_test_consent()
returns trigger language plpgsql as $$
begin
  if new.version = 'ci-reject' then raise exception 'ci_forced_consent_failure'; end if;
  if new.version = 'ci-suppress' then return null; end if;
  return new;
end;
$$;
create trigger ci_fail_test_consent before insert on public.customer_consents
  for each row execute function pg_temp.fail_test_consent();

-- Exercise actual EXECUTE denial, not only a catalog inspection.
set local role anon;
do $$
begin
  begin
    perform public.create_online_booking('peluqueria', now(), now() + interval '30 minutes',
      30, 'fixed', 1000, null, 20, 200, '{}'::jsonb, '[]'::jsonb, 'ci-version');
    raise exception 'anon unexpectedly executed online booking';
  exception when insufficient_privilege then null;
  end;
end;
$$;
set local role authenticated;
do $$
begin
  begin
    perform public.create_online_booking('peluqueria', now(), now() + interval '30 minutes',
      30, 'fixed', 1000, null, 20, 200, '{}'::jsonb, '[]'::jsonb, 'ci-version');
    raise exception 'authenticated unexpectedly executed online booking';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- Temporary test helpers are visible to the API role only in this session.
grant usage on schema pg_temp to service_role;
grant execute on function pg_temp.consent_test_booking(text, text, timestamptz, text) to service_role;

-- The same role the API uses must be able to call the atomic RPC.
set local role service_role;
do $$
declare
  v_before bigint[];
  v_after bigint[];
  v_version text;
  v_booking jsonb;
  v_id uuid;
  v_existing public.customers%rowtype;
  v_after_customer public.customers%rowtype;
  v_start timestamptz := '2099-11-11 12:00:00+00';
begin
  select array[(select count(*) from public.customers), (select count(*) from public.bookings),
               (select count(*) from public.booking_items), (select count(*) from public.customer_consents)]
    into v_before;

  foreach v_version in array array[null::text, '', '   ', repeat('x', 33)] loop
    begin
      perform pg_temp.consent_test_booking('+5493429990001', v_version, v_start);
      raise exception 'missing or malformed consent was accepted';
    exception when invalid_parameter_value then null;
    end;
  end loop;

  -- Failure AFTER create_booking has written must undo every related row.
  foreach v_version in array array['ci-reject', 'ci-suppress'] loop
    begin
      perform pg_temp.consent_test_booking('+5493429990002', v_version, v_start);
      raise exception 'consent fault did not abort booking';
    exception when raise_exception then
      if sqlerrm not in ('ci_forced_consent_failure', 'booking_consent_not_recorded') then raise; end if;
    end;
  end loop;

  -- A failure in the existing booking motor must not leave consent either.
  begin
    perform pg_temp.consent_test_booking('+5493429990003', 'ci-version', v_start, 'ci-missing-service');
    raise exception 'invalid service was accepted';
  exception when raise_exception then
    if sqlerrm <> 'unknown_service' then raise; end if;
  end;

  select array[(select count(*) from public.customers), (select count(*) from public.bookings),
               (select count(*) from public.booking_items), (select count(*) from public.customer_consents)]
    into v_after;
  if v_after <> v_before then raise exception 'failed requests left orphan records'; end if;

  -- Rollback must also revert an upsert to an existing customer, not only INSERTs.
  insert into public.customers(first_name, phone_e164, accepts_marketing)
    values ('CI Existing', '+5493429990004', false) returning * into v_existing;
  begin
    perform pg_temp.consent_test_booking(v_existing.phone_e164, 'ci-reject', v_start);
    raise exception 'existing customer consent failure was ignored';
  exception when raise_exception then
    if sqlerrm <> 'ci_forced_consent_failure' then raise; end if;
  end;
  select * into v_after_customer from public.customers where id = v_existing.id;
  if to_jsonb(v_after_customer) <> to_jsonb(v_existing) then
    raise exception 'failed consent changed existing customer';
  end if;

  -- The previously failed slot is still usable, with original public hold rules.
  v_booking := pg_temp.consent_test_booking('+5493429990005', 'ci-version', v_start);
  v_id := (v_booking->>'id')::uuid;
  if v_booking->>'status' <> 'pending_payment' or v_booking->>'source' <> 'online'
     or (v_booking->>'deposit_amount')::integer <> 200
     or (v_booking->>'created_via_override')::boolean then
    raise exception 'online booking behavior changed';
  end if;
  if not exists (select 1 from public.bookings where id = v_id
                  and payment_required_until = created_at + interval '10 minutes') then
    raise exception 'payment hold changed';
  end if;
  if (select count(*) from public.customer_consents c join public.bookings b
      on b.id = c.booking_id and b.customer_id = c.customer_id
      where b.id = v_id and c.version = 'ci-version' and c.channel = 'web'
        and c.document = 'terminos_y_privacidad') <> 1 then
    raise exception 'booking does not have exactly one matching consent';
  end if;
  if not exists (select 1 from public.booking_items where booking_id = v_id
                  and personalization->>'alergias' = 'si-leves') then
    raise exception 'consented health context was lost';
  end if;

  -- Existing idempotent repair RPC remains safe for historical consent repair.
  perform public.record_booking_consent(v_id, 'ci-version', 'web');
  if (select count(*) from public.customer_consents where booking_id = v_id) <> 1 then
    raise exception 'consent repair duplicated evidence';
  end if;

  -- Internal bookings still work without pretending the client accepted online.
  v_booking := public.create_booking(
    'peluqueria', v_start + interval '1 day', v_start + interval '1 day 30 minutes',
    30, 'fixed', 1000, null, 0, 0,
    '{"first_name":"CI Internal","phone_e164":"+5493429990006"}'::jsonb,
    '[]'::jsonb, p_source => 'manual');
  if v_booking->>'status' <> 'confirmed' or v_booking->>'source' <> 'manual'
     or exists (select 1 from public.customer_consents where booking_id = (v_booking->>'id')::uuid) then
    raise exception 'internal booking fabricated consent or changed status';
  end if;
end;
$$;
reset role;
rollback;
\echo 'OK: atomic online consent, rollback, permissions and internal compatibility'
