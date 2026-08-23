-- =====================================================================
-- Sol Mai · Fase 1 · Bloque 3.1 · Catalog bootstrap (idempotente)
--
-- Generado desde src/lib/booking-mock/* y src/lib/booking-rules.ts.
-- Regenerar con:  bun run db:generate-seed
--
-- NO editar a mano. Este archivo es OUTPUT del generador.
-- =====================================================================

begin;
set local search_path = public;

-- categories
insert into public.categories (slug, name, tagline, emoji, sort_order, is_public, is_active) values ('peluqueria', 'Peluquería', 'Corte, color y tratamientos', '✂', 0, true, true)
  on conflict (slug) do update set name = excluded.name, tagline = excluded.tagline, emoji = excluded.emoji, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.categories (slug, name, tagline, emoji, sort_order, is_public, is_active) values ('maquillaje', 'Maquillaje', 'Social, eventos y novias', '✿', 1, true, true)
  on conflict (slug) do update set name = excluded.name, tagline = excluded.tagline, emoji = excluded.emoji, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.categories (slug, name, tagline, emoji, sort_order, is_public, is_active) values ('unas', 'Uñas', 'Semipermanente, soft gel y nail art', '✦', 2, true, true)
  on conflict (slug) do update set name = excluded.name, tagline = excluded.tagline, emoji = excluded.emoji, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.categories (slug, name, tagline, emoji, sort_order, is_public, is_active) values ('depilacion', 'Depilación', 'Rostro, cejas y bozo', '◦', 3, true, true)
  on conflict (slug) do update set name = excluded.name, tagline = excluded.tagline, emoji = excluded.emoji, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;

-- services
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'corte-fem', 'Corte femenino', 'Diseño personalizado según rostro y estilo.', 45, 18000, 'ARS', 'popular', 0, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'brushing', 'Brushing', 'Secado con forma y movimiento.', 30, 10000, 'ARS', null, 1, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'peinado-diario', 'Peinado diario', 'Look prolijo para el día a día.', 30, 11000, 'ARS', null, 2, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'peinado-social', 'Peinado social', 'Para reuniones y salidas especiales.', 50, 18000, 'ARS', null, 3, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'recogido', 'Recogido', 'Updo elegante para ocasiones.', 60, 22000, 'ARS', 'evento', 4, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'color-global', 'Color global', 'Color uniforme de raíz a puntas.', 90, 32000, 'ARS', 'color', 5, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'retoque-raiz', 'Retoque de raíz', 'Cobertura de crecimiento.', 60, 22000, 'ARS', 'color', 6, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'tonalizacion', 'Tonalización', 'Refresca y unifica el tono.', 45, 16000, 'ARS', 'color', 7, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'bano-luz', 'Baño de luz', 'Brillo y matiz instantáneo.', 30, 14000, 'ARS', null, 8, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'mechas', 'Mechas', 'Iluminación clásica.', 120, 42000, 'ARS', 'color', 9, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'babylights', 'Babylights', 'Mechas finas y naturales.', 150, 52000, 'ARS', 'popular', 10, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'balayage', 'Balayage', 'Degradé natural pintado a mano.', 180, 58000, 'ARS', 'popular', 11, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'claritos', 'Claritos', 'Reflejos suaves en zonas clave.', 90, 28000, 'ARS', null, 12, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'alisado', 'Alisado', 'Lacio duradero con cuidado capilar.', 180, 65000, 'ARS', null, 13, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'botox', 'Botox capilar', 'Suavidad, brillo y reducción del frizz.', 90, 28000, 'ARS', 'tratamiento', 14, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'nutricion', 'Nutrición capilar', 'Aporte de nutrientes profundos.', 45, 15000, 'ARS', 'tratamiento', 15, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'hidratacion', 'Hidratación profunda', 'Recupera elasticidad y brillo.', 45, 15000, 'ARS', 'tratamiento', 16, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'reparacion', 'Reparación capilar', 'Fibras dañadas restauradas.', 60, 20000, 'ARS', 'tratamiento', 17, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'reconstruccion', 'Reconstrucción', 'Plan intensivo para cabellos castigados.', 60, 22000, 'ARS', 'tratamiento', 18, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'post-color', 'Tratamiento post-color', 'Sella y prolonga el color.', 30, 12000, 'ARS', 'tratamiento', 19, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'corte-brushing', 'Corte + brushing', 'Corte con terminación profesional.', 75, 25000, 'ARS', 'combinado', 20, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'color-nutricion', 'Color + nutrición', 'Color con tratamiento incluido.', 120, 42000, 'ARS', 'combinado', 21, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'mechas-tonalizacion', 'Mechas + tonalización', 'Iluminación con matiz a medida.', 150, 52000, 'ARS', 'combinado', 22, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'balayage-nutricion', 'Balayage + nutrición', 'Degradé con tratamiento.', 210, 68000, 'ARS', 'combinado', 23, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'alisado-corte', 'Alisado + corte', 'Lacio con renovación de forma.', 210, 72000, 'ARS', 'combinado', 24, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'alisado-nutricion', 'Alisado + nutrición', 'Lacio con cuidado profundo.', 210, 72000, 'ARS', 'combinado', 25, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'mechas-corte-brushing', 'Mechas + corte + brushing', 'Pack completo de transformación.', 180, 62000, 'ARS', 'combinado', 26, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'color-tratamiento', 'Color + tratamiento reparador', 'Color con reparación intensiva.', 150, 48000, 'ARS', 'combinado', 27, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'mk-social', 'Maquillaje social', 'Look natural luminoso.', 45, 18000, 'ARS', null, 0, true, true from public.categories where slug = 'maquillaje'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'mk-fiesta', 'Maquillaje de fiesta', 'Glamour y larga duración.', 60, 24000, 'ARS', 'popular', 1, true, true from public.categories where slug = 'maquillaje'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'mk-evento', 'Maquillaje para eventos', 'Para invitadas especiales.', 60, 26000, 'ARS', 'evento', 2, true, true from public.categories where slug = 'maquillaje'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'mk-novia', 'Maquillaje de novia', 'Diseño exclusivo para tu día.', 90, 45000, 'ARS', 'evento', 3, true, true from public.categories where slug = 'maquillaje'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'mk-prueba', 'Prueba de maquillaje', 'Ensayo previo personalizado.', 60, 20000, 'ARS', null, 4, true, true from public.categories where slug = 'maquillaje'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'semi', 'Esmaltado semipermanente', 'Color duradero y brillo.', 45, 10000, 'ARS', 'popular', 0, true, true from public.categories where slug = 'unas'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'kapping', 'Kapping', 'Refuerzo sobre uña natural.', 60, 13000, 'ARS', null, 1, true, true from public.categories where slug = 'unas'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'softgel', 'Soft gel', 'Extensión liviana y natural.', 90, 18000, 'ARS', 'popular', 2, true, true from public.categories where slug = 'unas'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'nailart', 'Nail art', 'Diseños y detalles a mano.', 30, 5000, 'ARS', null, 3, true, true from public.categories where slug = 'unas'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'mani', 'Manicura completa', 'Cutícula, forma y prolijidad.', 45, 8000, 'ARS', null, 4, true, true from public.categories where slug = 'unas'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'retiro', 'Retiro y renovación', 'Quita previa y nuevo color.', 60, 12000, 'ARS', null, 5, true, true from public.categories where slug = 'unas'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'depi-rostro-completo', 'Rostro completo', 'Depilación facial completa con terminación prolija.', 30, 30000, 'ARS', 'popular', 0, true, true from public.categories where slug = 'depilacion'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'depi-cejas', 'Cejas', 'Diseño y limpieza de cejas para enmarcar la mirada.', 15, 12000, 'ARS', null, 1, true, true from public.categories where slug = 'depilacion'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'depi-bigote', 'Bigote', 'Depilación rápida de la zona del bozo.', 10, 5000, 'ARS', null, 2, true, true from public.categories where slug = 'depilacion'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)
  select id, 'depi-bozo-menton', 'Bozo / bigote y mentón', 'Depilación de bozo y mentón con acabado cuidado.', 15, 11500, 'ARS', null, 3, true, true from public.categories where slug = 'depilacion'
  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;

-- extras · code = id de negocio (compat wizard); slug = {category}-{code}
insert into public.extras (category_id, code, slug, name, duration_delta_minutes, price_amount, currency, sort_order, is_public, is_active)
  select id, 'ampolla', 'peluqueria-ampolla', 'Ampolla nutritiva', 5, 3500, 'ARS', 0, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, code = excluded.code, name = excluded.name, duration_delta_minutes = excluded.duration_delta_minutes, price_amount = excluded.price_amount, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.extras (category_id, code, slug, name, duration_delta_minutes, price_amount, currency, sort_order, is_public, is_active)
  select id, 'hidra-express', 'peluqueria-hidra-express', 'Hidratación express', 15, 4000, 'ARS', 1, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, code = excluded.code, name = excluded.name, duration_delta_minutes = excluded.duration_delta_minutes, price_amount = excluded.price_amount, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.extras (category_id, code, slug, name, duration_delta_minutes, price_amount, currency, sort_order, is_public, is_active)
  select id, 'corte-extra', 'peluqueria-corte-extra', 'Corte adicional', 30, 8000, 'ARS', 2, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, code = excluded.code, name = excluded.name, duration_delta_minutes = excluded.duration_delta_minutes, price_amount = excluded.price_amount, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.extras (category_id, code, slug, name, duration_delta_minutes, price_amount, currency, sort_order, is_public, is_active)
  select id, 'brushing-final', 'peluqueria-brushing-final', 'Brushing final', 25, 6000, 'ARS', 3, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, code = excluded.code, name = excluded.name, duration_delta_minutes = excluded.duration_delta_minutes, price_amount = excluded.price_amount, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.extras (category_id, code, slug, name, duration_delta_minutes, price_amount, currency, sort_order, is_public, is_active)
  select id, 'toni-extra', 'peluqueria-toni-extra', 'Tonalización', 35, 10000, 'ARS', 4, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, code = excluded.code, name = excluded.name, duration_delta_minutes = excluded.duration_delta_minutes, price_amount = excluded.price_amount, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.extras (category_id, code, slug, name, duration_delta_minutes, price_amount, currency, sort_order, is_public, is_active)
  select id, 'sellado', 'peluqueria-sellado', 'Sellado', 20, 5000, 'ARS', 5, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, code = excluded.code, name = excluded.name, duration_delta_minutes = excluded.duration_delta_minutes, price_amount = excluded.price_amount, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.extras (category_id, code, slug, name, duration_delta_minutes, price_amount, currency, sort_order, is_public, is_active)
  select id, 'masaje', 'peluqueria-masaje', 'Masaje capilar', 10, 3500, 'ARS', 6, true, true from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set category_id = excluded.category_id, code = excluded.code, name = excluded.name, duration_delta_minutes = excluded.duration_delta_minutes, price_amount = excluded.price_amount, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.extras (category_id, code, slug, name, duration_delta_minutes, price_amount, currency, sort_order, is_public, is_active)
  select id, 'pestanas', 'maquillaje-pestanas', 'Pestañas', 10, 3500, 'ARS', 0, true, true from public.categories where slug = 'maquillaje'
  on conflict (slug) do update set category_id = excluded.category_id, code = excluded.code, name = excluded.name, duration_delta_minutes = excluded.duration_delta_minutes, price_amount = excluded.price_amount, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.extras (category_id, code, slug, name, duration_delta_minutes, price_amount, currency, sort_order, is_public, is_active)
  select id, 'prueba', 'maquillaje-prueba', 'Prueba previa', 60, 12000, 'ARS', 1, true, true from public.categories where slug = 'maquillaje'
  on conflict (slug) do update set category_id = excluded.category_id, code = excluded.code, name = excluded.name, duration_delta_minutes = excluded.duration_delta_minutes, price_amount = excluded.price_amount, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.extras (category_id, code, slug, name, duration_delta_minutes, price_amount, currency, sort_order, is_public, is_active)
  select id, 'retoque', 'maquillaje-retoque', 'Retoque', 20, 6000, 'ARS', 2, true, true from public.categories where slug = 'maquillaje'
  on conflict (slug) do update set category_id = excluded.category_id, code = excluded.code, name = excluded.name, duration_delta_minutes = excluded.duration_delta_minutes, price_amount = excluded.price_amount, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.extras (category_id, code, slug, name, duration_delta_minutes, price_amount, currency, sort_order, is_public, is_active)
  select id, 'nailart-extra', 'unas-nailart-extra', 'Nail art', 20, 3000, 'ARS', 0, true, true from public.categories where slug = 'unas'
  on conflict (slug) do update set category_id = excluded.category_id, code = excluded.code, name = excluded.name, duration_delta_minutes = excluded.duration_delta_minutes, price_amount = excluded.price_amount, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.extras (category_id, code, slug, name, duration_delta_minutes, price_amount, currency, sort_order, is_public, is_active)
  select id, 'retiro-extra', 'unas-retiro-extra', 'Retiro previo', 25, 3500, 'ARS', 1, true, true from public.categories where slug = 'unas'
  on conflict (slug) do update set category_id = excluded.category_id, code = excluded.code, name = excluded.name, duration_delta_minutes = excluded.duration_delta_minutes, price_amount = excluded.price_amount, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.extras (category_id, code, slug, name, duration_delta_minutes, price_amount, currency, sort_order, is_public, is_active)
  select id, 'refuerzo', 'unas-refuerzo', 'Refuerzo', 15, 4000, 'ARS', 2, true, true from public.categories where slug = 'unas'
  on conflict (slug) do update set category_id = excluded.category_id, code = excluded.code, name = excluded.name, duration_delta_minutes = excluded.duration_delta_minutes, price_amount = excluded.price_amount, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;

-- personalization fields + options
insert into public.personalization_fields (category_id, slug, label, field_type, is_required, sort_order, is_public, is_active)
  select id, 'largo', 'Largo del cabello', 'single_choice', false, 0, true, true from public.categories where slug = 'peluqueria'
  on conflict (category_id, slug) do update set label = excluded.label, field_type = excluded.field_type, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'corto', 'Corto', 'Corto', 0, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'largo'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'media-melena', 'Media melena', 'Media melena', 1, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'largo'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'largo', 'Largo', 'Largo', 2, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'largo'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'muy-largo', 'Muy largo', 'Muy largo', 3, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'largo'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_fields (category_id, slug, label, field_type, is_required, sort_order, is_public, is_active)
  select id, 'densidad', 'Densidad', 'single_choice', false, 1, true, true from public.categories where slug = 'peluqueria'
  on conflict (category_id, slug) do update set label = excluded.label, field_type = excluded.field_type, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'fina', 'Fina', 'Fina', 0, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'densidad'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'media', 'Media', 'Media', 1, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'densidad'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'abundante', 'Abundante', 'Abundante', 2, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'densidad'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_fields (category_id, slug, label, field_type, is_required, sort_order, is_public, is_active)
  select id, 'tipo', 'Tipo de cabello', 'single_choice', false, 2, true, true from public.categories where slug = 'peluqueria'
  on conflict (category_id, slug) do update set label = excluded.label, field_type = excluded.field_type, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'liso', 'Liso', 'Liso', 0, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'tipo'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'ondulado', 'Ondulado', 'Ondulado', 1, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'tipo'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'rizado', 'Rizado', 'Rizado', 2, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'tipo'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'crespo', 'Crespo', 'Crespo', 3, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'tipo'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_fields (category_id, slug, label, field_type, is_required, sort_order, is_public, is_active)
  select id, 'quimicos', 'Antecedentes químicos', 'single_choice', false, 3, true, true from public.categories where slug = 'peluqueria'
  on conflict (category_id, slug) do update set label = excluded.label, field_type = excluded.field_type, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'ninguno', 'Ninguno', 'Ninguno', 0, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'quimicos'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'color-reciente', 'Color reciente', 'Color reciente', 1, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'quimicos'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'alisado-previo', 'Alisado previo', 'Alisado previo', 2, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'quimicos'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'decoloracion', 'Decoloración', 'Decoloración', 3, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'quimicos'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_fields (category_id, slug, label, field_type, is_required, sort_order, is_public, is_active)
  select id, 'alergias', 'Alergias', 'single_choice', false, 4, true, true from public.categories where slug = 'peluqueria'
  on conflict (category_id, slug) do update set label = excluded.label, field_type = excluded.field_type, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'no', 'No', 'No', 0, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'alergias'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'si-leves', 'Sí, leves', 'Sí, leves', 1, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'alergias'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'si-importantes', 'Sí, importantes', 'Sí, importantes', 2, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'alergias'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_fields (category_id, slug, label, field_type, is_required, sort_order, is_public, is_active)
  select id, 'objetivo', 'Objetivo buscado', 'single_choice', false, 5, true, true from public.categories where slug = 'peluqueria'
  on conflict (category_id, slug) do update set label = excluded.label, field_type = excluded.field_type, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'cambio-de-look', 'Cambio de look', 'Cambio de look', 0, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'objetivo'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'mantenimiento', 'Mantenimiento', 'Mantenimiento', 1, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'objetivo'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'brillo-y-cuidado', 'Brillo y cuidado', 'Brillo y cuidado', 2, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'objetivo'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'iluminar-el-rostro', 'Iluminar el rostro', 'Iluminar el rostro', 3, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'peluqueria' and pf.slug = 'objetivo'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_fields (category_id, slug, label, field_type, is_required, sort_order, is_public, is_active)
  select id, 'evento', 'Tipo de evento', 'single_choice', false, 0, true, true from public.categories where slug = 'maquillaje'
  on conflict (category_id, slug) do update set label = excluded.label, field_type = excluded.field_type, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'social', 'Social', 'Social', 0, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'maquillaje' and pf.slug = 'evento'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'cumpleanos', 'Cumpleaños', 'Cumpleaños', 1, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'maquillaje' and pf.slug = 'evento'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'casamiento', 'Casamiento', 'Casamiento', 2, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'maquillaje' and pf.slug = 'evento'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'sesion-de-fotos', 'Sesión de fotos', 'Sesión de fotos', 3, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'maquillaje' and pf.slug = 'evento'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_fields (category_id, slug, label, field_type, is_required, sort_order, is_public, is_active)
  select id, 'horario', 'Horario del evento', 'single_choice', false, 1, true, true from public.categories where slug = 'maquillaje'
  on conflict (category_id, slug) do update set label = excluded.label, field_type = excluded.field_type, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'manana', 'Mañana', 'Mañana', 0, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'maquillaje' and pf.slug = 'horario'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'tarde', 'Tarde', 'Tarde', 1, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'maquillaje' and pf.slug = 'horario'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'noche', 'Noche', 'Noche', 2, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'maquillaje' and pf.slug = 'horario'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_fields (category_id, slug, label, field_type, is_required, sort_order, is_public, is_active)
  select id, 'estilo', 'Preferencia de estilo', 'single_choice', false, 2, true, true from public.categories where slug = 'maquillaje'
  on conflict (category_id, slug) do update set label = excluded.label, field_type = excluded.field_type, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'natural', 'Natural', 'Natural', 0, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'maquillaje' and pf.slug = 'estilo'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'glam', 'Glam', 'Glam', 1, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'maquillaje' and pf.slug = 'estilo'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'editorial', 'Editorial', 'Editorial', 2, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'maquillaje' and pf.slug = 'estilo'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'clasico', 'Clásico', 'Clásico', 3, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'maquillaje' and pf.slug = 'estilo'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_fields (category_id, slug, label, field_type, is_required, sort_order, is_public, is_active)
  select id, 'prueba', '¿Requiere prueba previa?', 'single_choice', false, 3, true, true from public.categories where slug = 'maquillaje'
  on conflict (category_id, slug) do update set label = excluded.label, field_type = excluded.field_type, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'si', 'Sí', 'Sí', 0, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'maquillaje' and pf.slug = 'prueba'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'no', 'No', 'No', 1, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'maquillaje' and pf.slug = 'prueba'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_fields (category_id, slug, label, field_type, is_required, sort_order, is_public, is_active)
  select id, 'estado', 'Estado actual de las uñas', 'single_choice', false, 0, true, true from public.categories where slug = 'unas'
  on conflict (category_id, slug) do update set label = excluded.label, field_type = excluded.field_type, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'naturales', 'Naturales', 'Naturales', 0, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'unas' and pf.slug = 'estado'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'con-semipermanente', 'Con semipermanente', 'Con semipermanente', 1, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'unas' and pf.slug = 'estado'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'con-soft-gel', 'Con soft gel', 'Con soft gel', 2, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'unas' and pf.slug = 'estado'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'danadas', 'Dañadas', 'Dañadas', 3, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'unas' and pf.slug = 'estado'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_fields (category_id, slug, label, field_type, is_required, sort_order, is_public, is_active)
  select id, 'terminacion', 'Tipo de terminación', 'single_choice', false, 1, true, true from public.categories where slug = 'unas'
  on conflict (category_id, slug) do update set label = excluded.label, field_type = excluded.field_type, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'brillante', 'Brillante', 'Brillante', 0, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'unas' and pf.slug = 'terminacion'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'mate', 'Mate', 'Mate', 1, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'unas' and pf.slug = 'terminacion'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'francesa', 'Francesa', 'Francesa', 2, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'unas' and pf.slug = 'terminacion'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;
insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)
  select pf.id, 'color-liso', 'Color liso', 'Color liso', 3, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = 'unas' and pf.slug = 'terminacion'
  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;

-- service_personalization_rules + option modifiers (desde bookingServiceRuleMatrix)
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'corte-fem' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'corte-fem' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'corte-fem' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'corte-fem' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'corte-fem' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'corte-fem' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'corte-fem' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'corte-fem' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 10, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'corte-fem' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'corte-fem' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'corte-fem' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'corte-fem' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'corte-fem' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'brushing' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'brushing' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'brushing' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'brushing' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 20, 0, 10 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'brushing' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'brushing' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'brushing' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'brushing' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'brushing' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 25, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'brushing' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'brushing' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'brushing' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'brushing' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'peinado-diario' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'peinado-diario' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'peinado-diario' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'peinado-diario' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 5 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'peinado-diario' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'peinado-diario' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'peinado-diario' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'peinado-diario' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 5 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'peinado-diario' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 25, 0, 8 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'peinado-diario' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'not_applicable' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'peinado-diario' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'peinado-diario' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'peinado-diario' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'peinado-social' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'peinado-social' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'peinado-social' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'peinado-social' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 5 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'peinado-social' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'peinado-social' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'peinado-social' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'peinado-social' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 5 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'peinado-social' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 25, 0, 8 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'peinado-social' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'not_applicable' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'peinado-social' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'peinado-social' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'peinado-social' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'recogido' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'recogido' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'recogido' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'recogido' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 5 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'recogido' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'recogido' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'recogido' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'recogido' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 5 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'recogido' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 25, 0, 8 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'recogido' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'not_applicable' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'recogido' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'recogido' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'recogido' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'color-global' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'color-global' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-global' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-global' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 20, 0, 10 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-global' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'color-global' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-global' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-global' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 10, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-global' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-global' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'color-global' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'color-global' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'color-global' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'retoque-raiz' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'retoque-raiz' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'retoque-raiz' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'retoque-raiz' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 10, 0, 5 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'retoque-raiz' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'retoque-raiz' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'retoque-raiz' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'retoque-raiz' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'retoque-raiz' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'tonalizacion' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'tonalizacion' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'tonalizacion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'tonalizacion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 20, 0, 10 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'tonalizacion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'tonalizacion' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'tonalizacion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'tonalizacion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 10, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'tonalizacion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'tonalizacion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'tonalizacion' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'tonalizacion' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'tonalizacion' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'bano-luz' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'bano-luz' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'bano-luz' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'bano-luz' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 20, 0, 10 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'bano-luz' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'bano-luz' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'bano-luz' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'bano-luz' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 10, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'bano-luz' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'bano-luz' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'bano-luz' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'bano-luz' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'bano-luz' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mechas' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mechas' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 15 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mechas' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 20, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mechas' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mechas' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mechas' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'babylights' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'babylights' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'babylights' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'babylights' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 15 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'babylights' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'babylights' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'babylights' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'babylights' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 20, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'babylights' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'babylights' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'babylights' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'babylights' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'babylights' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'balayage' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'balayage' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'balayage' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'balayage' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 15 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'balayage' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'balayage' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'balayage' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'balayage' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 20, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'balayage' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'balayage' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'balayage' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'balayage' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'balayage' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'claritos' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'claritos' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'claritos' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'claritos' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 15 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'claritos' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'claritos' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'claritos' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'claritos' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 20, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'claritos' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'claritos' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'claritos' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'claritos' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'claritos' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'alisado' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'alisado' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 15 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'alisado' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 5 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 10 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 45, 0, 15 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'alisado' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'alisado' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'alisado' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'botox' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'botox' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'botox' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'botox' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 5 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'botox' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'botox' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'botox' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'botox' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 10, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'botox' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'botox' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'botox' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'botox' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'botox' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'nutricion' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'nutricion' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'nutricion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'nutricion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 5 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'nutricion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 10, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'nutricion' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'nutricion' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'nutricion' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'hidratacion' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'hidratacion' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'hidratacion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'hidratacion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 5 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'hidratacion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'hidratacion' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'hidratacion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'hidratacion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 10, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'hidratacion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'hidratacion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'hidratacion' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'hidratacion' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'hidratacion' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'reparacion' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'reparacion' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'reparacion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'reparacion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 5 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'reparacion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'reparacion' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'reparacion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'reparacion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 10, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'reparacion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'reparacion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'reparacion' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'reparacion' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'reparacion' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'reconstruccion' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'reconstruccion' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'reconstruccion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'reconstruccion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 5 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'reconstruccion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'reconstruccion' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'reconstruccion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'reconstruccion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 10, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'reconstruccion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'reconstruccion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'reconstruccion' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'reconstruccion' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'reconstruccion' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'post-color' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'post-color' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'post-color' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'post-color' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 5 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'post-color' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'post-color' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'post-color' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'post-color' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 10, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'post-color' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'post-color' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'post-color' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'post-color' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'post-color' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'corte-brushing' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'corte-brushing' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'corte-brushing' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'corte-brushing' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 20, 0, 10 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'corte-brushing' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'corte-brushing' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'corte-brushing' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'corte-brushing' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'corte-brushing' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 25, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'corte-brushing' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'corte-brushing' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'corte-brushing' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'corte-brushing' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'color-nutricion' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'color-nutricion' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-nutricion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-nutricion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 20, 0, 10 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-nutricion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'color-nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 10, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'color-nutricion' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'color-nutricion' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'color-nutricion' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mechas-tonalizacion' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mechas-tonalizacion' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas-tonalizacion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas-tonalizacion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 15 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas-tonalizacion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mechas-tonalizacion' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas-tonalizacion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas-tonalizacion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 20, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas-tonalizacion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas-tonalizacion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mechas-tonalizacion' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mechas-tonalizacion' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mechas-tonalizacion' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'balayage-nutricion' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'balayage-nutricion' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'balayage-nutricion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'balayage-nutricion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 15 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'balayage-nutricion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'balayage-nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'balayage-nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'balayage-nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 20, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'balayage-nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'balayage-nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'balayage-nutricion' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'balayage-nutricion' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'balayage-nutricion' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'alisado-corte' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'alisado-corte' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado-corte' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado-corte' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 15 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado-corte' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'alisado-corte' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado-corte' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 5 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado-corte' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 10 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado-corte' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 45, 0, 15 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado-corte' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'alisado-corte' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'alisado-corte' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'alisado-corte' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'alisado-nutricion' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'alisado-nutricion' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado-nutricion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado-nutricion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 15 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado-nutricion' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'alisado-nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado-nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 5 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado-nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 10 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado-nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 45, 0, 15 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'alisado-nutricion' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'alisado-nutricion' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'alisado-nutricion' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'alisado-nutricion' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mechas-corte-brushing' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mechas-corte-brushing' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas-corte-brushing' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas-corte-brushing' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 15 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas-corte-brushing' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mechas-corte-brushing' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas-corte-brushing' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas-corte-brushing' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 20, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas-corte-brushing' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 30, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'mechas-corte-brushing' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mechas-corte-brushing' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mechas-corte-brushing' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mechas-corte-brushing' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'color-tratamiento' and c.slug = 'peluqueria' and f.slug = 'largo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'color-tratamiento' and c.slug = 'peluqueria' and f.slug = 'densidad'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-tratamiento' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'fina'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-tratamiento' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'media'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 20, 0, 10 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-tratamiento' and c.slug = 'peluqueria' and f.slug = 'densidad' and o.slug = 'abundante'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'operational' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'color-tratamiento' and c.slug = 'peluqueria' and f.slug = 'tipo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-tratamiento' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'liso'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 0, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-tratamiento' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'ondulado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 10, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-tratamiento' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'rizado'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
  select s.id, f.id, o.id, 15, 0, 0 from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = 'color-tratamiento' and c.slug = 'peluqueria' and f.slug = 'tipo' and o.slug = 'crespo'
  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'color-tratamiento' and c.slug = 'peluqueria' and f.slug = 'quimicos'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'color-tratamiento' and c.slug = 'peluqueria' and f.slug = 'alergias'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'color-tratamiento' and c.slug = 'peluqueria' and f.slug = 'objetivo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-social' and c.slug = 'maquillaje' and f.slug = 'evento'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-social' and c.slug = 'maquillaje' and f.slug = 'horario'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-social' and c.slug = 'maquillaje' and f.slug = 'estilo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-social' and c.slug = 'maquillaje' and f.slug = 'prueba'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-fiesta' and c.slug = 'maquillaje' and f.slug = 'evento'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-fiesta' and c.slug = 'maquillaje' and f.slug = 'horario'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-fiesta' and c.slug = 'maquillaje' and f.slug = 'estilo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-fiesta' and c.slug = 'maquillaje' and f.slug = 'prueba'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-evento' and c.slug = 'maquillaje' and f.slug = 'evento'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-evento' and c.slug = 'maquillaje' and f.slug = 'horario'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-evento' and c.slug = 'maquillaje' and f.slug = 'estilo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-evento' and c.slug = 'maquillaje' and f.slug = 'prueba'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-novia' and c.slug = 'maquillaje' and f.slug = 'evento'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-novia' and c.slug = 'maquillaje' and f.slug = 'horario'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-novia' and c.slug = 'maquillaje' and f.slug = 'estilo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-novia' and c.slug = 'maquillaje' and f.slug = 'prueba'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-prueba' and c.slug = 'maquillaje' and f.slug = 'evento'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-prueba' and c.slug = 'maquillaje' and f.slug = 'horario'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-prueba' and c.slug = 'maquillaje' and f.slug = 'estilo'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mk-prueba' and c.slug = 'maquillaje' and f.slug = 'prueba'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'semi' and c.slug = 'unas' and f.slug = 'estado'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'semi' and c.slug = 'unas' and f.slug = 'terminacion'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'kapping' and c.slug = 'unas' and f.slug = 'estado'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'kapping' and c.slug = 'unas' and f.slug = 'terminacion'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'softgel' and c.slug = 'unas' and f.slug = 'estado'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'softgel' and c.slug = 'unas' and f.slug = 'terminacion'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'nailart' and c.slug = 'unas' and f.slug = 'estado'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'nailart' and c.slug = 'unas' and f.slug = 'terminacion'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mani' and c.slug = 'unas' and f.slug = 'estado'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'mani' and c.slug = 'unas' and f.slug = 'terminacion'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'retiro' and c.slug = 'unas' and f.slug = 'estado'
  on conflict (service_id, field_id) do update set decision = excluded.decision;
insert into public.service_personalization_rules (service_id, field_id, decision)
  select s.id, f.id, 'contextual' from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = 'retiro' and c.slug = 'unas' and f.slug = 'terminacion'
  on conflict (service_id, field_id) do update set decision = excluded.decision;

-- business hours (una franja por weekday hoy; el schema admite múltiples)
delete from public.business_hours where weekday = 1 and opens_at = '09:30' and closes_at = '18:30';
insert into public.business_hours (weekday, opens_at, closes_at, is_active) values (1, '09:30', '18:30', true);
delete from public.business_hours where weekday = 2 and opens_at = '09:30' and closes_at = '18:30';
insert into public.business_hours (weekday, opens_at, closes_at, is_active) values (2, '09:30', '18:30', true);
delete from public.business_hours where weekday = 3 and opens_at = '09:30' and closes_at = '18:30';
insert into public.business_hours (weekday, opens_at, closes_at, is_active) values (3, '09:30', '18:30', true);
delete from public.business_hours where weekday = 4 and opens_at = '09:30' and closes_at = '18:30';
insert into public.business_hours (weekday, opens_at, closes_at, is_active) values (4, '09:30', '18:30', true);
delete from public.business_hours where weekday = 5 and opens_at = '09:30' and closes_at = '18:30';
insert into public.business_hours (weekday, opens_at, closes_at, is_active) values (5, '09:30', '18:30', true);
delete from public.business_hours where weekday = 6 and opens_at = '10:00' and closes_at = '14:00';
insert into public.business_hours (weekday, opens_at, closes_at, is_active) values (6, '10:00', '14:00', true);

commit;
