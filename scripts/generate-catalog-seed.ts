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

const OUTPUT_PATH = "supabase/migrations/20260724120100_catalog_bootstrap.sql";

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
out.push("-- Regenerar con:  bun run db:generate-seed");
out.push("--");
out.push("-- NO editar a mano. Este archivo es OUTPUT del generador.");
out.push("-- =====================================================================");
out.push("");
out.push("begin;");
out.push("set local search_path = public;");
out.push("");

// -------------------- categories --------------------
out.push("-- categories");
categories.forEach((c, i) => {
  out.push(
    `insert into public.categories (slug, name, tagline, emoji, sort_order, is_public, is_active) values (${q(c.id)}, ${q(c.name)}, ${q(c.tagline)}, ${q(c.emoji)}, ${i}, true, true)`,
  );
  out.push(
    `  on conflict (slug) do update set name = excluded.name, tagline = excluded.tagline, emoji = excluded.emoji, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;`,
  );
});
out.push("");

// -------------------- services --------------------
out.push("-- services");
Object.entries(services).forEach(([catId, list]) => {
  list.forEach((s, i) => {
    out.push(
      `insert into public.services (category_id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, is_public, is_active)`,
    );
    out.push(
      `  select id, ${q(s.id)}, ${q(s.name)}, ${q(s.desc)}, ${s.durationMinutes}, ${s.priceAmount}, 'ARS', ${q(s.tag ?? null)}, ${i}, true, true from public.categories where slug = ${q(catId)}`,
    );
    out.push(
      `  on conflict (slug) do update set category_id = excluded.category_id, name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount, tag = excluded.tag, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;`,
    );
  });
});
out.push("");

// -------------------- extras (code + slug compuesto) --------------------
out.push("-- extras · code = id de negocio (compat wizard); slug = {category}-{code}");
Object.entries(extras).forEach(([catId, list]) => {
  list.forEach((e, i) => {
    const composedSlug = `${catId}-${e.id}`;
    out.push(
      `insert into public.extras (category_id, code, slug, name, duration_delta_minutes, price_amount, currency, sort_order, is_public, is_active)`,
    );
    out.push(
      `  select id, ${q(e.id)}, ${q(composedSlug)}, ${q(e.name)}, ${e.durationMinutes}, ${e.priceAmount}, 'ARS', ${i}, true, true from public.categories where slug = ${q(catId)}`,
    );
    out.push(
      `  on conflict (slug) do update set category_id = excluded.category_id, code = excluded.code, name = excluded.name, duration_delta_minutes = excluded.duration_delta_minutes, price_amount = excluded.price_amount, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;`,
    );
  });
});
out.push("");

// -------------------- personalization fields + options --------------------
out.push("-- personalization fields + options");
Object.entries(personalizationFields).forEach(([catId, fields]) => {
  fields.forEach((f, i) => {
    out.push(
      `insert into public.personalization_fields (category_id, slug, label, field_type, is_required, sort_order, is_public, is_active)`,
    );
    out.push(
      `  select id, ${q(f.id)}, ${q(f.label)}, 'single_choice', false, ${i}, true, true from public.categories where slug = ${q(catId)}`,
    );
    out.push(
      `  on conflict (category_id, slug) do update set label = excluded.label, field_type = excluded.field_type, sort_order = excluded.sort_order, is_public = excluded.is_public, is_active = excluded.is_active, deleted_at = null;`,
    );
    f.options.forEach((opt, j) => {
      const oslug = slugify(opt);
      out.push(
        `insert into public.personalization_options (field_id, slug, label, value, sort_order, is_active)`,
      );
      out.push(
        `  select pf.id, ${q(oslug)}, ${q(opt)}, ${q(opt)}, ${j}, true from public.personalization_fields pf join public.categories c on c.id = pf.category_id where c.slug = ${q(catId)} and pf.slug = ${q(f.id)}`,
      );
      out.push(
        `  on conflict (field_id, slug) do update set label = excluded.label, value = excluded.value, sort_order = excluded.sort_order, is_active = excluded.is_active;`,
      );
    });
  });
});
out.push("");

