/**
 * Generador de bootstrap del catálogo (idempotente).
 *
 * IMPORTANTE — cambio de contrato respecto del Bloque 3 original:
 *
 *   El bootstrap NO es la fuente de verdad permanente del producto.
 *   Es un semillado inicial reproducible para partir con el catálogo
 *   actual del mock. La fuente de verdad definitiva será PostgreSQL/
 *   Supabase administrado por el backend/panel interno (Bloque 4+).
 *
 * Reglas:
 *   * Determinista: mismo input → mismo output byte a byte.
 *   * Idempotente para registros presentes: ON CONFLICT DO UPDATE
 *     converge sin duplicar.
 *   * Renombres: `slug`/`code` son claves estables. Renombrar el
 *     `name` en el mock reescribe la fila. Renombrar el `slug`/`code`
 *     inserta una fila nueva y NO borra la anterior. Reconciliación
 *     explícita queda para Bloque 4 (panel interno) — el bootstrap no
 *     hace DELETE ni intenta detectar bajas automáticamente.
 *   * Atómico: todo el archivo se envuelve en BEGIN/COMMIT. Un fallo
 *     intermedio deja la DB en su estado anterior, no en un catálogo
 *     medio aplicado.
 */

import { writeFileSync } from "fs";
import { categories } from "@/lib/booking-mock/categories";
import { services } from "@/lib/booking-mock/services";
import { extras } from "@/lib/booking-mock/extras";
import { personalizationFields } from "@/lib/booking-mock/personalization";
import { businessHours } from "@/lib/booking-mock/availability";
import {
  bookingRules,
  bookingServiceRuleMatrix,
  type PersonalizationFieldDecision,
  type PersonalizationOptionRule,
} from "@/lib/booking-rules";
import type { CategoryId } from "@/lib/booking-types";

const OUTPUT_PATH = "supabase/migrations/20260724170535_catalog_bootstrap.sql";

