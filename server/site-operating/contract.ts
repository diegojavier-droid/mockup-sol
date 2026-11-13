/** Narrow test-only API contract. Validate BEFORE crossing the Site boundary. */
import { z } from 'zod';
export const SITE_TERMS_VERSION = '2026-11-12-site';
import { normalizePhoneAr } from '../src/domain/phone';
export const ORIGIN = 'https://sol-mai-prueba-privada.zimeria.chatgpt.site';
export const DATABASE = 'https://ijzpmwwjuvsgcsbcbzav.supabase.co';
export const FUNCTION_PATH = '/functions/v1/sol-mai-site-operating';
export const AUDIENCE = DATABASE + FUNCTION_PATH;
export const OWNER_EMAIL = 'site-owner@example.invalid';
export const MAX_BYTES = 16384;
export const FIXTURE = {firstName:'Clienta de prueba',lastName:'Site',phone:'+5493425550101',email:'clienta@example.invalid',acceptsMarketing:false} as const;
export class OperatingError extends Error { constructor(public status: number, public code: string) { super(code); } }
const slug = z.string().min(1).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const length = z.enum(['corto','medio','largo','xl','unico']);
const amount = z.number().int().min(0).max(100000000);
const empty = z.literal('').optional();
// This frozen test boundary intentionally fails closed if new modifiers are added.
// The canonical backend still validates each option against its service catalogue.
export const personalizationSchema = z.object({
  decoracion:z.enum(['dos-unas','sin-deco','todas']).optional(),
  densidad:z.enum(['abundante','fina','media']).optional(),
  tipo:z.enum(['crespo','liso','ondulado','rizado']).optional(),
}).strict();
const part = z.object({serviceSlug:slug,lengthTier:length.nullish(),personalization:personalizationSchema.optional()}).strict();
const pricing = z.object({serviceSlug:slug.optional(),lengthTier:length.nullish(),personalization:personalizationSchema.optional(),extraCodes:z.array(slug).max(10).optional(),services:z.array(part).min(1).max(4).optional()}).strict();
// Owner attests these are invented contacts; syntax cannot prove fiction.
const name = z.string().max(80).regex(/^[^\u0000-\u001f\u007f]*$/u);
const customer = z.object({firstName:name.min(1).refine(v=>v.trim().length>0),lastName:name.optional(),phone:z.string().min(6).max(30).regex(/^[+0-9(). -]+$/).refine(v=>/^\+[1-9][0-9]{6,14}$/.test(normalizePhoneAr(v)??'')),email:z.string().email().max(160),acceptsMarketing:z.literal(false).optional()}).strict();
const booking = pricing.extend({startsAt:z.string().datetime({offset:true}),customer,testCustomerScenario:z.literal(true),note:empty}).strict();
export const TEST_ALLERGY_OPTIONS = ['no','si-leves','si-importantes'] as const;
const testAnswers = personalizationSchema.extend({alergias:z.enum(TEST_ALLERGY_OPTIONS).optional()}).strict();
const testPart = part.extend({personalization:testAnswers.optional()}).strict();
const webBooking = booking.extend({
 personalization:testAnswers.optional(),services:z.array(testPart).min(1).max(4).optional(),
 testAllergyScenario:z.literal(true).optional(),
 note:z.string().max(500).optional(),testCommentScenario:z.literal(true).optional(),
 consent:z.object({termsVersion:z.literal(SITE_TERMS_VERSION)}).strict(),
}).strict().refine(v=>v.testAllergyScenario===true || (v.personalization?.alergias===undefined && !v.services?.some(p=>p.personalization?.alergias!==undefined))).refine(v=>v.testCommentScenario===true || !v.note);

