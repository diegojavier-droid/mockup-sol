-- =====================================================================
-- Sol Mai · Consentimiento para el tratamiento de datos personales
--
-- La web pide nombre, WhatsApp y email, y en peluquería, maquillaje y
-- depilación pregunta por ALERGIAS. Eso último es un dato de salud, y en
-- la Ley 25.326 los datos de salud son datos sensibles: el consentimiento
-- tiene que ser libre, expreso e informado, y tiene que poder probarse.
--
-- Hoy no se prueba nada: la clienta carga sus datos y no acepta nada. Un
-- consentimiento que no quedó registrado, a los efectos de defenderse,
-- es lo mismo que no haberlo pedido.
--
-- POR QUÉ UNA TABLA Y NO UNA COLUMNA EN `customers`
--
-- El consentimiento no es un atributo de la persona: es un HECHO con
-- fecha, versión y canal. Si mañana cambia la política, hace falta saber
-- qué texto aceptó cada clienta y cuándo, no sólo que alguna vez aceptó
-- algo. Una columna booleana se sobrescribe y pierde justamente la
-- prueba que se quería conservar.
--
-- LO QUE DELIBERADAMENTE NO SE GUARDA
--
-- La dirección IP. Es la forma habitual de "reforzar la prueba", y es
-- recolectar un dato personal más para cubrirse de haber recolectado
-- datos personales. La minimización es un principio de la propia ley, y
-- para un salón de barrio la versión, la fecha y el turno alcanzan.
-- =====================================================================

create table if not exists public.customer_consents (
  id          bigint generated always as identity primary key,
  customer_id uuid not null references public.customers(id) on delete cascade,
  booking_id  uuid references public.bookings(id) on delete set null,
  document    text not null check (document in ('terminos_y_privacidad')),
  version     text not null check (length(btrim(version)) > 0),
  channel     text not null check (channel in ('web','mostrador','telefono','whatsapp')),
  accepted_at timestamptz not null default now()
);

comment on table public.customer_consents is
  'Cada aceptación de los términos y la política de privacidad, con la versión del texto que se aceptó. Es la prueba del consentimiento del art. 5 de la Ley 25.326: se conserva el hecho, no un booleano que se pisa.';
comment on column public.customer_consents.version is
  'Versión del texto aceptado. Si cambia la política, las aceptaciones viejas siguen diciendo a qué texto se referían.';
comment on column public.customer_consents.channel is
  'Por dónde entró. Un turno tomado por teléfono no tiene el mismo respaldo que uno de la web, y esconderlo sería falsear la prueba.';

-- Una clienta no acepta dos veces la misma versión en el mismo turno.
-- Sin esto, un reintento de red duplica la fila y ensucia la evidencia.
create unique index if not exists customer_consents_unicos
  on public.customer_consents (customer_id, document, version, coalesce(booking_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index if not exists customer_consents_customer_idx
  on public.customer_consents (customer_id, accepted_at desc);

revoke all on public.customer_consents from anon, authenticated;
grant all on public.customer_consents to service_role;

alter table public.customer_consents enable row level security;

-- =====================================================================
-- Registrar el consentimiento de un turno.
--
-- Toma el customer_id del propio turno en vez de recibirlo: el que crea
-- el turno no lo conoce, y pedírselo abriría la puerta a registrar un
-- consentimiento a nombre de otra persona.
--
-- Idempotente a propósito: la API la llama después de crear el turno, y
-- un reintento no puede convertirse en dos pruebas distintas del mismo
-- hecho.
-- =====================================================================
create or replace function public.record_booking_consent(
  p_booking_id uuid,
  p_version    text,
  p_channel    text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid;
  v_id          bigint;
begin
  select customer_id into v_customer_id
    from public.bookings where id = p_booking_id;

  if v_customer_id is null then
    raise exception 'booking_not_found' using errcode = 'P0002';
  end if;

  insert into public.customer_consents
    (customer_id, booking_id, document, version, channel)
  values
    (v_customer_id, p_booking_id, 'terminos_y_privacidad', p_version, p_channel)
  on conflict do nothing
  returning id into v_id;

  return jsonb_build_object(
    'recorded', v_id is not null,
    'customer_id', v_customer_id
  );
end;
$$;

revoke all on function public.record_booking_consent(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.record_booking_consent(uuid, text, text)
  to service_role;
