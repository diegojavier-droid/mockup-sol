-- =====================================================================
-- Sol Mai · Pruebas de «roles por módulo»
--
-- Este bloque reemplaza un `if` binario por una matriz de permisos. Si
-- se equivoca en un sentido, la persona de mostrador ve la plata; si se
-- equivoca en el otro, Sol se queda afuera de su propio sistema. Por eso
-- casi todo lo que sigue son pruebas negativas: no alcanza con ver que
-- un permiso funciona, hay que ver que el que NO se dio no funciona.
--
--   su postgres -c "psql -v ON_ERROR_STOP=1 -d solmai_local \
--     -f scripts/sql-tests/roles-por-modulo.sql"
--
-- Corre entero adentro de una transacción y termina con rollback: no
-- deja nada en la base.
-- =====================================================================
\set ON_ERROR_STOP on
\pset pager off

begin;

create temp table resultado (
  n       integer generated always as identity,
  nombre  text,
  ok      boolean,
  detalle text
);

create function pg_temp.chequear(p_nombre text, p_ok boolean, p_detalle text default null)
returns void language plpgsql as $$
begin
  insert into resultado (nombre, ok, detalle) values (p_nombre, coalesce(p_ok, false), p_detalle);
end;
$$;

-- Ejecuta SQL que DEBE fallar con un error puntual. Que falle no alcanza:
-- si falla con otro mensaje, el guard que se está probando no es el que
-- saltó y la prueba estaría dando un falso verde.
create function pg_temp.debe_fallar(p_nombre text, p_sql text, p_error text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
    insert into resultado (nombre, ok, detalle) values (p_nombre, false, 'no falló: se esperaba ' || p_error);
  exception when others then
    insert into resultado (nombre, ok, detalle)
    values (p_nombre, sqlerrm = p_error, 'esperado=' || p_error || ' obtenido=' || sqlerrm);
  end;
end;
$$;

-- Ejecuta SQL que NO debe fallar. Sirve para probar los caminos felices
-- que hoy están rotos por la migración.
create function pg_temp.debe_andar(p_nombre text, p_sql text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
    insert into resultado (nombre, ok, detalle) values (p_nombre, true, null);
  exception when others then
    insert into resultado (nombre, ok, detalle) values (p_nombre, false, 'falló con: ' || sqlerrm);
  end;
end;
$$;

-- ---------------------------------------------------------------------
-- Actores
-- ---------------------------------------------------------------------
insert into public.staff_members (id, slug, display_name, email, role, is_active) values
  ('11111111-1111-1111-1111-111111111111','sol','Sol','sol@solmai.test','owner',true),
  ('22222222-2222-2222-2222-222222222222','ana','Ana','ana@solmai.test','mostrador',true),
  ('33333333-3333-3333-3333-333333333333','vieja','Ex empleada','ex@solmai.test','mostrador',false),
  ('44444444-4444-4444-4444-444444444444','borrada','Borrada','borrada@solmai.test','mostrador',true);
update public.staff_members set deleted_at = now() where id = '44444444-4444-4444-4444-444444444444';

-- =====================================================================
-- A · La migración no le cambió el acceso a nadie
-- =====================================================================
select pg_temp.chequear(
  'A1 · la administradora tiene los 9 módulos en full',
  (select count(*) = 9 from public.role_permissions where role_slug='owner' and level='full'));

select pg_temp.chequear(
  'A2 · mostrador tiene full sólo en calendario y clientas',
  (select array_agg(module order by module) = array['calendario','clientas']
     from public.role_permissions where role_slug='mostrador' and level<>'none'));

select pg_temp.chequear(
  'A3 · mostrador tiene none en los otros 7 módulos',
  (select count(*) = 7 from public.role_permissions where role_slug='mostrador' and level='none'));

select pg_temp.chequear(
  'A4 · no quedó nadie con el rol viejo `staff`',
  (select count(*) = 0 from public.staff_members where role='staff'));

select pg_temp.chequear(
  'A5 · todo rol asignado existe en `roles` (la FK está puesta)',
  (select count(*) = 0 from public.staff_members s
     where not exists (select 1 from public.roles r where r.slug = s.role)));

-- =====================================================================
-- B · can() — lo que se dio y, sobre todo, lo que no
-- =====================================================================
select pg_temp.chequear('B1 · Sol puede entrar a finanzas',
  public.can('11111111-1111-1111-1111-111111111111','finanzas','full'));

select pg_temp.chequear('B2 · Ana puede entrar a calendario',
  public.can('22222222-2222-2222-2222-222222222222','calendario','full'));

select pg_temp.chequear('B3 · Ana NO ve finanzas ni para mirar',
  not public.can('22222222-2222-2222-2222-222222222222','finanzas','view'));

select pg_temp.chequear('B4 · Ana NO puede escribir en finanzas',
  not public.can('22222222-2222-2222-2222-222222222222','finanzas','full'));

select pg_temp.chequear('B5 · Ana NO puede administrar usuarios',
  not public.can('22222222-2222-2222-2222-222222222222','usuarios','full'));

select pg_temp.chequear('B6 · una persona desactivada no puede nada',
  not public.can('33333333-3333-3333-3333-333333333333','calendario','view'));

select pg_temp.chequear('B7 · una persona borrada no puede nada',
  not public.can('44444444-4444-4444-4444-444444444444','calendario','view'));

select pg_temp.chequear('B8 · un id que no existe no puede nada',
  not public.can('99999999-9999-9999-9999-999999999999','calendario','view'));

select pg_temp.chequear('B9 · sin id no se puede nada',
  not public.can(null,'calendario','view'));

select pg_temp.chequear('B10 · un módulo inventado no habilita nada',
  not public.can('22222222-2222-2222-2222-222222222222','contabilidad-secreta','view'));

-- `view` tiene que alcanzar para mirar y NO para escribir. Es la
-- distinción que hace que el nivel intermedio sirva de algo.
insert into public.roles (slug, name) values ('mirona','Mirona');
insert into public.role_permissions (role_slug, module, level)
select 'mirona', m, case when m='finanzas' then 'view' else 'none' end
  from unnest(array['calendario','clientas','finanzas','inventario','servicios',
                    'personal','compras','usuarios','configuracion']) m;
insert into public.staff_members (id, slug, display_name, email, role, is_active)
values ('55555555-5555-5555-5555-555555555555','mirona','Mirona','mirona@solmai.test','mirona',true);

select pg_temp.chequear('B11 · con `view` puede mirar finanzas',
  public.can('55555555-5555-5555-5555-555555555555','finanzas','view'));

select pg_temp.chequear('B12 · con `view` NO puede escribir en finanzas',
  not public.can('55555555-5555-5555-5555-555555555555','finanzas','full'));

-- =====================================================================
-- C · resolve_staff_session
-- =====================================================================
select pg_temp.chequear('C1 · devuelve los 9 módulos de la administradora',
  (select count(*) = 9 from jsonb_object_keys(
     (select permisos from public.resolve_staff_session('sol@solmai.test'))) k));

select pg_temp.chequear('C2 · el mail no distingue mayúsculas ni espacios',
  (select staff_id = '11111111-1111-1111-1111-111111111111'
     from public.resolve_staff_session('  SOL@SolMai.TEST  ')));

select pg_temp.chequear('C3 · devuelve el nombre del rol, no sólo el slug',
  (select role_name = 'Administradora' from public.resolve_staff_session('sol@solmai.test')));

select pg_temp.chequear('C4 · una persona desactivada no resuelve sesión',
  (select count(*) = 0 from public.resolve_staff_session('ex@solmai.test')));

select pg_temp.chequear('C5 · una persona borrada no resuelve sesión',
  (select count(*) = 0 from public.resolve_staff_session('borrada@solmai.test')));

select pg_temp.chequear('C6 · un mail desconocido no resuelve sesión',
  (select count(*) = 0 from public.resolve_staff_session('cualquiera@ejemplo.com')));

select pg_temp.chequear('C7 · los permisos que devuelve son los del rol',
  (select permisos->>'finanzas' = 'none' and permisos->>'calendario' = 'full'
     from public.resolve_staff_session('ana@solmai.test')));

-- =====================================================================
-- D · set_role_permission — los guards
-- =====================================================================
select pg_temp.debe_fallar('D1 · Ana no puede cambiar permisos',
  $$select public.set_role_permission('mirona','finanzas','full','22222222-2222-2222-2222-222222222222')$$,
  'sin_permiso_usuarios');

select pg_temp.debe_fallar('D2 · sin actor no se cambian permisos',
  $$select public.set_role_permission('mirona','finanzas','full',null)$$,
  'sin_permiso_usuarios');

select pg_temp.debe_fallar('D3 · una persona desactivada no puede cambiar permisos',
  $$select public.set_role_permission('mirona','finanzas','full','33333333-3333-3333-3333-333333333333')$$,
  'sin_permiso_usuarios');

select pg_temp.debe_fallar('D4 · un nivel inventado se rechaza',
  $$select public.set_role_permission('mirona','finanzas','dios','11111111-1111-1111-1111-111111111111')$$,
  'nivel_invalido');

select pg_temp.debe_fallar('D5 · un rol que no existe se rechaza',
  $$select public.set_role_permission('fantasma','finanzas','full','11111111-1111-1111-1111-111111111111')$$,
  'rol_no_encontrado');

select pg_temp.debe_fallar('D6 · a la administradora no se le puede recortar un módulo',
  $$select public.set_role_permission('owner','finanzas','none','11111111-1111-1111-1111-111111111111')$$,
  'rol_del_sistema');

select pg_temp.debe_fallar('D7 · un módulo que no existe se rechaza',
  $$select public.set_role_permission('mirona','contabilidad-secreta','full','11111111-1111-1111-1111-111111111111')$$,
  'modulo_no_encontrado');

select pg_temp.chequear('D8 · poner el nivel que ya tenía no cuenta como cambio',
  (public.set_role_permission('mirona','finanzas','view','11111111-1111-1111-1111-111111111111')->>'sin_cambios')::boolean);

-- La llamada va en su propia sentencia a propósito: adentro de un WHERE,
-- el UPDATE que hace la función no lo ve el snapshot de esa misma
-- consulta y la prueba daría verde sin probar nada.
create temp table cambio_d9 as
  select public.set_role_permission('mirona','finanzas','full','11111111-1111-1111-1111-111111111111') as r;

select pg_temp.chequear('D9 · un cambio real queda aplicado',
  (select level = 'full' from public.role_permissions where role_slug='mirona' and module='finanzas')
  and (select (r->>'sin_cambios')::boolean = false from cambio_d9));

select pg_temp.chequear('D10 · un cambio real queda en el registro con el nivel anterior',
  (select detail->>'nivel_anterior' = 'view' and detail->>'nivel_nuevo' = 'full'
     from public.audit_log where action='role_permission_changed'
    order by id desc limit 1));

select pg_temp.chequear('D11 · quedarse sin cambios no ensucia el registro',
  (select count(*) = 1 from public.audit_log where action='role_permission_changed'));

-- =====================================================================
-- E · create_role
-- =====================================================================
-- Igual que en D9: primero se crea, después se mira. Y se guarda el slug
-- que devolvió la función en vez de adivinarlo — adivinarlo hizo que una
-- prueba de borrado diera verde sin llegar a borrar nada.
create temp table rol_nuevo as
  select public.create_role('Recepción','11111111-1111-1111-1111-111111111111')->>'slug' as slug;

select pg_temp.chequear('E1 · un rol nuevo nace sin ver nada',
  (select count(*) = 9 from public.role_permissions rp
     join rol_nuevo n on n.slug = rp.role_slug
    where rp.level = 'none'));

select pg_temp.chequear('E2 · el slug sale del nombre',
  (select slug = 'recepci-n' from rol_nuevo));

select pg_temp.debe_fallar('E3 · Ana no puede crear roles',
  $$select public.create_role('Trucho','22222222-2222-2222-2222-222222222222')$$,
  'sin_permiso_usuarios');

select pg_temp.debe_fallar('E4 · un rol sin nombre se rechaza',
  $$select public.create_role('   ','11111111-1111-1111-1111-111111111111')$$,
  'nombre_requerido');

select pg_temp.chequear('E5 · dos roles con el mismo nombre no chocan',
  (select public.create_role('Mirona','11111111-1111-1111-1111-111111111111')->>'slug' <> 'mirona'));

select pg_temp.chequear('E6 · crear un rol queda en el registro',
  (select count(*) >= 1 from public.audit_log where action='role_created'));

-- =====================================================================
-- F · delete_role
-- =====================================================================
select pg_temp.debe_fallar('F1 · la administradora no se puede borrar',
  $$select public.delete_role('owner','11111111-1111-1111-1111-111111111111')$$,
  'rol_del_sistema');

select pg_temp.debe_fallar('F2 · un rol con gente adentro no se borra',
  $$select public.delete_role('mirona','11111111-1111-1111-1111-111111111111')$$,
  'rol_en_uso');

select pg_temp.debe_fallar('F3 · Ana no puede borrar roles',
  $$select public.delete_role((select slug from rol_nuevo),'22222222-2222-2222-2222-222222222222')$$,
  'sin_permiso_usuarios');

select pg_temp.debe_fallar('F4 · un rol que no existe no se borra',
  $$select public.delete_role('fantasma','11111111-1111-1111-1111-111111111111')$$,
  'rol_no_encontrado');

create temp table borrado_f5 as
  select public.delete_role((select slug from rol_nuevo),'11111111-1111-1111-1111-111111111111') as r;

select pg_temp.chequear('F5 · borrar un rol vacío lo saca de la tabla',
  (select (r->>'borrado')::boolean from borrado_f5)
  and (select count(*) = 0 from public.roles r2 join rol_nuevo n on n.slug = r2.slug));

select pg_temp.chequear('F6 · borrar un rol se lleva sus permisos',
  (select count(*) = 0 from public.role_permissions rp join rol_nuevo n on n.slug = rp.role_slug));

-- La gente que se fue conserva su rol: es parte de su historial. Si el
-- guard sólo mirara a la gente activa, el borrado pasaría el control y
-- después lo frenaría la clave foránea con un error crudo que la
-- pantalla no sabe traducir.
insert into public.roles (slug, name) values ('solo-ex','Sólo ex empleadas');
insert into public.role_permissions (role_slug, module, level)
select 'solo-ex', m, 'none'
  from unnest(array['calendario','clientas','finanzas','inventario','servicios',
                    'personal','compras','usuarios','configuracion']) m;
update public.staff_members set role = 'solo-ex'
 where id = '44444444-4444-4444-4444-444444444444';

select pg_temp.debe_fallar('F7 · un rol que usa alguien que ya se fue tampoco se borra',
  $$select public.delete_role('solo-ex','11111111-1111-1111-1111-111111111111')$$,
  'rol_en_uso');

-- =====================================================================
-- G · Lo que la migración le hizo a las funciones que ya existían
--
-- `staff_members.role` tenía default 'staff' y dos funciones validaban
-- contra la lista fija ('owner','staff'). Con la FK nueva, ese slug ya
-- no existe. Estas pruebas están para que ese daño no pase inadvertido.
-- =====================================================================
select pg_temp.debe_andar('G1 · se puede dar de alta una persona sin repetir el rol',
  $$insert into public.staff_members (slug, display_name) values ('sin-rol','Sin rol')$$);

select pg_temp.debe_andar('G2 · se puede invitar a alguien como mostrador',
  $$select public.invite_staff_member('nueva@solmai.test','Nueva','mostrador','11111111-1111-1111-1111-111111111111')$$);

select pg_temp.debe_andar('G3 · se puede invitar a alguien con un rol nuevo',
  $$select public.invite_staff_member('otra@solmai.test','Otra','mirona','11111111-1111-1111-1111-111111111111')$$);

select pg_temp.debe_andar('G4 · se le puede cambiar el rol a alguien',
  $$select public.set_staff_role('22222222-2222-2222-2222-222222222222','mirona','11111111-1111-1111-1111-111111111111')$$);

select pg_temp.debe_fallar('G5 · un rol inventado se sigue rechazando al invitar',
  $$select public.invite_staff_member('trucha@solmai.test','Trucha','rol-que-no-existe','11111111-1111-1111-1111-111111111111')$$,
  'rol_invalido');

select pg_temp.debe_fallar('G6 · un rol inventado se sigue rechazando al cambiar',
  $$select public.set_staff_role('22222222-2222-2222-2222-222222222222','rol-que-no-existe','11111111-1111-1111-1111-111111111111')$$,
  'rol_invalido');

-- =====================================================================
-- Resultado
-- =====================================================================
\echo ''
select lpad(n::text,2,' ') || '  ' || case when ok then 'PASS' else 'FALLA' end || '  ' || nombre
       || coalesce('  →  ' || nullif(case when ok then '' else detalle end,''), '') as "roles por módulo"
  from resultado order by n;

\echo ''
select count(*) filter (where ok) || ' de ' || count(*) || ' pruebas en verde' as total from resultado;

do $$
declare v_fallan integer;
begin
  select count(*) into v_fallan from resultado where not ok;
  if v_fallan > 0 then
    raise exception '% pruebas en rojo', v_fallan;
  end if;
end $$;

rollback;
