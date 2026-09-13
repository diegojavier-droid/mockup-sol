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
-- Se retira lo que salio de un promedio de industria —`industry_baseline`—
-- y se publica todo lo demas. No hay lista de nombres escrita a mano: el
-- criterio es verificable y sigue siendo cierto si mañana cambia el
-- catalogo.
--
-- La primera version de esta regla preguntaba por `sol_pricelist`, el
-- marcador de lo que salio de la planilla. Estaba mal: dejaba afuera
-- `sol_validated`, que es un marcador MAS fuerte —precio confirmado por
-- Sol— y es el que llevan los cuatro servicios de Depilacion. Con esa
-- regla, cuatro servicios reales figuraban como inventados. Preguntar por
-- lo que NO es supuesto no tiene ese agujero.
--
-- MAQUILLAJE QUEDA COMO ESTA, Y NO ES UN OLVIDO
--
-- Maquillaje es el unico area sin ninguna linea real: la planilla no la
-- trae porque la maneja la socia de Sol. Aplicar la regla al pie la
-- borraria de la web, y el salon ofrece maquillaje. Retirar un area
-- entera no es resolver una duplicacion: no hay nada que duplique. Se
-- queda publicada y marcada como pendiente de la lista real.
--
-- Depilacion NO necesita esa excepcion: sus cuatro precios —rostro
-- completo 30.000, cejas 12.000, bigote 5.000, bozo 11.500— estan en la
-- planilla y ademas figuran confirmados por Sol.
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
                where t.service_id = s.id and t.source <> 'industry_baseline')
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
   and c.slug <> 'maquillaje'
   and s.is_public
   and not exists (select 1 from public.service_price_tiers t
                    where t.service_id = s.id and t.source <> 'industry_baseline');

-- 3. Que el archivo se pruebe a si mismo ----------------------------------

do $$
declare
  n integer;
begin
  -- Fuera de maquillaje no puede quedar publicado nada inventado.
  select count(*) into n
    from public.services s
    join public.categories c on c.id = s.category_id
   where c.slug <> 'maquillaje'
     and s.is_public and s.is_active and s.deleted_at is null
     and not exists (select 1 from public.service_price_tiers t
                      where t.service_id = s.id and t.source <> 'industry_baseline');
  if n <> 0 then
    raise exception 'quedaron % servicios inventados publicados', n;
  end if;

  -- Y lo que no es supuesto, si tiene descripcion, tiene que estar a la vista.
  select count(*) into n
    from public.services s
   where s.is_active and s.deleted_at is null and not s.is_public
     and exists (select 1 from public.service_price_tiers t
                  where t.service_id = s.id and t.source <> 'industry_baseline')
     and (coalesce(btrim(s.description), '') <> '' or s.slug in ('lavado', 'trenzas'));
  if n <> 0 then
    raise exception '% servicios reales quedaron sin publicar', n;
  end if;

  -- Depilacion tiene que seguir entera y contada como real. Es la
  -- comprobacion que hubiera atajado el error de la primera version:
  -- con la regla vieja estos cuatro figuraban como inventados.
  select count(*) into n
    from public.services s
    join public.categories c on c.id = s.category_id
   where c.slug = 'depilacion'
     and s.is_public and s.is_active and s.deleted_at is null
     and exists (select 1 from public.service_price_tiers t
                  where t.service_id = s.id and t.source <> 'industry_baseline');
  if n <> 4 then
    raise exception 'depilacion tiene que tener 4 servicios reales publicados, tiene %', n;
  end if;

  -- Maquillaje sigue en pie: borrar un area entera seria peor que
  -- dejarla provisional.
  select count(*) into n
    from public.services s
    join public.categories c on c.id = s.category_id
   where c.slug = 'maquillaje'
     and s.is_public and s.is_active and s.deleted_at is null;
  if n < 1 then
    raise exception 'maquillaje se quedo sin nada publicado';
  end if;

  raise notice 'LA WEB MUESTRA EL CATALOGO REAL: pasa';
end $$;
