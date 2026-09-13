-- La web muestra el catalogo de Sol, no el que invente yo
--
-- El catalogo publico nacio de supuestos: se buscaron los servicios mas
-- comunes de peluqueria para tener un prototipo que mostrarle a Sol antes
-- de saber que ofrece de verdad. Despues llego su planilla, y desde
-- entonces conviven los dos: "Mechas" a $42.000 —un servicio generico que
-- no existe en su lista— al lado de las siete lineas reales de mechones,
-- y "Retoque de raiz" a $22.000 al lado de las cuatro de coloracion.
--
-- Una clienta que entra hoy ve dos catalogos mezclados y no tiene como
-- saber cual es cual. Esto deja uno solo.
--
-- LA REGLA, Y POR QUE ES UNA REGLA Y NO UNA LISTA
--
-- Se publica lo que salio de la planilla de Sol —`source = 'sol_pricelist'`,
-- que es el dato que el sistema ya guarda— y se retira lo que salio de un
-- promedio de industria. No hay lista de nombres escrita a mano: el
-- criterio es verificable y sigue siendo cierto si mañana cambia el
-- catalogo.
--
-- DOS AREAS QUEDAN COMO ESTAN, Y NO ES UN OLVIDO
--
-- Maquillaje y Depilacion no tienen NINGUNA linea real: la planilla de
-- Sol no las trae. Aplicar la regla al pie las borraria de la web, y el
-- salon las ofrece —el maquillaje lo maneja su socia—. Retirar un area
-- entera no es resolver una duplicacion: no hay nada que duplique. Se
-- quedan publicadas y marcadas como pendientes de la lista real.
--
-- DIECISEIS REALES SIGUEN SIN PUBLICAR
--
-- Los tratamientos de la planilla —Karseell, Plasma, Biotina, Riflessi,
-- Aka Moa y los demas— tienen precio y tiempo pero no descripcion, y son
-- nombres de producto: escribir que hace cada uno seria inventarlo. Se
-- publican cuando Sol diga que es cada cosa.

-- 1. Entra lo de Sol ------------------------------------------------------
--
-- Sin descripcion no se publica: un nombre y un precio no alcanzan para
-- decidir una seña del 20%. Lavado y Trenzas son la excepcion acordada,
-- porque el nombre ya contesta.

update public.services s
   set is_public = true, updated_at = now()
 where not s.is_public
   and s.is_active and s.deleted_at is null
   and exists (select 1 from public.service_price_tiers t
                where t.service_id = s.id and t.source = 'sol_pricelist')
   and (coalesce(btrim(s.description), '') <> '' or s.slug in ('lavado', 'trenzas'));

-- 2. Sale lo inventado ----------------------------------------------------
--
-- Baja logica, no borrado: `is_public = false` los saca de la web y los
-- deja en el panel. Los turnos viejos que los nombran siguen enteros, y
-- Sol puede volver a publicar cualquiera con un clic.

update public.services s
   set is_public = false, updated_at = now()
  from public.categories c
 where c.id = s.category_id
   and c.slug in ('peluqueria', 'unas')
   and s.is_public
   and not exists (select 1 from public.service_price_tiers t
                    where t.service_id = s.id and t.source = 'sol_pricelist');

-- 3. Que el archivo se pruebe a si mismo ----------------------------------

do $$
declare
  n integer;
begin
  -- En peluqueria y uñas no puede quedar publicado nada inventado.
  select count(*) into n
    from public.services s
    join public.categories c on c.id = s.category_id
   where c.slug in ('peluqueria', 'unas')
     and s.is_public and s.is_active and s.deleted_at is null
     and not exists (select 1 from public.service_price_tiers t
                      where t.service_id = s.id and t.source = 'sol_pricelist');
  if n <> 0 then
    raise exception 'quedaron % servicios inventados publicados', n;
  end if;

  -- Y los de la planilla que tienen descripcion tienen que estar a la vista.
  select count(*) into n
    from public.services s
   where s.is_active and s.deleted_at is null and not s.is_public
     and exists (select 1 from public.service_price_tiers t
                  where t.service_id = s.id and t.source = 'sol_pricelist')
     and (coalesce(btrim(s.description), '') <> '' or s.slug in ('lavado', 'trenzas'));
  if n <> 0 then
    raise exception '% servicios de la planilla quedaron sin publicar', n;
  end if;

  -- Las dos areas sin lista real siguen en pie: borrarlas seria peor que
  -- dejarlas provisionales.
  select count(*) into n
    from public.services s
    join public.categories c on c.id = s.category_id
   where c.slug in ('maquillaje', 'depilacion')
     and s.is_public and s.is_active and s.deleted_at is null;
  if n < 1 then
    raise exception 'maquillaje y depilacion se quedaron sin nada publicado';
  end if;

  raise notice 'LA WEB MUESTRA EL CATALOGO REAL: pasa';
end $$;