// -------------------- service_personalization_rules + modifiers --------------------
out.push("-- service_personalization_rules + option modifiers (desde bookingServiceRuleMatrix)");

function decisionKind(d: PersonalizationFieldDecision): "operational" | "contextual" | "not_applicable" {
  return d.type;
}

function priceParts(rule: PersonalizationOptionRule): {
  fixed: number;
  percentage: number;
} {
  const p = rule.price;
  if (!p || p.type === "none") return { fixed: 0, percentage: 0 };
  if (p.type === "fixed") return { fixed: p.amount, percentage: 0 };
  return { fixed: 0, percentage: p.percentage };
}

// Recorremos TODOS los servicios del mock. Si el service está en la
// matriz, usamos su decisión por field. Si no, cae al default de la
// categoría (bookingRules[cat].personalizationModifiers). Emitir una
// fila por (service, field) mantiene el estado auditable en DB.
Object.entries(services).forEach(([catId, list]) => {
  const categoryId = catId as CategoryId;
  const categoryFields = personalizationFields[categoryId] ?? [];
  const categoryDefaults = bookingRules[categoryId]?.personalizationModifiers ?? {};

  list.forEach((svc) => {
    const matrixEntry = bookingServiceRuleMatrix[svc.id];
    categoryFields.forEach((field) => {
      const decision: PersonalizationFieldDecision =
        matrixEntry?.fields[field.id] ??
        categoryDefaults[field.id] ??
        { type: "contextual" };

      const kind = decisionKind(decision);

      out.push(
        `insert into public.service_personalization_rules (service_id, field_id, decision)`,
      );
      out.push(
        `  select s.id, f.id, ${q(kind)} from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id where s.slug = ${q(svc.id)} and c.slug = ${q(catId)} and f.slug = ${q(field.id)}`,
      );
      out.push(
        `  on conflict (service_id, field_id) do update set decision = excluded.decision;`,
      );

      if (decision.type !== "operational") return;

      Object.entries(decision.options).forEach(([optionLabel, rule]) => {
        const optionSlug = slugify(optionLabel);
        const { fixed, percentage } = priceParts(rule);
        const duration = rule.durationMinutes ?? 0;
        out.push(
          `insert into public.service_personalization_option_modifiers (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)`,
        );
        out.push(
          `  select s.id, f.id, o.id, ${duration}, ${fixed}, ${percentage} from public.services s, public.personalization_fields f join public.categories c on c.id = f.category_id join public.personalization_options o on o.field_id = f.id where s.slug = ${q(svc.id)} and c.slug = ${q(catId)} and f.slug = ${q(field.id)} and o.slug = ${q(optionSlug)}`,
        );
        out.push(
          `  on conflict (service_id, field_id, option_id) do update set duration_delta_minutes = excluded.duration_delta_minutes, price_fixed_amount = excluded.price_fixed_amount, price_percentage = excluded.price_percentage;`,
        );
      });
    });
  });
});
out.push("");

// -------------------- business hours --------------------
out.push("-- business hours (una franja por weekday hoy; el schema admite múltiples)");
businessHours.forEach((h) => {
  // No hay UNIQUE(weekday) — insertamos y confiamos en el EXCLUDE
  // constraint para evitar solapes. Idempotencia: si existe una fila
  // con la misma (weekday, opens_at, closes_at, is_active) no hacemos
  // nada. Para eso probamos un delete previo por triple exacta antes
  // del insert.
  out.push(
    `delete from public.business_hours where weekday = ${h.weekday} and opens_at = ${q(h.opensAt)} and closes_at = ${q(h.closesAt)};`,
  );
  out.push(
    `insert into public.business_hours (weekday, opens_at, closes_at, is_active) values (${h.weekday}, ${q(h.opensAt)}, ${q(h.closesAt)}, ${h.active});`,
  );
});
out.push("");

out.push("commit;");
out.push("");

writeFileSync(OUTPUT_PATH, out.join("\n"));
console.log("bootstrap written:", OUTPUT_PATH, "·", out.length, "lines");
