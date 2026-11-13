import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import type { ServerEnv } from "../../config/env";
import type { LoadedQuoteContext } from "../../lib/quote/repository";
import { ServicePartsError } from "../../lib/quote/parts";
import { errorHandler } from "../middleware/errorHandler";
import { createAvailabilityRoute } from "./availability";

type Dependencies = NonNullable<Parameters<typeof createAvailabilityRoute>[1]>;

function context(slug: string): LoadedQuoteContext {
  return {
    areaSlug: "peluqueria",
    settings: { depositRatePct: 20, defaultSetupMinutes: 0 },
    extras: [],
    service: {
      slug,
      name: slug,
      categorySlug: "peluqueria",
      kind: "servicio",
      tiers: (["corto", "largo"] as const).map((lengthTier) => ({
        lengthTier,
        priceMain: 1000,
        priceAddon: null,
        durationMainMin: lengthTier === "corto" ? 30 : 60,
        durationAddonMin: null,
        processMin: 0,
        source: "industry_baseline",
        confidence: "low",
      })),
      parameters: {
        priceDisplayMode: "fixed",
        lengthAffectsPrice: false,
        lengthAffectsDuration: true,
        setupMinutesOverride: 0,
        requiresConsultation: false,
      },
      fields: [
        {
          slug: "tipo",
          label: "Tipo",
          fieldRole: "modifier",
          decision: "operational",
          options: [
            {
              slug: "rizado",
              label: "Rizado",
              durationDeltaMinutes: 30,
              priceFixedAmount: 0,
              pricePercentage: 0,
            },
          ],
        },
      ],
    },
  };
}

function fixture(overrides: Partial<Dependencies> = {}) {
  const requests: Parameters<Dependencies["loadServiceParts"]>[2][] = [];
  const activities: string[] = [];
  const deps: Dependencies = {
    // Opaque sentinels: all IO adapters below are replaced per test, no network.
    createSupabaseAnonClient: () => ({}) as ReturnType<Dependencies["createSupabaseAnonClient"]>,
    createSupabaseAdminClient: () => ({}) as ReturnType<Dependencies["createSupabaseAdminClient"]>,
    createCatalogRepository: () => ({}) as ReturnType<Dependencies["createCatalogRepository"]>,
    loadServiceParts: async (_client, _catalog, input) => {
      requests.push(input);
      return {
        areaSlug: "peluqueria",
        contexts: input.parts.map((part, index) => {
          const loaded = context(part.serviceSlug);
          if (index === 0 && input.extraCodes.includes("extra")) {
            loaded.extras = [
              { code: "extra", name: "Extra", priceAmount: 100, durationDeltaMinutes: 30 },
            ];
          }
          return loaded;
        }),
      };
    },
    loadArea: async () => ({
      id: "area-test",
      slug: "peluqueria",
      capacity: 1,
      isBookableOnline: true,
    }),
    loadAvailabilitySettings: async () => ({
      slotGranularityMin: 30,
      minAdvanceMin: 0,
      maxAdvanceDays: 21,
    }),
    loadBusinessHours: async () =>
      Array.from({ length: 7 }, (_, weekday) => ({ weekday, opensAt: "09:00", closesAt: "12:00" })),
    loadScheduleExceptions: async () => [],
    loadBlockingDemands: async () => [],
    recordAssistedActivityInBackground: async (_client, activity) => {
      activities.push(activity);
    },
    ...overrides,
  };
  const app = new Hono().route(
    "/api/v1/availability",
    createAvailabilityRoute({} as ServerEnv, deps),
  );
  app.onError(errorHandler);
  return { app, requests, activities };
}

