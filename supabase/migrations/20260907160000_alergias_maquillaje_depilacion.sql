-- =====================================================================
-- Sol Mai · preguntar por alergias también en maquillaje y depilación
--
-- En el salón se pregunta por alergias antes de empezar. El sistema lo
-- preguntaba sólo en peluquería: maquillaje no lo preguntaba, y
-- depilación no preguntaba absolutamente nada.
--
-- Son las dos áreas donde más importa. El maquillaje va sobre la cara y
-- cerca de los ojos; la depilación es cera caliente sobre la piel. Que
-- el dato lo traiga la reserva y no una conversación apurada mientras la
-- clienta ya está sentada es exactamente la carga administrativa que el
-- sistema tiene que absorber.
--
-- Es la MISMA pregunta que ya existe en peluquería, con las mismas
-- opciones y el mismo `slug`. Una sola forma de preguntarlo en todo el
-- salón: si mañana hay que reportar sobre alergias, es una sola columna
-- y no tres preguntas parecidas que hay que reconciliar a mano.
--
-- Queda OPCIONAL (`is_required = false`), igual que en peluquería. Una
-- clienta que no quiere responder no se queda sin turno; el dato es útil
-- pero obligarlo convierte una cortesía en un peaje. Si Sol decide que
-- tiene que ser obligatorio, se cambia acá.
--
-- El bootstrap del catálogo ya quedó regenerado, así que una base nueva
-- nace con esto. Esta migración es para las bases que ya existen.
-- =====================================================================

do $$
declare
  v_category  record;
  v_field_id  uuid;
  v_sort      integer;
  v_opt       record;
begin
  for v_category in
    select id, slug from public.categories where slug in ('maquillaje', 'depilacion')
  loop
    -- Va al final de las preguntas del área: primero lo que la clienta
    -- viene a buscar, después lo que hace falta saber para atenderla.
    select coalesce(max(sort_order), -1) + 1 into v_sort
      from public.personalization_fields where category_id = v_category.id;

    insert into public.personalization_fields
      (category_id, slug, label, field_type, is_required, sort_order, is_public, is_active)
    values
      (v_category.id, 'alergias', 'Alergias', 'single_choice', false, v_sort, true, true)
    on conflict (category_id, slug) do update
      set label = excluded.label,
          field_type = excluded.field_type,
          is_public = excluded.is_public,
          is_active = excluded.is_active,
          deleted_at = null
    returning id into v_field_id;

    for v_opt in
      select * from (values
        ('no',            'No',              'No',              0),
        ('si-leves',      'Sí, leves',       'Sí, leves',       1),
        ('si-importantes','Sí, importantes', 'Sí, importantes', 2)
      ) as t(slug, label, value, sort_order)
    loop
      insert into public.personalization_options
        (field_id, slug, label, value, sort_order, is_active)
      values
        (v_field_id, v_opt.slug, v_opt.label, v_opt.value, v_opt.sort_order, true)
      on conflict (field_id, slug) do update
        set label = excluded.label,
            value = excluded.value,
            sort_order = excluded.sort_order,
            is_active = true;
    end loop;
  end loop;
end $$;

-- Guard: las tres áreas que tocan piel o pelo tienen que preguntarlo.
-- Si alguien desactiva el campo sin querer, que se entere acá y no
-- cuando una clienta tenga una reacción.
do $$
declare
  v_faltan text;
begin
  select string_agg(c.slug, ', ' order by c.slug) into v_faltan
    from public.categories c
   where c.slug in ('peluqueria', 'maquillaje', 'depilacion')
     and not exists (
       select 1 from public.personalization_fields f
        where f.category_id = c.id
          and f.slug = 'alergias'
          and f.is_active
          and f.is_public
          and f.deleted_at is null
     );

  if v_faltan is not null then
    raise exception 'estas áreas no preguntan por alergias: %', v_faltan;
  end if;
end $$;
