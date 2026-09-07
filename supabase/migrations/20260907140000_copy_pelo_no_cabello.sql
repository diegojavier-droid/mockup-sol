-- =====================================================================
-- Sol Mai · «pelo», no «cabello»
--
-- El catálogo mezclaba las dos palabras: la portada decía «cuidar tu
-- pelo» y dos renglones más abajo un servicio decía «para cabellos
-- castigados». La clienta de un salón de barrio en Santa Fe dice pelo;
-- «cabello» suena a folleto de shampoo.
--
-- El bootstrap del catálogo ya quedó corregido y una base reconstruida
-- desde cero nace bien. Esta migración es para las bases que ya existen,
-- donde el bootstrap no se vuelve a correr.
--
-- Se actualiza por `slug`, que es la identidad estable de cada fila, y
-- sólo si el texto sigue siendo el viejo: si alguien ya lo editó a mano
-- desde el panel, esa decisión gana. Corregir una palabra no justifica
-- pisar lo que decidió una persona.
-- =====================================================================

update public.services
   set description = 'Plan intensivo para el pelo muy castigado.'
 where slug = 'reconstruccion'
   and description = 'Plan intensivo para cabellos castigados.';

update public.personalization_fields f
   set label = 'Largo del pelo'
  from public.categories c
 where c.id = f.category_id
   and c.slug = 'peluqueria'
   and f.slug = 'largo'
   and f.label = 'Largo del cabello';

update public.personalization_fields f
   set label = 'Tipo de pelo'
  from public.categories c
 where c.id = f.category_id
   and c.slug = 'peluqueria'
   and f.slug = 'tipo'
   and f.label = 'Tipo de cabello';

-- Guard: que no quede ningún «cabello» suelto en lo que lee la clienta.
-- Si mañana entra un servicio nuevo con esa palabra, que falle acá y no
-- que aparezca en la web.
do $$
declare v_n integer;
begin
  select count(*) into v_n
    from (
      select 1 from public.services
       where deleted_at is null
         and (name ilike '%cabello%' or coalesce(description, '') ilike '%cabello%')
      union all
      select 1 from public.personalization_fields
       where deleted_at is null and label ilike '%cabello%'
      union all
      select 1 from public.personalization_options
       where label ilike '%cabello%'
    ) q;

  if v_n > 0 then
    raise exception 'quedaron % texto(s) del catálogo diciendo «cabello»; en Sol Mai se dice «pelo»', v_n;
  end if;
end $$;
