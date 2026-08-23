-- =====================================================================
-- Sol Mai · Baseline operativo (tiers + parámetros por servicio)
--
-- Generado desde src/lib/booking-mock/* y src/lib/booking-rules.ts.
-- Regenerar con:  bun run db:generate-seed
--
-- Procedencia: los valores de Depilación fueron validados por Sol
-- Mai (source=sol_validated). El resto replica el mock UX validado
-- y queda marcado industry_baseline/confidence=low: son valores a
-- confirmar y editables desde el panel, nunca verdad del negocio.
--
-- NO editar a mano. Este archivo es OUTPUT del generador.
-- =====================================================================

begin;
set local search_path = public;

-- peluqueria / corte-fem
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'fixed', false, true, 10, false from public.services where slug = 'corte-fem'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 18000, 45, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'corte-fem'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 18000, 55, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'corte-fem'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 18000, 60, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'corte-fem'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 18000, 70, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'corte-fem'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / brushing
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'fixed', false, true, 10, false from public.services where slug = 'brushing'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 10000, 30, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'brushing'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 10000, 45, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'brushing'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 10000, 60, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'brushing'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 10000, 75, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'brushing'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / peinado-diario
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'peinado-diario'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 11000, 30, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'peinado-diario'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 11000, 40, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'peinado-diario'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 11550, 50, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'peinado-diario'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 11880, 60, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'peinado-diario'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / peinado-social
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'peinado-social'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 18000, 50, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'peinado-social'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 18000, 60, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'peinado-social'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 18900, 70, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'peinado-social'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 19440, 80, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'peinado-social'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / recogido
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'recogido'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 22000, 60, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'recogido'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 22000, 70, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'recogido'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 23100, 80, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'recogido'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 23760, 90, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'recogido'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / color-global
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'subject_to_confirmation', true, true, 15, true from public.services where slug = 'color-global'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 32000, 90, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'color-global'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 33600, 105, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'color-global'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 35200, 120, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'color-global'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 38400, 135, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'color-global'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / retoque-raiz
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'subject_to_confirmation', false, true, 15, true from public.services where slug = 'retoque-raiz'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 22000, 60, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'retoque-raiz'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 22000, 60, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'retoque-raiz'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 22000, 65, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'retoque-raiz'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 22000, 70, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'retoque-raiz'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / tonalizacion
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'subject_to_confirmation', true, true, 15, true from public.services where slug = 'tonalizacion'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 16000, 45, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'tonalizacion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 16800, 55, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'tonalizacion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 17600, 65, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'tonalizacion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 18400, 75, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'tonalizacion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / bano-luz
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'bano-luz'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 14000, 30, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'bano-luz'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 14700, 40, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'bano-luz'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 15400, 50, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'bano-luz'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 16100, 60, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'bano-luz'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / mechas
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'subject_to_confirmation', true, true, 15, true from public.services where slug = 'mechas'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 42000, 120, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'mechas'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 45360, 140, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'mechas'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 48300, 160, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'mechas'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 52500, 180, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'mechas'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / babylights
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'babylights'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 52000, 150, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'babylights'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 56160, 170, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'babylights'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 59800, 190, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'babylights'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 65000, 210, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'babylights'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / balayage
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'balayage'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 58000, 180, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'balayage'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 62640, 200, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'balayage'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 66700, 220, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'balayage'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 72500, 240, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'balayage'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / claritos
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'claritos'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 28000, 90, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'claritos'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 30240, 110, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'claritos'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 32200, 130, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'claritos'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 35000, 150, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'claritos'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / alisado
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'alisado'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 65000, 180, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'alisado'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 71500, 210, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'alisado'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 78000, 225, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'alisado'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 84500, 240, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'alisado'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / botox
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'botox'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 28000, 90, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'botox'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 28000, 100, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'botox'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 29400, 105, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'botox'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 30800, 115, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'botox'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / nutricion
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'nutricion'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 15000, 45, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'nutricion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 15000, 55, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'nutricion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 15750, 60, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'nutricion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 16500, 70, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'nutricion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / hidratacion
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'hidratacion'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 15000, 45, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'hidratacion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 15000, 55, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'hidratacion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 15750, 60, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'hidratacion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 16500, 70, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'hidratacion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / reparacion
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'reparacion'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 20000, 60, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'reparacion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 20000, 70, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'reparacion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 21000, 75, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'reparacion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 22000, 85, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'reparacion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / reconstruccion
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'reconstruccion'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 22000, 60, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'reconstruccion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 22000, 70, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'reconstruccion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 23100, 75, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'reconstruccion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 24200, 85, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'reconstruccion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / post-color
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'post-color'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 12000, 30, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'post-color'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 12000, 40, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'post-color'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 12600, 45, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'post-color'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 13200, 55, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'post-color'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / corte-brushing
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'fixed', false, true, 10, false from public.services where slug = 'corte-brushing'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 25000, 75, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'corte-brushing'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 25000, 90, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'corte-brushing'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 25000, 105, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'corte-brushing'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 25000, 120, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'corte-brushing'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / color-nutricion
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'color-nutricion'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 42000, 120, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'color-nutricion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 44100, 135, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'color-nutricion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 46200, 150, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'color-nutricion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 50400, 165, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'color-nutricion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / mechas-tonalizacion
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'mechas-tonalizacion'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 52000, 150, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'mechas-tonalizacion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 56160, 170, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'mechas-tonalizacion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 59800, 190, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'mechas-tonalizacion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 65000, 210, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'mechas-tonalizacion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / balayage-nutricion
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'balayage-nutricion'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 68000, 210, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'balayage-nutricion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 73440, 230, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'balayage-nutricion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 78200, 250, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'balayage-nutricion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 85000, 270, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'balayage-nutricion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / alisado-corte
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'alisado-corte'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 72000, 210, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'alisado-corte'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 79200, 240, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'alisado-corte'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 86400, 255, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'alisado-corte'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 93600, 270, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'alisado-corte'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / alisado-nutricion
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'alisado-nutricion'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 72000, 210, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'alisado-nutricion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 79200, 240, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'alisado-nutricion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 86400, 255, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'alisado-nutricion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 93600, 270, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'alisado-nutricion'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / mechas-corte-brushing
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'mechas-corte-brushing'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 62000, 180, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'mechas-corte-brushing'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 66960, 200, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'mechas-corte-brushing'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 71300, 220, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'mechas-corte-brushing'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 77500, 240, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'mechas-corte-brushing'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- peluqueria / color-tratamiento
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', true, true, 10, false from public.services where slug = 'color-tratamiento'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'corto', 48000, 150, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'color-tratamiento'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'medio', 50400, 165, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'color-tratamiento'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'largo', 52800, 180, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'color-tratamiento'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'xl', 57600, 195, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'color-tratamiento'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- maquillaje / mk-social
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', false, false, null, false from public.services where slug = 'mk-social'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'unico', 18000, 45, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'mk-social'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- maquillaje / mk-fiesta
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', false, false, null, false from public.services where slug = 'mk-fiesta'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'unico', 24000, 60, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'mk-fiesta'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- maquillaje / mk-evento
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', false, false, null, false from public.services where slug = 'mk-evento'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'unico', 26000, 60, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'mk-evento'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- maquillaje / mk-novia
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', false, false, null, false from public.services where slug = 'mk-novia'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'unico', 45000, 90, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'mk-novia'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- maquillaje / mk-prueba
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'from', false, false, null, false from public.services where slug = 'mk-prueba'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'unico', 20000, 60, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'mk-prueba'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- unas / semi
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'fixed', false, false, null, false from public.services where slug = 'semi'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'unico', 10000, 45, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'semi'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- unas / kapping
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'fixed', false, false, null, false from public.services where slug = 'kapping'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'unico', 13000, 60, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'kapping'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- unas / softgel
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'fixed', false, false, null, false from public.services where slug = 'softgel'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'unico', 18000, 90, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'softgel'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- unas / nailart
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'fixed', false, false, null, false from public.services where slug = 'nailart'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'unico', 5000, 30, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'nailart'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- unas / mani
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'fixed', false, false, null, false from public.services where slug = 'mani'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'unico', 8000, 45, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'mani'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- unas / retiro
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'fixed', false, false, null, false from public.services where slug = 'retiro'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'unico', 12000, 60, 0, 'industry_baseline', 'Derivado del mock UX validado; comercial a confirmar con Sol Mai', 'low' from public.services where slug = 'retiro'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- depilacion / depi-rostro-completo
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'fixed', false, false, 0, false from public.services where slug = 'depi-rostro-completo'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'unico', 30000, 30, 0, 'sol_validated', 'Duración y precio confirmados por Sol Mai (08-2026)', 'high' from public.services where slug = 'depi-rostro-completo'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- depilacion / depi-cejas
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'fixed', false, false, 0, false from public.services where slug = 'depi-cejas'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'unico', 12000, 15, 0, 'sol_validated', 'Duración y precio confirmados por Sol Mai (08-2026)', 'high' from public.services where slug = 'depi-cejas'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- depilacion / depi-bigote
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'fixed', false, false, 0, false from public.services where slug = 'depi-bigote'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'unico', 5000, 10, 0, 'sol_validated', 'Duración y precio confirmados por Sol Mai (08-2026)', 'high' from public.services where slug = 'depi-bigote'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;
-- depilacion / depi-bozo-menton
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration, setup_minutes_override, requires_consultation)
  select id, 'fixed', false, false, 0, false from public.services where slug = 'depi-bozo-menton'
  on conflict (service_id) do update set price_display_mode = excluded.price_display_mode, length_affects_price = excluded.length_affects_price, length_affects_duration = excluded.length_affects_duration, setup_minutes_override = excluded.setup_minutes_override, requires_consultation = excluded.requires_consultation;
insert into public.service_price_tiers (service_id, length_tier, price_main, duration_main_min, process_min, source, source_ref, confidence)
  select id, 'unico', 11500, 15, 0, 'sol_validated', 'Duración y precio confirmados por Sol Mai (08-2026)', 'high' from public.services where slug = 'depi-bozo-menton'
  on conflict (service_id, length_tier) do update set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min, process_min = excluded.process_min, source = excluded.source, source_ref = excluded.source_ref, confidence = excluded.confidence;

commit;
