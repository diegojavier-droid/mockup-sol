-- =====================================================================
-- Sol Mai · `refund_due` no puede contradecir a `deposit_status` (G-09)
--
-- `refund_due` respondía una sola pregunta —¿corresponde devolver?— y
-- por eso se agregó `deposit_status`, que distingue "nunca pagó" de
-- "pagó y se le retuvo". Las dos columnas quedaron conviviendo: hoy se
-- escriben juntas en los tres caminos que tocan plata, pero nada lo
-- garantiza. Alcanza con que un cambio futuro escriba una y olvide la
-- otra para que el sistema afirme dos cosas distintas sobre la misma
-- seña, y el mensaje que ve la clienta sale de `refund_due` mientras el
-- reporting sale de `deposit_status`.
--
-- POR QUÉ UNA RESTRICCIÓN Y NO UNA COLUMNA GENERADA
--
-- Derivar `refund_due` de `deposit_status` sería más elegante, pero
-- obliga a sacar la escritura de tres funciones que manejan dinero
-- —`cancel_booking`, `mark_no_show` y `set_booking_status`— para un
-- problema que hoy no está ocurriendo. La restricción da la misma
-- garantía sin tocar ningún camino de escritura: si alguna vez se
-- desincronizan, la transacción falla en el momento, no seis meses
-- después en un reporte que nadie entiende.
--
-- `null` sigue permitido: significa "no se decidió", que es distinto de
-- "no corresponde devolver". Ésa es exactamente la distinción que
-- justificó `deposit_status`, y borrarla acá sería reintroducir el
-- problema original.
-- =====================================================================

-- Reparación previa: si una base ya venía con las dos columnas
-- contradiciéndose, gana `deposit_status`. Es el modelo más rico y el
-- que alimenta el reporting; `refund_due` es la pregunta vieja.
-- Verificado sobre una base reconstruida desde las migraciones y
-- ejercitada con las seis pruebas de plata: cero filas a reparar.
do $$
declare v_n integer;
begin
  select count(*) into v_n from public.bookings
   where refund_due is not null and refund_due <> (deposit_status = 'refunded');

  if v_n > 0 then
    update public.bookings
       set refund_due = (deposit_status = 'refunded')
     where refund_due is not null and refund_due <> (deposit_status = 'refunded');
    raise notice '% fila(s) tenían refund_due contradiciendo deposit_status; se alinearon con deposit_status', v_n;
  end if;
end $$;

alter table public.bookings drop constraint if exists bookings_refund_due_coherent;
alter table public.bookings
  add constraint bookings_refund_due_coherent
  check (refund_due is null or refund_due = (deposit_status = 'refunded'));

comment on column public.bookings.refund_due is
  'Si corresponde devolver la seña. NULL = todavía no se decidió, que es distinto de "no corresponde". No puede contradecir a deposit_status: lo garantiza bookings_refund_due_coherent. La fuente de verdad del estado de la seña es deposit_status.';
