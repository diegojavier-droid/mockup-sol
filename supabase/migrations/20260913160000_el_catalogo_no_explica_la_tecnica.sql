-- El catalogo dice que le van a hacer, no como se hace
--
-- Los 27 servicios de la planilla entraron con el nombre de Sol y la
-- descripcion vacia. Con el nombre solo, "Reflejos con gorra - total" y
-- "Reflejos con papel - total" se diferencian en $5.000 y en nada que la
-- clienta pueda leer. Y de esa eleccion depende una seña del 20%.
--
-- LA REGLA
--
-- La descripcion dice QUE PARTE DEL PELO se trabaja o QUE RESUELVE.
-- Nunca como se hace. La tecnica es del oficio y se conversa adentro del
-- salon; en la web no le sirve a nadie.
--
-- Sale de mirar como lo resuelve el rubro, no de una opinion. En BUCLES,
-- "Mechas localizadas" lleva debajo "Hasta 10 bandas": no explica que es
-- una banda, dice cuanto se lleva la clienta. En Marcelo Cuggini, de
-- Rosario, el agregado es "con lavado y secado" o "(desde)". Ninguno de
-- los tres sitios relevados explica una tecnica. Las citas textuales
-- quedaron en .claude/skills/copy-sol-mai/references/corpus-argentino.md
--
-- QUE NO SE DICE, Y POR QUE
--
-- Ninguna descripcion promete que el servicio incluya lavado o secado.
-- Cuggini aclara que "toda coloracion incluye lavado neutro y secado",
-- pero la planilla de Sol cobra "Lavado" y "Secado y modelado" como
-- lineas aparte, asi que dar por incluido lo que ella factura suelto
-- seria una promesa que el salon tendria que incumplir en el mostrador.
-- Queda como pregunta para Sol.
--
-- Lavado y Trenzas entran sin descripcion a proposito: el nombre ya
-- contesta, y rellenar por rellenar es ruido. BUCLES hace lo mismo con
-- Corte, Balayage y Permanente.
--
-- UNA INVARIANTE PARA LA REGLA
--
-- El archivo falla si una descripcion nombra el aparato o el
-- procedimiento: el gorro, el aluminio, el barrido. Si alguien vuelve a
-- explicar el oficio en la web, CI lo frena.
--
-- La primera version de esa lista prohibia tambien "amoniaco" y
-- "tonalizador", y fallo contra una descripcion que ya estaba publicada:
-- "Bano de luz - Coloracion semipermanente sin amoniaco". La regla
-- estaba mal, no el dato. BUCLES vende "Tintura sin amoniaco" y
-- "Tratamiento Capilar - Sin formol": el nombre de un producto no es una
-- tecnica, y a la clienta le importa. La linea quedo entre el aparato y
-- el producto, que es donde corresponde.
--
-- LO QUE ESTO NO ARREGLA
--
-- Los nombres siguen teniendo la tecnica adentro: "con gorra", "con
-- papel". Y en coloracion la clienta ve cuatro raices casi iguales que
-- solo se distinguen por una marca que no conoce y por el precio, asi
-- que va a elegir por barata y no por la que le corresponde. Eso no se
-- arregla redactando: se arregla decidiendo que se publica, y lo decide
-- Sol.


-- Un ayudante para comparar sin acentos. Sin extensiones: la lista de
-- jerga es corta y conocida, y no vale la pena sumar una dependencia.
create or replace function public.unaccent_simple(t text)
returns text language sql immutable as $FN$
  select translate(coalesce(t, ''),
                   'áéíóúÁÉÍÓÚüÜñÑ',
                   'aeiouAEIOUuUnN');
$FN$;


update public.services set description = 'Sólo en el crecimiento de la raíz.', updated_at = now()
 where slug = 'reflejos-gorra-raices';
update public.services set description = 'En todo el largo del mechón.', updated_at = now()
 where slug = 'reflejos-gorra-total';
update public.services set description = 'Mechones más anchos, en todo el largo.', updated_at = now()
 where slug = 'reflejos-papel-total';
update public.services set description = 'Luz suave, sin cambiar tu color de base.', updated_at = now()
 where slug = 'iluminacion-gorra';
update public.services set description = 'Luz suave en mechones más anchos, sin cambiar tu color de base.', updated_at = now()
 where slug = 'iluminacion-papel';
update public.services set description = 'De la mitad a las puntas, con contraste marcado.', updated_at = now()
 where slug = 'californianas';
update public.services set description = 'Los mechones que enmarcan la cara.', updated_at = now()
 where slug = 'contorno';