function q(s: string | null | undefined) {
  if (s == null) return "null";
  return `'${String(s).replace(/'/g, "''")}'`;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const out: string[] = [];

out.push("-- =====================================================================");
out.push("-- Sol Mai · Fase 1 · Bloque 3.1 · Catalog bootstrap (idempotente)");
out.push("--");
out.push("-- Generado desde src/lib/booking-mock/* y src/lib/booking-rules.ts.");
out.push("-- Regenerar con: bun run db:generate-seed");
out.push("-- =====================================================================");
out.push("");
out.push("begin;");
out.push("");

for (const category of categories) {
  out.push(
    `insert into public.categories (slug, name, tagline, emoji, sort_order, is_public, is_active)` +
      ` values (${q(category.id)}, ${q(category.name)}, ${q(category.tagline)}, ${q(category.icon)}, ${category.sortOrder}, true, true)` +
      ` on conflict (slug) do update set name = excluded.name, tagline = excluded.tagline, emoji = excluded.emoji, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;`,
  );
}
out.push("");

for (const [categoryId, items] of Object.entries(services) as [CategoryId, (typeof services)[CategoryId]][]) {
  for (const service of items) {
    out.push(
      `insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)` +
        ` select c.id, ${q(service.id)}, ${q(service.name)}, ${q(service.description)}, ${service.durationMinutes}, ${service.price}, 'ARS', ${q(service.tag)}, ${service.sortOrder}, true, true` +
        ` from public.categories c where c.slug = ${q(categoryId)}` +
        ` on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, currency = excluded.currency, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;`,
    );
  }
}
out.push("");

for (const [categoryId, items] of Object.entries(extras) as [CategoryId, (typeof extras)[CategoryId]][]) {
  for (let index = 0; index < items.length; index += 1) {
    const extra = items[index];
    const slug = `${categoryId}-${slugify(extra.id)}`;
    out.push(
      `insert into public.extras (category_id, code, slug, name, duration_delta_minutes, price_amount, currency, sort_order, is_public, is_active)` +
        ` select c.id, ${q(extra.id)}, ${q(slug)}, ${q(extra.name)}, ${extra.durationMinutes}, ${extra.price}, 'ARS', ${index}, true, true` +
        ` from public.categories c where c.slug = ${q(categoryId)}` +
        ` on conflict (slug) do update set category_id = excluded.category_id, code = excluded.code, name = excluded.name, duration_delta_minutes = excluded.duration_delta_minutes, price_amount = excluded.price_amount, currency = excluded.currency, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;`,
    );
  }
}
out.push("");

for (const [categoryId, fields] of Object.entries(personalizationFields) as [CategoryId, (typeof personalizationFields)[CategoryId]][]) {
  for (let fieldIndex = 0; fieldIndex < fields.length; fieldIndex += 1) {
    const field = fields[fieldIndex];
    out.push(
      `insert into public.personalization_fields (category_id, slug, label, field_type, is_required, sort_order, is_public, is_active)` +
        ` select c.id, ${q(field.id)}, ${q(field.label)}, 'single_choice', true, ${fieldIndex}, true, true` +
        ` from public.categories c where c.slug = ${q(categoryId)}` +
        ` on conflict (category_id, slug) do update set label = excluded.label, field_type = excluded.field_type, is_required = excluded.is_required, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;`,
    );

    for (let optionIndex = 0; optionIndex < field.options.length; optionIndex += 1) {
      const option = field.options[optionIndex];
      out.push(
        `insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)` +
          ` select f.id, ${q(slugify(option))}, ${q(option)}, ${q(option)}, ${optionIndex}, true` +
          ` from public.personalization_fields f join public.categories c on c.id = f.category_id where c.slug = ${q(categoryId)} and f.slug = ${q(field.id)}` +
          ` on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;`,
      );
    }
  }
}
out.push("");

const fieldsByCategory = new Map(
  (Object.entries(personalizationFields) as [CategoryId, (typeof personalizationFields)[CategoryId]][]).map(
    ([categoryId, fields]) => [categoryId, new Map(fields.map((field) => [field.id, field]))],
  ),
);

for (const [categoryId, serviceRules] of Object.entries(bookingServiceRuleMatrix) as [CategoryId, (typeof bookingServiceRuleMatrix)[CategoryId]][]) {
  for (const [serviceId, serviceRule] of Object.entries(serviceRules)) {
    if (!serviceRule) continue;
    const fieldMap = fieldsByCategory.get(categoryId);
    if (!fieldMap) continue;

    for (const [fieldId, decision] of Object.entries(serviceRule) as [string, PersonalizationFieldDecision][]) {
      if (!decision) continue;
      const field = fieldMap.get(fieldId);
      if (!field) continue;

      out.push(
        `insert into public.service_personalization_rules (service_id, field_id, decision)` +
          ` select s.id, f.id, ${q(decision)} from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = ${q(serviceId)} and c.slug = ${q(categoryId)} and f.slug = ${q(fieldId)}` +
          ` on conflict (service_id, field_id) do update set decision = excluded.decision;`,
      );

      const rule = bookingRules[categoryId]?.[fieldId];
      if (decision !== "operational" || !rule) continue;

      for (const [optionSlug, modifier] of Object.entries(rule.options) as [string, PersonalizationOptionRule][]) {
        const matchingOption = field.options.find((option) => slugify(option) === optionSlug);
        if (!matchingOption) continue;
        out.push(
          `insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)` +
            ` select s.id, f.id, o.id, ${modifier.durationDeltaMinutes ?? 0}, ${modifier.priceFixedAmount ?? 0}, ${modifier.pricePercentage ?? 0} from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = ${q(serviceId)} and c.slug = ${q(categoryId)} and f.slug = ${q(fieldId)} and o.slug = ${q(optionSlug)}` +
            ` on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;`,
        );
      }
    }
  }
}
out.push("");

for (const [weekdayKey, windows] of Object.entries(businessHours)) {
  const weekday = Number(weekdayKey);
  for (const window of windows) {
    out.push(
      `delete from public.business_hours where weekday = ${weekday} and opens_at = ${q(window.opensAt)} and closes_at = ${q(window.closesAt)};`,
    );
    out.push(
      `insert into public.business_hours (weekday, opens_at, closes_at, is_active) values (${weekday}, ${q(window.opensAt)}, ${q(window.closesAt)}, true);`,
    );
  }
}
out.push("");
out.push("commit;");
out.push("");

writeFileSync(OUTPUT_PATH, `${out.join("\n")}\n`, "utf8");
console.log(`Wrote ${OUTPUT_PATH} (${out.length} lines)`);
