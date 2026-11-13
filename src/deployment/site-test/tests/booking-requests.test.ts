import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  availabilityQueryOptions,
  hasCurrentConsent,
  bookingCustomerSchema,
  isCanonicalCustomerPhone,
  pricingInput,
  quoteQueryOptions,
  submitBooking,
  type CreateBookingInput,
} from "@/lib/api/booking-requests";
import type { ApiPersonalizationField, ApiServiceDetail } from "@/lib/api/catalog-types";

function field(
  slug: string,
  overrides: Partial<ApiPersonalizationField> = {},
): ApiPersonalizationField {
  return {
    slug,
    categorySlug: "peluqueria",
    label: slug,
    fieldType: "single_choice",
    isRequired: false,
    fieldRole: "modifier",
    decision: "operational",
    options: [
      {
        slug: "opcion",
        label: "Opción",
        value: "Opción",
        durationDeltaMinutes: 10,
        priceFixedAmount: 100,
        pricePercentage: 0,
      },
    ],
    ...overrides,
  };
}
const detail = {
  slug: "corte-fem",
  personalization: [
    field("densidad"),
    field("alergias"),
    field("objetivo", { decision: "contextual" }),
    field("nota", { fieldType: "text" }),
    field("largo", { fieldRole: "tier_selector" }),
  ],
} as ApiServiceDetail;
const input = {
  serviceSlug: "corte-fem",
  lengthTier: "medio" as const,
  extraCodes: ["ampolla"],
  personalization: {
    densidad: "opcion",
    alergias: "si-importantes",
    objetivo: "opcion",
    nota: "dato privado",
    inventado: "dato privado",
    largo: "opcion",
  },
};
const booking: CreateBookingInput = {
  ...input,
  startsAt: "2030-11-12T12:00:00-03:00",
  termsVersion: "2026-11-12-site",
  acceptedTerms: true,
  customer: { firstName: "Prueba", phone: "+5493425550000", email: "prueba@example.test" },
  note: "Nota sintética de prueba",
};
let fetchSpy: ReturnType<typeof spyOn> | undefined;
afterEach(() => {
  fetchSpy?.mockRestore();
  fetchSpy = undefined;
});
function captureRequests() {
  const calls: { url: string; init: RequestInit }[] = [];
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async (
    url: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ data: String(url).includes("/catalog/services/") ? detail : {publicToken:"a".repeat(32)} }), { status: 200 });
  }) as typeof fetch);
  return calls;
}

describe("teléfono compatible con validación canónica",()=>{
  test("siete dígitos locales no alcanzan; siete internacionales sí",()=>{
    expect(isCanonicalCustomerPhone('3425550')).toBe(false);
    expect(isCanonicalCustomerPhone('+1234567')).toBe(true);
    expect(isCanonicalCustomerPhone('001234567')).toBe(true);
  });
  test("acepta formato argentino y conserva el original excepto trim",()=>{
    for(const phone of ['0342 15 555 0199','+54 (9) 342-555-0199','3425550199','5493425550199']) {
      expect(isCanonicalCustomerPhone(phone)).toBe(true);
      expect(bookingCustomerSchema.parse({...booking.customer,phone:' '+phone+' '}).phone).toBe(phone);
    }
  });
  test("rechaza E164 largo o cero inicial internacional y caracteres no ASCII",()=>{
    for(const phone of ['+1234567890123456','54123456789012345','+012345678','1234567890123','+１２３４５６７','+123\t4567','abc3425550199'])expect(isCanonicalCustomerPhone(phone)).toBe(false);
  });
});

describe("minimización antes del consentimiento", () => {
  test("conserva sólo modificadores operativos conocidos, largo y extras", () => {
    expect(pricingInput(input, detail)).toEqual({
      serviceSlug: "corte-fem",
      lengthTier: "medio",
      extraCodes: ["ampolla"],
      personalization: { densidad: "opcion" },
    });
  });
  test("falla cerrado sin detalle, con otro servicio o con opciones desconocidas", () => {
    expect(pricingInput(input).personalization).toEqual({});
    expect(pricingInput(input, { ...detail, slug: "otro" }).personalization).toEqual({});
    expect(
      pricingInput({ ...input, personalization: { densidad: "dato libre" } }, detail)
        .personalization,
    ).toEqual({});
    expect(quoteQueryOptions(input).enabled).toBe(false);
    expect(availabilityQueryOptions(input).enabled).toBe(false);
  });
  test("alergias no entra aunque catálogo la marque operativa por error", () => {
    expect(pricingInput(input, detail).personalization).not.toHaveProperty("alergias");
  });
  test("quote y availability transmiten sólo cuerpos mínimos, nunca respuestas en URL", async () => {
    const calls = captureRequests();
    await quoteQueryOptions(input, detail).queryFn();
    await availabilityQueryOptions(input, detail).queryFn();
    expect(calls.map((call) => call.url)).toEqual(["/api/v1/quote", "/api/v1/availability"]);
    for (const call of calls) {
      expect(call.init.method).toBe("POST");
      const body = JSON.parse(String(call.init.body));
      expect(body.personalization).toEqual({ densidad: "opcion" });
      expect(String(call.init.body)).not.toContain("alergias");
      expect(String(call.init.body)).not.toContain("dato privado");
    }
    expect(JSON.parse(String(calls[1].init.body))).toEqual({
      service: "corte-fem",
      length: "medio",
      extras: "ampolla",
      personalization: { densidad: "opcion" },
      days: 21,
    });
  });
  test("la caché no contiene salud y cambiar alergias no dispara otra consulta", () => {
    const changed = { ...input, personalization: { ...input.personalization, alergias: "no" } };
    expect(quoteQueryOptions(input, detail).queryKey).toEqual(
      quoteQueryOptions(changed, detail).queryKey,
    );
    expect(availabilityQueryOptions(input, detail).queryKey).toEqual(
      availabilityQueryOptions(changed, detail).queryKey,
    );
    expect(JSON.stringify(quoteQueryOptions(input, detail).queryKey)).not.toContain("alergias");
  });
});