const adminBooking = booking.extend({source:z.enum(['manual','phone','whatsapp','walk_in']).optional(),override:z.boolean().optional(),overrideReason:z.literal('Prueba de sobreturno').optional()}).strict().refine(v=>!v.override || !!v.overrideReason);
const close = z.object({finalPrice:amount,servicesDone:z.literal('Atención de prueba').optional(),staffId:z.string().uuid().nullish(),durationMin:z.number().int().min(1).max(1440).nullish(),formula:empty,costAmount:amount.nullish(),observation:empty,payments:z.array(z.object({amount:amount.refine(v=>v>0),method:z.enum(['efectivo','transferencia','mercado_pago','otro']),kind:z.enum(['deposit','balance','adjustment']).optional(),note:empty}).strict()).max(10).optional()}).strict();
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const dbTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/);
const hours = z.object({opensAt:time.optional(),closesAt:time.optional(),isActive:z.boolean().optional(),expected:z.object({opensAt:dbTime,closesAt:dbTime,isActive:z.boolean()}).strict().optional()}).strict().refine(v=>v.opensAt!==undefined||v.closesAt!==undefined||v.isActive!==undefined);
const tier = z.object({priceMain:amount.optional(),durationMainMin:z.number().int().min(1).max(1440).optional(),processMin:z.number().int().min(0).max(1440).optional()}).strict().refine(v=>Object.keys(v).length>0);
const uuid = '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}';
const slugRx = '[a-z0-9]+(?:-[a-z0-9]+)*';
const reads = [
 /^\/api\/v1\/health$/,
 /^\/api\/v1\/catalog\/(salon|categories|services|extras|personalization)$/,
 new RegExp(`^/api/v1/catalog/services/${slugRx}$`),
 /^\/api\/v1\/bookings\/[a-f0-9]{32}$/,
 /^\/api\/v1\/admin\/(me|agenda|agenda\/resumen|stations|capacity|customers|schedule-exceptions|staff|roles|audit|audit\/actors|salon\/services|salon\/asistente|salon\/products|salon\/catalog|salon\/categories|salon\/promotions|cash-register|dashboard|reconciliation|settings|pending-values|business-hours|areas|refunds-pending|pending-links|invoicing\/pending|invoicing\/summary)$/,
 new RegExp(`^/api/v1/admin/(bookings|customers)/${uuid}$`),
 new RegExp(`^/api/v1/admin/services/${slugRx}/tiers$`),
];
const writes: Array<[string,RegExp,z.ZodTypeAny]> = [
 ['POST',/^\/api\/v1\/quote$/,pricing],
 ['POST',/^\/api\/v1\/availability$/,z.object({service:z.string().max(260).regex(/^[a-z0-9-]+(?:,[a-z0-9-]+){0,3}$/),length:z.string().regex(/^(corto|medio|largo|xl|unico)(,(corto|medio|largo|xl|unico)){0,3}$/).optional(),extras:z.string().max(256).regex(/^[a-z0-9,-]*$/).optional(),from:z.string().datetime().optional(),days:z.number().int().min(1).max(60).optional(),personalization:personalizationSchema.optional()}).strict()],
 ['POST',/^\/api\/v1\/bookings$/,webBooking],
 ['POST',/^\/api\/v1\/bookings\/[a-f0-9]{32}\/cancel$/,z.object({reason:empty}).strict()],
 ['POST',/^\/api\/v1\/admin\/bookings$/,adminBooking],
 ['PATCH',new RegExp(`^/api/v1/admin/bookings/${uuid}/status$`),z.object({status:z.enum(['confirmed','attended','cancelled','expired']),depositOutcome:z.enum(['refund','retain']).nullish()}).strict()],
 ['POST',new RegExp(`^/api/v1/admin/bookings/${uuid}/no-show$`),z.object({}).strict()],
 ['POST',new RegExp(`^/api/v1/admin/bookings/${uuid}/close$`),close],
 ['POST',new RegExp(`^/api/v1/admin/bookings/${uuid}/station$`),z.object({stationId:z.string().uuid().nullable()}).strict()],
 ['PATCH',new RegExp(`^/api/v1/admin/business-hours/${uuid}$`),hours],
 ['PATCH',new RegExp(`^/api/v1/admin/services/${slugRx}/tiers/(corto|medio|largo|xl|unico)$`),tier],
 ['POST',new RegExp(`^/api/v1/admin/salon/services/${slugRx}/price$`),z.object({lengthTier:length,priceMain:amount.refine(v=>v>0),durationMin:z.number().int().min(1).max(600)}).strict()],
];
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const instant = z.string().datetime({offset:true});
const integer = (max:number) => z.string().regex(/^[1-9]\d*$/).refine(v=>Number(v)<=max);
const noQuery = z.object({}).strict();
// Query keys are endpoint-specific. A catalogue or audit URL is not a channel
// for arbitrary user text, and ignored parameters must not leave the Site.
const readQueries: Record<string,z.ZodTypeAny> = {
 '/api/v1/catalog/services':z.object({category:slug.optional()}).strict(),
 '/api/v1/catalog/extras':z.object({category:slug.optional()}).strict(),
 '/api/v1/catalog/personalization':z.object({category:slug.optional()}).strict(),
 '/api/v1/admin/agenda':z.object({date:date.optional(),days:integer(31).optional(),area:slug.max(32).optional()}).strict(),
 '/api/v1/admin/agenda/resumen':z.object({desde:date,hasta:date,area:slug.max(32).optional()}).strict(),
 '/api/v1/admin/stations':z.object({area:slug.optional(),at:instant.optional()}).strict(),
 '/api/v1/admin/capacity':z.object({area:slug,startsAt:instant,endsAt:instant}).strict(),
 '/api/v1/admin/customers':z.object({q:z.enum(['','Clienta','Clienta de prueba']).optional()}).strict(),
 '/api/v1/admin/audit':z.object({desde:instant.optional(),hasta:instant.optional(),actorId:z.string().uuid().optional(),entityType:z.enum(['booking','customer','staff_member','service','product','resource']).optional(),cursor:integer(Number.MAX_SAFE_INTEGER).optional(),limit:integer(200).optional()}).strict(),
 '/api/v1/admin/cash-register':z.object({day:date.optional()}).strict(),
 '/api/v1/admin/dashboard':z.object({from:date,to:date}).strict(),
 '/api/v1/admin/reconciliation':z.object({from:date,to:date,format:z.literal('json').optional()}).strict(),
 '/api/v1/admin/invoicing/pending':z.object({from:date.optional(),to:date.optional()}).strict(),
 '/api/v1/admin/invoicing/summary':z.object({year:z.string().regex(/^\d{4}$/).optional()}).strict(),
};
const envelope = z.object({method:z.enum(['GET','POST','PATCH']),path:z.string().min(1).max(1500),body:z.unknown().optional(),operationId:z.string().uuid().optional()}).strict();
export type Operation = z.infer<typeof envelope>;
export function isCreate(operation: Operation) {return operation.method==='POST' && ['/api/v1/bookings','/api/v1/admin/bookings'].includes(operation.path);}
export function parseOperation(raw: unknown): Operation {
 try {
  const op = envelope.parse(raw);
  if(!op.path.startsWith('/api/v1/') || /[\\#\s]/.test(op.path)) throw new Error();
  const url = new URL(op.path,ORIGIN);
  if(url.origin!==ORIGIN || url.pathname.includes('%') || url.pathname !== op.path.split('?')[0]) throw new Error();
  const seen = new Set<string>();
  for (const [key] of url.searchParams) {
   if(seen.has(key)) throw new Error(); seen.add(key);
  }
  if(op.method==='GET') {
   if(op.body!==undefined || op.operationId!==undefined || !reads.some(r=>r.test(url.pathname))) throw new Error();
   if(!Object.hasOwn(readQueries,url.pathname)&&op.path.includes('?')) throw new Error();
   (readQueries[url.pathname] ?? noQuery).parse(Object.fromEntries(url.searchParams));
  } else {
   if(url.search) throw new Error();
   const match=writes.find(([method,path])=>method===op.method&&path.test(url.pathname));
   if(!match) throw new Error();
   op.body=match[2].parse(op.body);
   if(isCreate(op) && !op.operationId) throw new Error();
   if(!isCreate(op) && op.operationId!==undefined) throw new Error();
  }
  return op;
 } catch { throw new OperatingError(400,'INVALID_OPERATION'); }
}
