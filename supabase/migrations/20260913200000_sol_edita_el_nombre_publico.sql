-- Sol edita el nombre publico sin que nadie despliegue nada
--
-- La migracion anterior separo el nombre que ve la clienta del que usa
-- Sol, pero lo dejo como dato que solo se cambia con un archivo nuevo.
-- Eso contradice la regla del proyecto: si es un dato del salon, Sol lo
-- edita desde el panel.
--
-- `p_public_name` sigue la convencion que ya usa `p_description` en esta
-- misma funcion: nulo significa "no lo toques", y vacio significa
-- "borralo" —y al borrarlo, la clienta vuelve a ver el nombre interno.
-- No es lo mismo no decir nada que decir nada, y la diferencia importa:
-- sin ella, Sol podria poner un nombre publico y no podria sacarlo.
--
-- No hay lista de palabras prohibidas acá. La invariante que impide que
-- la tecnica llegue a la web cuida lo que el repositorio publica; lo que
-- Sol escriba en su catalogo es decision suya, y frenarla con un
-- diccionario seria tratarla como si no supiera de que trabaja.

create or replace function public.update_service(
  p_slug        text,
  p_name        text default null,
  p_description text default null,
  p_category    text default null,
  p_kind        text default null,
  p_is_public   boolean default null,
  p_is_active   boolean default null,
  p_actor       text default null,
  p_public_name text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_cat uuid;
begin
  select id into v_id from public.services where slug = p_slug and deleted_at is null;
  if v_id is null then raise exception 'No existe el servicio %', p_slug; end if;

  if p_kind is not null and p_kind not in ('servicio', 'color', 'tratamiento') then
    raise exception 'La clase es servicio, color o tratamiento; llegó "%"', p_kind;
  end if;
  if p_category is not null then
    select id into v_cat from public.categories where slug = p_category;
    if v_cat is null then raise exception 'No existe la categoría %', p_category; end if;
  end if;

  update public.services set
    name        = coalesce(nullif(btrim(p_name), ''), name),
    public_name = case when p_public_name is null then public_name
                       else nullif(btrim(p_public_name), '') end,
    description = case when p_description is null then description
                       else nullif(btrim(p_description), '') end,
    category_id = coalesce(v_cat, category_id),
    kind        = coalesce(p_kind, kind),
    is_public   = coalesce(p_is_public, is_public),
    is_active   = coalesce(p_is_active, is_active)
  where id = v_id;

  insert into public.audit_log (action, entity_type, entity_id, actor_label, detail)
  values ('service.updated', 'service', v_id, p_actor,
          jsonb_strip_nulls(jsonb_build_object(
            'slug', p_slug, 'name', p_name, 'kind', p_kind,
            'public_name', p_public_name,
            'category', p_category, 'is_public', p_is_public, 'is_active', p_is_active)));
end $$;

revoke all on function public.update_service(text, text, text, text, text, boolean, boolean, text, text)
  from public, anon, authenticated;
grant execute on function public.update_service(text, text, text, text, text, boolean, boolean, text, text)
  to service_role;

-- La firma vieja queda muerta: si sobrevive, PostgREST puede resolver la
-- llamada contra ella y el nombre publico se perderia en silencio.
drop function if exists public.update_service(text, text, text, text, text, boolean, boolean, text);

do $$
declare n integer;
begin
  select count(*) into n from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname = 'update_service';
  if n <> 1 then
    raise exception 'quedaron % versiones de update_service, tiene que haber una', n;
  end if;

  raise notice 'SOL EDITA EL NOMBRE PUBLICO: pasa';
end $$;