update public.services set description = 'Sólo el crecimiento de la raíz.', updated_at = now()
 where slug = 'raiz-exiline';
update public.services set description = 'Sólo el crecimiento de la raíz.', updated_at = now()
 where slug = 'raiz-itely';
update public.services set description = 'Sólo el crecimiento de la raíz.', updated_at = now()
 where slug = 'raiz-sin-tacc';
update public.services set description = 'Sólo el crecimiento de la raíz.', updated_at = now()
 where slug = 'raiz-tono-well';
update public.services set description = 'Color parejo de raíz a puntas.', updated_at = now()
 where slug = 'total-exiline';
update public.services set description = 'Color parejo de raíz a puntas.', updated_at = now()
 where slug = 'total-itely';
update public.services set description = 'Color parejo de raíz a puntas.', updated_at = now()
 where slug = 'total-sin-tacc';
update public.services set description = 'Color parejo de raíz a puntas.', updated_at = now()
 where slug = 'total-tono-well';
update public.services set description = 'Empareja la franja de tono distinto que queda al crecer.', updated_at = now()
 where slug = 'vincha-tono';
update public.services set description = 'Cubre las canas del contorno: frente, patillas y nuca.', updated_at = now()
 where slug = 'vincha-color-comun';
update public.services set description = 'Refresca el color de los largos. Se suma al retoque de raíz.', updated_at = now()
 where slug = 'pasar-color';
update public.services set description = 'Peinado de fiesta, con parte del pelo suelto.', updated_at = now()
 where slug = 'semirecogido';
update public.services set description = 'Ondas marcadas, para fiesta o evento.', updated_at = now()
 where slug = 'ondas-al-agua';
update public.services set description = 'Brushing terminado con planchita.', updated_at = now()
 where slug = 'brushing-plancha';
update public.services set description = 'Brushing con ondas suaves.', updated_at = now()
 where slug = 'brushing-movimiento';
update public.services set description = 'Ondas hechas con planchita.', updated_at = now()
 where slug = 'ondas-plancha';
update public.services set description = 'Secado con forma, sin brushing.', updated_at = now()
 where slug = 'secado-modelado';
update public.services set description = 'Sólo el flequillo, sin tocar el largo.', updated_at = now()
 where slug = 'corte-flequillo';

-- Estos dos van sin descripcion: el nombre ya contesta.
update public.services set description = null, updated_at = now()
 where slug = 'trenzas';
update public.services set description = null, updated_at = now()
 where slug = 'lavado';

-- Que el archivo se pruebe a si mismo -----------------------------------

do $$
declare
  n integer;
  v_jerga text;
begin
  -- Todas las que tienen que tener descripcion, la tienen.
  select count(*) into n from public.services
   where slug in ('reflejos-gorra-raices', 'reflejos-gorra-total', 'reflejos-papel-total', 'iluminacion-gorra', 'iluminacion-papel', 'californianas', 'contorno', 'raiz-exiline', 'raiz-itely', 'raiz-sin-tacc', 'raiz-tono-well', 'total-exiline', 'total-itely', 'total-sin-tacc', 'total-tono-well', 'vincha-tono', 'vincha-color-comun', 'pasar-color', 'semirecogido', 'ondas-al-agua', 'brushing-plancha', 'brushing-movimiento', 'ondas-plancha', 'secado-modelado', 'corte-flequillo') and coalesce(btrim(description), '') = '';
  if n <> 0 then
    raise exception '% servicios quedaron sin descripcion', n;
  end if;

  -- Y las dos que van sin descripcion, siguen sin ella.
  select count(*) into n from public.services
   where slug in ('trenzas', 'lavado') and coalesce(btrim(description), '') <> '';
  if n <> 0 then
    raise exception '% servicios recibieron una descripcion que no va', n;
  end if;

  -- La regla, hecha invariante: ninguna descripcion del catalogo nombra
  -- la tecnica. Si alguien vuelve a explicar el oficio en la web, falla.
  foreach v_jerga in array array['gorra', 'gorro', 'papel de aluminio', 'aluminio', 'balayage', 'emulsion', 'emulsion', 'bandas termicas'] loop
    select count(*) into n from public.services
     where description is not null
       and lower(public.unaccent_simple(description)) like '%' || v_jerga || '%';
    if n <> 0 then
      raise exception 'la descripcion de % servicios nombra la tecnica: %', n, v_jerga;
    end if;
  end loop;

  raise notice 'EL CATALOGO NO EXPLICA LA TECNICA: pasa';
end $$;

