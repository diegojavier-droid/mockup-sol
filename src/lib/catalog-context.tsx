/**
 * Catálogo real, con las formas que la UX ya consume.
 *
 * La base de datos es la fuente de verdad (D2). Este contexto trae el
 * catálogo del API y lo adapta a los tipos que los componentes usan
 * desde el mockup validado, para conectar la UX existente sin
 * rediseñarla (§39 del mandato).
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type {
  ApiCategory,
  ApiExtra,
  ApiPersonalizationField,
  ApiService,
} from "@/lib/api/catalog-types";
import type {
  Category,
  CategoryId,
  Extra,
  PersonalizationField,
  Service,
  Tag,
} from "@/lib/booking-types";

const CATEGORY_IDS: CategoryId[] = ["peluqueria", "maquillaje", "unas", "depilacion"];

function isCategoryId(slug: string): slug is CategoryId {
  return (CATEGORY_IDS as string[]).includes(slug);
}

export function formatPrice(amount: number): string {
  return `$${amount.toLocaleString("es-AR")}`;
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

function emptyByCategory<T>(): Record<CategoryId, T[]> {
  return { peluqueria: [], maquillaje: [], unas: [], depilacion: [] };
}

function toCategory(c: ApiCategory): Category | null {
  if (!isCategoryId(c.slug)) return null;
  return { id: c.slug, name: c.name, tagline: c.tagline ?? "", emoji: c.emoji ?? "" };
}

function toService(s: ApiService): Service {
  // priceFromAmount es el mínimo entre tiers: es el "Desde" que ve la clienta.
  const amount = s.priceFromAmount || s.priceAmount;
  return {
    id: s.slug,
    name: s.name,
    desc: s.description ?? "",
    duration: formatDuration(s.durationMinutes),
    durationMinutes: s.durationMinutes,
    price: formatPrice(amount),
    priceAmount: amount,
    ...(s.tag ? { tag: s.tag as Tag } : {}),
  };
}

function toExtra(e: ApiExtra): Extra {
  return {
    id: e.id,
    name: e.name,
    durationMinutes: e.durationDeltaMinutes,
    price: formatPrice(e.priceAmount),
    priceAmount: e.priceAmount,
  };
}

function toField(f: ApiPersonalizationField): PersonalizationField {
  return { id: f.slug, label: f.label, options: f.options.map((o) => o.label) };
}

export interface CatalogData {
  categories: Category[];
  services: Record<CategoryId, Service[]>;
  extras: Record<CategoryId, Extra[]>;
  personalizationFields: Record<CategoryId, PersonalizationField[]>;
  /** Modo de precio por slug de servicio: gobierna cómo se presenta. */
  priceDisplayModes: Record<string, ApiService["priceDisplayMode"]>;
  isLoading: boolean;
  error: Error | null;
}

const EMPTY: CatalogData = {
  categories: [],
  services: emptyByCategory<Service>(),
  extras: emptyByCategory<Extra>(),
  personalizationFields: emptyByCategory<PersonalizationField>(),
  priceDisplayModes: {},
  isLoading: true,
  error: null,
};

const CatalogContext = createContext<CatalogData>(EMPTY);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const categoriesQuery = useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: () => api.get<ApiCategory[]>("/catalog/categories"),
    staleTime: 5 * 60_000,
  });
  const servicesQuery = useQuery({
    queryKey: ["catalog", "services"],
    queryFn: () => api.get<ApiService[]>("/catalog/services"),
    staleTime: 5 * 60_000,
  });
  const extrasQuery = useQuery({
    queryKey: ["catalog", "extras"],
    queryFn: () => api.get<ApiExtra[]>("/catalog/extras"),
    staleTime: 5 * 60_000,
  });
  const fieldsQuery = useQuery({
    queryKey: ["catalog", "personalization"],
    queryFn: () => api.get<ApiPersonalizationField[]>("/catalog/personalization"),
    staleTime: 5 * 60_000,
  });

  const value = useMemo<CatalogData>(() => {
    const services = emptyByCategory<Service>();
    const extras = emptyByCategory<Extra>();
    const personalizationFields = emptyByCategory<PersonalizationField>();
    const priceDisplayModes: Record<string, ApiService["priceDisplayMode"]> = {};

    for (const s of servicesQuery.data ?? []) {
      if (!isCategoryId(s.categorySlug)) continue;
      services[s.categorySlug].push(toService(s));
      priceDisplayModes[s.slug] = s.priceDisplayMode;
    }
    for (const e of extrasQuery.data ?? []) {
      if (isCategoryId(e.categorySlug)) extras[e.categorySlug].push(toExtra(e));
    }
    for (const f of fieldsQuery.data ?? []) {
      // El largo se pregunta como cualquier campo, pero resuelve un tier
      // en el backend; los campos de contexto no entran al wizard.
      if (f.fieldRole === "context") continue;
      if (isCategoryId(f.categorySlug)) personalizationFields[f.categorySlug].push(toField(f));
    }

    return {
      categories: (categoriesQuery.data ?? [])
        .map(toCategory)
        .filter((c): c is Category => c !== null),
      services,
      extras,
      personalizationFields,
      priceDisplayModes,
      isLoading:
        categoriesQuery.isLoading ||
        servicesQuery.isLoading ||
        extrasQuery.isLoading ||
        fieldsQuery.isLoading,
      error:
        (categoriesQuery.error as Error | null) ??
        (servicesQuery.error as Error | null) ??
        (extrasQuery.error as Error | null) ??
        (fieldsQuery.error as Error | null),
    };
  }, [
    categoriesQuery.data,
    categoriesQuery.isLoading,
    categoriesQuery.error,
    servicesQuery.data,
    servicesQuery.isLoading,
    servicesQuery.error,
    extrasQuery.data,
    extrasQuery.isLoading,
    extrasQuery.error,
    fieldsQuery.data,
    fieldsQuery.isLoading,
    fieldsQuery.error,
  ]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogData {
  return useContext(CatalogContext);
}
