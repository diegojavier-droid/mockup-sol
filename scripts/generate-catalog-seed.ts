import { categories } from '@/lib/booking-mock/categories';
import { writeFileSync } from 'fs';
import { services } from '@/lib/booking-mock/services';
import { extras } from '@/lib/booking-mock/extras';
import { personalizationFields } from '@/lib/booking-mock/personalization';
import { businessHours } from '@/lib/booking-mock/availability';

function q(s: string | null | undefined) {
  if (s == null) return 'null';
  return `'${String(s).replace(/'/g, "''")}'`;
}
function slug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const out: string[] = [];
out.push(`-- Auto-generated seed from src/lib/booking-mock/*. Deterministic & idempotent.`);
out.push(`-- Regenerate with: bun run db:generate-seed`);
out.push(`set search_path = public;`);
out.push(``);

out.push(`-- categories`);
categories.forEach((c, i) => {
  out.push(`insert into public.categories (slug, name, tagline, emoji, sort_order, is_public, is_active) values (${q(c.id)}, ${q(c.name)}, ${q(c.tagline)}, ${q(c.emoji)}, ${i}, true, true)`);
  out.push(`  on conflict (slug) do update set name = excluded.name, tagline = excluded.tagline, emoji = excluded.emoji, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;`);
});
out.push(``);

out.push(`-- services`);
Object.entries(services).forEach(([catId, list]) => {
  list.forEach((s, i) => {
    out.push(`insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)`);
    out.push(`  select id, ${q(s.id)}, ${q(s.name)}, ${q(s.desc)}, ${s.durationMinutes}, ${s.priceAmount}, 'ARS', ${q(s.tag ?? null)}, ${i}, true, true from public.categories where slug = ${q(catId)}`);
    out.push(`  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;`);
  });
});
out.push(``);

out.push(`-- extras`);
Object.entries(extras).forEach(([catId, list]) => {
  list.forEach((e, i) => {
    const s = `${catId}-${e.id}`; // avoid slug collisions across categories
    out.push(`insert into public.extras (category_id, slug, name, duration_delta_minutes, price_amount, currency, sort_order, is_public, is_active)`);
    out.push(`  select id, ${q(s)}, ${q(e.name)}, ${e.durationMinutes}, ${e.priceAmount}, 'ARS', ${i}, true, true from public.categories where slug = ${q(catId)}`);
    out.push(`  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, duration_delta_minutes = excluded.duration_delta_minutes, price_amount = excluded.price_amount, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;`);
  });
});
out.push(``);

out.push(`-- personalization fields + options`);
Object.entries(personalizationFields).forEach(([catId, fields]) => {
  fields.forEach((f, i) => {
    out.push(`insert into public.personalization_fields (category_id, slug, label, field_type, is_required, sort_order, is_public, is_active)`);
    out.push(`  select id, ${q(f.id)}, ${q(f.label)}, 'single_choice', false, ${i}, true, true from public.categories where slug = ${q(catId)}`);
    out.push(`  on conflict (category_id, slug) do update set label = excluded.label, field_type = excluded.field_type, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;`);
    f.options.forEach((opt, j) => {
      const oslug = slug(opt);
      out.push(`insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)`);
      out.push(`  select pf.id, ${q(oslug)}, ${q(opt)}, ${q(opt)}, ${j}, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = ${q(catId)} and pf.slug = ${q(f.id)}`);
      out.push(`  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;`);
    });
  });
});
out.push(``);

out.push(`-- business hours`);
businessHours.forEach(h => {
  out.push(`insert into public.business_hours (weekday, opens_at, closes_at, is_active) values (${h.weekday}, ${q(h.opensAt)}, ${q(h.closesAt)}, ${h.active})`);
  out.push(`  on conflict (weekday) do update set opens_at = excluded.opens_at, closes_at = excluded.closes_at, is_active = excluded.is_active;`);
});
out.push(``);

writeFileSync('db/migrations/20260724120100_catalog_seed.sql', '-- =====================================================================\n-- Sol Mai · Phase 1 · Block 3 · Catalog seed (idempotent)\n-- Real catalog data extracted verbatim from src/lib/booking-mock/*.\n-- Every INSERT uses ON CONFLICT DO UPDATE keyed on the stable slug so\n-- reapplying the seed converges instead of duplicating rows.\n-- =====================================================================\n\n' + out.join('\n') + '\n');
console.log('seed written:', out.length, 'lines');
