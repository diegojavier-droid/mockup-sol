-- =====================================================================
-- Sol Mai · Hasta dónde llega «Usuarios y roles»
--
-- Quien tiene el módulo completo administra a la gente del salón. Lo que
-- no puede es tocar administradoras. Sin ese corte, alguien con este
-- permiso podía nombrar administradora a un cómplice y después desactivar
-- a Sol: el trigger de «siempre una dueña» lo habría dejado pasar, porque
-- para entonces ya había otra.
--
--   su postgres -c "psql -v ON_ERROR_STOP=1 -d solmai_local \
--     -f scripts/sql-tests/usuarios-y-la-duena.sql"
-- =====================================================================
\set ON_ERROR_STOP on
\pset pager off

begin;

create temp table resultado (
  n integer generated always as identity, nombre text, ok boolean, detalle text
);

create function pg_temp.chequear(p_nombre text, p_ok boolean) returns void
language plpgsql as $$
begin insert into resultado (nombre, ok) values (p_nombre, coalesce(p_ok,false)); end; $$;

create function pg_temp.debe_fallar(p_nombre text, p_sql text, p_error text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
    insert into resultado (nombre, ok, detalle) values (p_nombre, false, 'no falló: se esperaba ' || p_error);
  exception when others then
    insert into resultado (nombre, ok, detalle)
    values (p_nombre, sqlerrm = p_error, 'esperado=' || p_error || ' obtenido=' || sqlerrm);
  end;
end; $$;

create function pg_temp.debe_andar(p_nombre text, p_sql text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
    insert into resultado (nombre, ok) values (p_nombre, true);
  exception when others then
    insert into resultado (nombre, ok, detalle) values (p_nombre, false, 'falló con: ' || sqlerrm);
  end;
end; $$;

-- Sol, una encargada con «Usuarios y roles» completo, y gente común.
insert into public.roles (slug, name) values ('encargada','Encargada');
insert into public.role_permissions (role_slug, module, level)
select 'encargada', m, case when m = 'usuarios' then 'full' else 'none' end
  from unnest(array['calendario','clientas','finanzas','inventario','servicios',
                    'personal','compras','usuarios','configuracion']) m;

insert into public.staff_members (id, slug, display_name, email, role, is_active) values
  ('11111111-1111-1111-1111-111111111111','sol','Sol','sol@solmai.test','owner',true),
  ('22222222-2222-2222-2222-222222222222','enca','Encargada','enca@solmai.test','encargada',true),
  ('33333333-3333-3333-3333-333333333333','ana','Ana','ana@solmai.test','mostrador',true),
  ('44444444-4444-4444-4444-444444444444','otra','Otra dueña','otra@solmai.test','owner',true);

-- ---------------------------------------------------------------------
-- Lo que la encargada SÍ puede: la gente del salón
-- ---------------------------------------------------------------------
select pg_temp.debe_andar('1 · la encargada puede sumar a alguien de mostrador',
  $$select public.invite_staff_member('nueva@solmai.test','Nueva','mostrador','22222222-2222-2222-2222-222222222222')$$);

select pg_temp.debe_andar('2 · la encargada puede sacarle el acceso a alguien de mostrador',
  $$select public.set_staff_active('33333333-3333-3333-3333-333333333333',false,'22222222-2222-2222-2222-222222222222')$$);

select pg_temp.debe_andar('3 · la encargada puede cambiarle el rol a alguien de mostrador',
  $$select public.set_staff_role('33333333-3333-3333-3333-333333333333','encargada','22222222-2222-2222-2222-222222222222')$$);

-- ---------------------------------------------------------------------
-- Lo que NO puede: fabricar o voltear administradoras
-- ---------------------------------------------------------------------
select pg_temp.debe_fallar('4 · no puede invitar a una administradora nueva',
  $$select public.invite_staff_member('complice@solmai.test','Cómplice','owner','22222222-2222-2222-2222-222222222222')$$,
  'solo_la_duena');

select pg_temp.debe_fallar('5 · no puede ascender a nadie a administradora',
  $$select public.set_staff_role('33333333-3333-3333-3333-333333333333','owner','22222222-2222-2222-2222-222222222222')$$,
  'solo_la_duena');

select pg_temp.debe_fallar('6 · no puede bajar de rango a una administradora',
  $$select public.set_staff_role('44444444-4444-4444-4444-444444444444','mostrador','22222222-2222-2222-2222-222222222222')$$,
  'solo_la_duena');

select pg_temp.debe_fallar('7 · no puede sacarle el acceso a Sol',
  $$select public.set_staff_active('11111111-1111-1111-1111-111111111111',false,'22222222-2222-2222-2222-222222222222')$$,
  'solo_la_duena');

-- ---------------------------------------------------------------------
-- Y quien no tiene el módulo, no puede nada
-- ---------------------------------------------------------------------
select pg_temp.debe_fallar('8 · quien atiende el mostrador no administra a nadie',
  $$select public.invite_staff_member('x@solmai.test','X','mostrador','33333333-3333-3333-3333-333333333333')$$,
  'sin_permiso_usuarios');

select pg_temp.debe_fallar('9 · sin actor no se administra a nadie',
  $$select public.set_staff_active('33333333-3333-3333-3333-333333333333',true,null)$$,
  'sin_permiso_usuarios');

-- ---------------------------------------------------------------------
-- Sol sigue pudiendo todo, y la invariante sigue en pie
-- ---------------------------------------------------------------------
select pg_temp.debe_andar('10 · Sol sí puede nombrar otra administradora',
  $$select public.invite_staff_member('tercera@solmai.test','Tercera','owner','11111111-1111-1111-1111-111111111111')$$);

select pg_temp.debe_andar('11 · Sol puede sacarle el acceso a otra administradora',
  $$select public.set_staff_active('44444444-4444-4444-4444-444444444444',false,'11111111-1111-1111-1111-111111111111')$$);

select pg_temp.debe_fallar('12 · nadie se saca el acceso a sí misma',
  $$select public.set_staff_active('11111111-1111-1111-1111-111111111111',false,'11111111-1111-1111-1111-111111111111')$$,
  'no_a_vos_misma');

-- El camino completo del ataque, de punta a punta: si el corte funciona,
-- la encargada no llega ni al primer paso.
select pg_temp.chequear('13 · Sol sigue siendo administradora activa',
  (select is_active and deleted_at is null and role = 'owner'
     from public.staff_members where id = '11111111-1111-1111-1111-111111111111'));

\echo ''
select lpad(n::text,2,' ') || '  ' || case when ok then 'PASS' else 'FALLA' end || '  ' || nombre
       || coalesce('  →  ' || nullif(case when ok then '' else detalle end,''), '') as "usuarios y la dueña"
  from resultado order by n;

\echo ''
select count(*) filter (where ok) || ' de ' || count(*) || ' pruebas en verde' as total from resultado;

do $$
declare v_fallan integer;
begin
  select count(*) into v_fallan from resultado where not ok;
  if v_fallan > 0 then raise exception '% pruebas en rojo', v_fallan; end if;
end $$;

rollback;