describe("consentimiento al enviar la reserva", () => {
  test("recarga, revocación y versión cambiada no son aceptación", () => {
    expect(hasCurrentConsent(null, "v1")).toBe(false);
    expect(hasCurrentConsent("v1", null)).toBe(false);
    expect(hasCurrentConsent("v1", "v2")).toBe(false);
    expect(hasCurrentConsent("", "")).toBe(false);
    expect(hasCurrentConsent("v1", "v1")).toBe(true);
  });
  test("sin aceptación explícita no hace ninguna solicitud de red", async () => {
    const calls = captureRequests();
    for (const acceptedTerms of [false, undefined, null, "true"]) {
      await expect(
        submitBooking({ ...booking, acceptedTerms } as CreateBookingInput),
      ).rejects.toThrow();
    }
    await expect(submitBooking({ ...booking, termsVersion: "" })).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });
  test("Site conserva cliente ingresado y comentario consentido; alergias exige escenario explícito", async () => {
    const calls = captureRequests();
    await submitBooking(booking);
    expect(calls).toHaveLength(2);
    expect(calls[1].url).toBe("/api/v1/bookings");
    const body = JSON.parse(String(calls[1].init.body));
    expect(body.personalization).toEqual({densidad: "opcion"});
    expect(body.customer).toEqual({...booking.customer,acceptsMarketing:false});
    expect(body.testCustomerScenario).toBe(true);
    expect(body.note).toBe(booking.note);
    expect(body.testCommentScenario).toBe(true);
    expect(body).not.toHaveProperty("acceptedTrial");
    expect(body.consent).toEqual({ termsVersion: "2026-11-12-site" });
    expect(new Headers(calls[1].init.headers).get("X-Idempotency-Key")).toMatch(/^[a-f0-9-]{36}$/);
  });
  test("sólo el escenario ficticio explícito viaja al alta, con consentimiento", async () => {
    const calls:{url:string,init:RequestInit}[]=[];
    const withAllergy={...detail,personalization:[...detail.personalization.filter(f=>f.slug!=="alergias"),field("alergias",{fieldRole:"context",decision:"contextual",options:[{slug:"si-importantes",label:"Sí, importantes",value:"Sí, importantes",durationDeltaMinutes:0,priceFixedAmount:0,pricePercentage:0}]})]};
    fetchSpy=spyOn(globalThis,"fetch").mockImplementation((async(url,init)=>{calls.push({url:String(url),init:init??{}});return Response.json({data:String(url).includes('/catalog/')?withAllergy:{publicToken:'c'.repeat(32)}});}) as typeof fetch);
    await submitBooking({...booking,testAllergyScenario:true});
    const body=JSON.parse(String(calls[1].init.body));
    expect(body.personalization.alergias).toBe('si-importantes');
    expect(body.testAllergyScenario).toBe(true);
    expect(body.consent.termsVersion).toBe('2026-11-12-site');
    expect(body.note).toBe(booking.note);
    expect(body.testCommentScenario).toBe(true);
    expect(body.customer.firstName).toBe(booking.customer.firstName);
  });
  test("escenario desconocido o sin soporte contextual no llega al alta",async()=>{
    const calls=captureRequests();
    await expect(submitBooking({...booking,testAllergyScenario:true,personalization:{alergias:'dato-libre'}})).rejects.toThrow();
    await expect(submitBooking({...booking,testAllergyScenario:true})).rejects.toThrow();
    expect(calls.every(call=>call.url.includes('/catalog/services/'))).toBe(true);
  });
  test("comentario es opcional; vacío se omite, largo excesivo se rechaza sin red",async()=>{
    const calls=captureRequests();
    await expect(submitBooking({...booking,note:'x'.repeat(501)})).rejects.toThrow('500');
    expect(calls).toHaveLength(0);
    await submitBooking({...booking,note:'  ',startsAt:'2030-11-15T12:00:00-03:00'});
    const body=JSON.parse(String(calls[1].init.body));
    expect(body).not.toHaveProperty('note');expect(body).not.toHaveProperty('testCommentScenario');
  });
  test("comentario libre conserva saltos y caracteres, nunca entra a cotización, URL o caché",async()=>{
    const note='Ejemplo ficticio: conversar al llegar.\nPrefiero revisar el estilo <antes>.';
    const withNote={...booking,note};
    expect(quoteQueryOptions(withNote,detail).queryKey).toEqual(quoteQueryOptions(booking,detail).queryKey);
    expect(availabilityQueryOptions(withNote,detail).queryKey).toEqual(availabilityQueryOptions(booking,detail).queryKey);
    const calls=captureRequests();
    await quoteQueryOptions(withNote,detail).queryFn();await availabilityQueryOptions(withNote,detail).queryFn();
    for(const call of calls){expect(call.url).not.toContain(note);expect(String(call.init.body)).not.toContain('Ejemplo ficticio');}
    await submitBooking(withNote);
    const body=JSON.parse(String(calls[3].init.body));
    expect(body.note).toBe(note);expect(body.testCommentScenario).toBe(true);
  });
  test("identidad de intento usa SHA256 sin texto; comentario igual reusa clave y distinto cambia",async()=>{
    const calls=captureRequests();
    const digestSpy=spyOn(crypto.subtle,"digest");
    const mapSpy=spyOn(Map.prototype,"set");
    try {
      const first={...booking,note:'Caso ficticio uno para Sol',startsAt:'2030-11-18T12:00:00-03:00'};
      await submitBooking(first);await submitBooking(first);
      await submitBooking({...first,note:'Caso ficticio dos para Sol'});
      const creates=calls.filter(call=>call.url==='/api/v1/bookings');
      expect(creates).toHaveLength(2);
      const keys=creates.map(call=>new Headers(call.init.headers).get('X-Idempotency-Key'));
      expect(keys[0]).not.toBe(keys[1]);
      const intentSets=mapSpy.mock.calls.filter(([,value])=>value && typeof value==='object' && 'key' in value && keys.includes((value as {key:string}).key));
      expect(intentSets).toHaveLength(3);
      const signatures=intentSets.map(([key])=>key);
      for(const signature of signatures){expect(signature).toMatch(/^[a-f0-9]{64}$/);expect(signature).not.toContain('Caso ficticio');}
      expect(signatures[0]).toBe(signatures[1]);expect(signatures[0]).not.toBe(signatures[2]);
      expect(digestSpy).toHaveBeenCalledTimes(3);
      const rawBody=String(creates[0].init.body);
      const expected=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(rawBody))),byte=>byte.toString(16).padStart(2,'0')).join('');
      expect(signatures[0]).toBe(expected);
      expect(JSON.parse(rawBody).note).toBe(first.note);
    } finally {mapSpy.mockRestore();digestSpy.mockRestore();}
  });
  test("acepta datos ficticios distintos sin reemplazarlos ni exigir dominio especial",async()=>{
    const calls=captureRequests();
    for(const customer of [
      {firstName:'Inés Ejemplo',lastName:'Uno',phone:'+5493425550191',email:'ines@example.invalid'},
      {firstName:'Bruno Ejemplo',phone:'342 555 0192',email:'bruno@example.com'},
    ]) {
      await submitBooking({...booking,customer});
      const body=JSON.parse(String(calls.at(-1)!.init.body));
      expect(body.customer).toEqual({...customer,acceptsMarketing:false});
      expect(body.testCustomerScenario).toBe(true);
    }
    expect(calls.filter(call=>call.url==='/api/v1/bookings')).toHaveLength(2);
  });
  test("datos inválidos o demasiado largos se rechazan antes de la red",async()=>{
    const calls=captureRequests();
    for(const customer of [
      {...booking.customer,firstName:''},{...booking.customer,firstName:'x'.repeat(81)},
      {...booking.customer,phone:'123'},{...booking.customer,phone:'abcdefgh'},{...booking.customer,phone:'++++++'},
      {...booking.customer,email:'no-email'},
    ]) await expect(submitBooking({...booking,customer})).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });
  test("doble envío comparte alta, y error de red conserva clave para reintento", async () => {
    const keys:string[]=[];
    let fail=true;
    fetchSpy=spyOn(globalThis,"fetch").mockImplementation((async(url,init)=>{
      if(String(url).includes("/catalog/services/")) return Response.json({data:detail});
      keys.push(new Headers(init?.headers).get("X-Idempotency-Key")!);
      await new Promise(resolve=>setTimeout(resolve,5));
      if(fail) throw new Error("network");
      return Response.json({data:{publicToken:"b".repeat(32)}});
    }) as typeof fetch);
    const retryBooking={...booking,startsAt:"2030-11-13T12:00:00-03:00"};
    await Promise.allSettled([submitBooking(retryBooking),submitBooking(retryBooking)]);
    expect(keys).toHaveLength(1);
    fail=false;
    await submitBooking(retryBooking);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });
});
