-- =====================================================================
-- Sol Mai · las reglas servicio↔campo que faltaban para «alergias»
--
-- La migración 20260907160000 creó el campo de alergias en maquillaje y
-- depilación con sus opciones, pero NO creó las filas de
-- `service_personalization_rules` que enlazan cada servicio del área con
-- ese campo. El bootstrap regenerado sí las crea, así que una base nueva
-- nacía con 9 filas que una base ya existente no tenía.
--
-- En la práctica hoy no cambia lo que ve la clienta: sin regla, el campo
-- se sirve con `decision = 'contextual'`, que es exactamente lo que la
-- regla dice. Pero la divergencia importa igual, y por dos razones:
--
--   1. El clean-room compara una base reconstruida desde cero contra los
--      conteos esperados. Una producción que no puede reproducirse desde
--      las migraciones es, justamente, lo que ese CI existe para
--      impedir. (De hecho falló ahí: esperaba 200 reglas y dio 209.)
--   2. Si mañana alguien cambia el `decision` de alergias para un
--      servicio puntual, en producción no habría fila que editar y el
--      cambio se perdería en silencio.
--
-- Se crean con `contextual`, que es el mismo valor que asigna el
-- bootstrap y el que ya se estaba sirviendo por omisión: esta migración
-- no cambia ningún comportamiento, sólo hace explícito lo implícito.
-- =====================================================================

insert into public.service_personalization_rules (service_id, field_id, decision)
select s.id, f.id, 'contextual'
  from public.services s
  join public.categories c on c.id = s.category_id
  join public.personalization_fields f
    on f.category_id = c.id and f.slug = 'alergias'
 where c.slug in ('maquillaje', 'depilacion')
   and s.deleted_at is null
   and f.deleted_at is null
on conflict (service_id, field_id) do nothing;

-- Guard: todo servicio activo de las tres áreas que preguntan por
-- alergias tiene que tener su regla. Si falta una, la base dejó de ser
-- reproducible desde las migraciones y hay que enterarse acá.
do $$
declare v_faltan integer;
begin
  select count(*) into v_faltan
    from public.services s
    join public.categories c on c.id = s.category_id
    join public.personalization_fields f
      on f.category_id = c.id and f.slug = 'alergias' and f.is_active
   where c.slug in ('peluqueria', 'maquillaje', 'depilacion')
     and s.is_active
     and s.deleted_at is null
     and not exists (
       select 1 from public.service_personalization_rules r
        where r.service_id = s.id and r.field_id = f.id
     );

  if v_faltan > 0 then
    raise exception '% servicio(s) sin regla para el campo de alergias', v_faltan;
  end if;
end $$;