const base = {
  service: "color,corte",
  length: "corto,largo",
  from: "2099-01-05T03:00:00.000Z",
  days: 1,
};
function post(app: Hono, input: unknown) {
  return app.request("/api/v1/availability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
function get(app: Hono, input: Record<string, string | number>) {
  return app.request(
    `/api/v1/availability?${new URLSearchParams(Object.entries(input).map(([key, value]) => [key, String(value)] as [string, string]))}`,
  );
}

// These send real HTTP Requests through Hono's router/validation/error handler,
// with storage adapters faked and the production quote + availability engines.
describe("availability HTTP privacy and compatibility", () => {
  test("GET and POST agree for multiple services, lengths, extras and modifiers", async () => {
    const { app, requests, activities } = fixture();
    const old = await get(app, { ...base, extras: "extra", personalization: "tipo:rizado" });
    const current = await post(app, {
      ...base,
      extras: "extra",
      personalization: { tipo: "rizado" },
    });
    expect(old.status).toBe(200);
    expect(current.status).toBe(200);
    const body = (await current.json()) as { data: { days: { times: string[] }[] } };
    expect(body).toEqual((await old.json()) as typeof body);
    expect(body.data.days[0].times).toEqual(["09:00", "09:30"]); // 30 + 60 + 30 extra + 30 modifier
    expect(requests[0]).toEqual(requests[1]);
    expect(requests[1].parts.map((part) => part.lengthTier)).toEqual(["corto", "largo"]);
    expect(requests[1].parts[1].personalization).toBeUndefined();
    expect(activities).toEqual(["availability_self_service", "availability_self_service"]);
    for (const response of [old, current])
      expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  test("one length still applies to every service", async () => {
    const { app, requests } = fixture();
    const response = await post(app, { ...base, length: "corto" });
    expect(response.status).toBe(200);
    expect(requests[0].parts.map((part) => part.lengthTier)).toEqual(["corto", "corto"]);
    const body = (await response.json()) as { data: { days: { times: string[] }[] } };
    expect(body.data.days[0].times).toHaveLength(5);
  });

  test("rejects allergy context in both transports before any service lookup", async () => {
    const { app, requests, activities } = fixture();
    for (const response of [
      await get(app, { ...base, personalization: "alergias:si" }),
      await post(app, { ...base, personalization: { alergias: "si" } }),
      await post(app, { ...base, personalization: { " Alergias ": "no" } }),
    ]) {
      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.text()).not.toContain("alergias");
    }
    expect(requests).toHaveLength(0);
    expect(activities).toHaveLength(0);
  });

  test("validates JSON shape and the existing scalar limits", async () => {
    const { app, requests } = fixture();
    for (const invalid of [
      null,
      [],
      {},
      { ...base, service: "../bad" },
      { ...base, service: "a".repeat(261) },
      { ...base, length: "bad" },
      { ...base, extras: "x".repeat(257) },
      { ...base, from: "tomorrow" },
      { ...base, days: 0 },
      { ...base, days: 61 },
      { ...base, days: 1.5 },
      { ...base, personalization: "tipo:rizado" },
      { ...base, personalization: { tipo: 12 } },
      { ...base, personalization: { tipo: "x".repeat(65) } },
      {
        ...base,
        personalization: Object.fromEntries(
          Array.from({ length: 9 }, (_, i) => [`field${i}`, "x".repeat(60)]),
        ),
      },
    ]) {
      const response = await post(app, invalid);
      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    }
    const malformed = await app.request("/api/v1/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    expect(malformed.status).toBe(400);
    expect(malformed.headers.get("Cache-Control")).toBe("no-store");
    expect(requests).toHaveLength(0);
  });

  test("preserves service count and quote errors", async () => {
    const { app } = fixture();
    for (const input of [
      { ...base, service: "a,b,c,d,e" },
      { ...base, length: undefined },
      { ...base, personalization: { tipo: "unknown" } },
    ]) {
      const response = await post(app, input);
      expect(response.status).toBe(422);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    }
  });

  test("preserves mixed-area, missing-service and offline-area responses", async () => {
    const cases: [Partial<Dependencies>, number][] = [
      [
        {
          loadServiceParts: async () => {
            throw new ServicePartsError("mixed_areas");
          },
        },
        422,
      ],
      [{ loadServiceParts: async () => null }, 404],
      [{ loadArea: async () => null }, 404],
      [
        {
          loadArea: async () => ({
            id: "test",
            slug: "peluqueria",
            capacity: 1,
            isBookableOnline: false,
          }),
        },
        200,
      ],
    ];
    for (const [overrides, status] of cases) {
      const { app } = fixture(overrides);
      const response = await post(app, base);
      expect(response.status).toBe(status);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      if (status === 200)
        expect(await response.json()).toEqual({ data: { bookableOnline: false, days: [] } });
    }
  });
});
