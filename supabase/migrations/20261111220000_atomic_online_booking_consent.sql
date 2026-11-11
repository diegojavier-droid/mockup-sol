-- La API web creaba el turno y luego registraba el consentimiento en otra
-- llamada. Una falla en la segunda dejaba datos de salud sin su evidencia.
-- Esta RPC compone los dos motores existentes en UNA transacción: conserva
-- capacidad, locks, snapshots, seña y reglas de clientes de create_booking.
-- Los canales internos siguen usando create_booking sin inventar aceptación.

create or replace function public.create_online_booking(
  p_area_slug           text,
  p_starts_at           timestamptz,
  p_ends_at             timestamptz,
  p_shown_duration_min  integer,
  p_price_display_mode  text,
  p_price_estimated_min integer,
  p_price_estimated_max integer,
  p_deposit_rate        numeric,
  p_deposit_amount      integer,
  p_customer           jsonb,
  p_items              jsonb,
  p_terms_version      text,
  p_customer_note      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking jsonb;
begin
  -- La versión vigente la valida la API. Acá se exige evidencia explícita
  -- y bien formada, sin introducir una segunda constante de versión.
  if p_terms_version is null
     or length(btrim(p_terms_version)) = 0
     or length(p_terms_version) > 32 then
    raise exception 'booking_consent_required' using errcode = '22023';
  end if;

  v_booking := public.create_booking(
    p_area_slug => p_area_slug,
    p_starts_at => p_starts_at,
    p_ends_at => p_ends_at,
    p_shown_duration_min => p_shown_duration_min,
    p_price_display_mode => p_price_display_mode,
    p_price_estimated_min => p_price_estimated_min,
    p_price_estimated_max => p_price_estimated_max,
    p_deposit_rate => p_deposit_rate,
    p_deposit_amount => p_deposit_amount,
    p_customer => p_customer,
    p_items => p_items,
    p_customer_note => p_customer_note,
    p_source => 'online',
    p_created_by => null,
    p_actor_label => null,
    p_override => false,
    p_override_reason => null
  );

  perform public.record_booking_consent((v_booking->>'id')::uuid, p_terms_version, 'web');

  -- También falla cerrado si un trigger suprimiera la inserción sin error.
  if not exists (
    select 1 from public.customer_consents c
    join public.bookings b on b.id = c.booking_id and b.customer_id = c.customer_id
    where b.id = (v_booking->>'id')::uuid
      and c.document = 'terminos_y_privacidad'
      and c.version = p_terms_version
      and c.channel = 'web'
  ) then
    raise exception 'booking_consent_not_recorded';
  end if;

  -- No se captura la excepción: PostgreSQL revierte también el turno,
  -- sus items y cualquier inserción/actualización de la ficha de clienta.
  return v_booking;
end;
$$;

revoke all on function public.create_online_booking(
  text, timestamptz, timestamptz, integer, text, integer, integer,
  numeric, integer, jsonb, jsonb, text, text
) from public, anon, authenticated;
grant execute on function public.create_online_booking(
  text, timestamptz, timestamptz, integer, text, integer, integer,
  numeric, integer, jsonb, jsonb, text, text
) to service_role;
