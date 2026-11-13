/** Canonical Sol Mai engine, confined to the isolated Site database. */
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createMiddleware } from 'hono/factory';
import type { ServerEnv } from '../src/config/env';
import type { StaffVars, StaffIdentity } from '../src/http/middleware/staffAuth';
import { createAdminRoute } from '../src/http/routes/admin';
import { createCatalogRoute } from '../src/http/routes/catalog';
import { createQuoteRoute } from '../src/http/routes/quote';
import { createAvailabilityRoute } from '../src/http/routes/availability';
import { createBookingsRoute } from '../src/http/routes/bookings';
import { createSupabaseAdminClient, createSupabaseAnonClient } from '../src/lib/supabase';
import { bindSupabaseTransport } from '../src/lib/supabase/transport';
import { expireStaleBookings, type BookingView } from '../src/lib/booking/repository';
import { createCatalogRepository } from '../src/lib/catalog/repository';
import type {PersonalizationFieldDTO} from '../src/lib/catalog/dto';
import { DATABASE, ORIGIN, OWNER_EMAIL, SITE_TERMS_VERSION, TEST_ALLERGY_OPTIONS, OperatingError, parseOperation, type Operation } from './contract';

export function isolatedEnv(get: (name: string) => string | undefined): ServerEnv {
  if (get('SUPABASE_URL') !== DATABASE) throw new OperatingError(503, 'WRONG_TEST_PROJECT');
  const secret = get('SUPABASE_SECRET_KEYS');
  const publishable = get('SUPABASE_PUBLISHABLE_KEYS');
  const key: unknown = secret ? JSON.parse(secret).default : get('SUPABASE_SERVICE_ROLE_KEY');
  const anon: unknown = publishable ? JSON.parse(publishable).default : get('SUPABASE_ANON_KEY');
  if (typeof key !== 'string' || !key || typeof anon !== 'string' || !anon) throw new OperatingError(503, 'BACKEND_UNCONFIGURED');
  return { TEAM_SCOPE_ENABLED: false, NODE_ENV: 'test', APP_ENV: 'staging', API_BASE_URL: ORIGIN + '/api/v1', PUBLIC_WEB_BASE_URL: ORIGIN,
    SUPABASE_URL: DATABASE, SUPABASE_SECRET_KEY: key, SUPABASE_PUBLISHABLE_KEY: anon,
    INTERNAL_AUTH_JWT_AUDIENCE: 'site-isolated-unused', INTERNAL_AUTH_ALLOWED_EMAILS: [OWNER_EMAIL],
    INTERNAL_AUTH_ALLOWED_PROVIDERS: [], ANTHROPIC_MODEL: 'disabled' };
}

/** Every SDK call, including nonce consumption, uses this before any privileged request. */
export function databaseTransport(operation: Operation, bodyHash: string, transport: typeof fetch = fetch): typeof fetch {
  return (async (input: string | Request | URL, init?: RequestInit) => {
    const request = input instanceof Request ? new Request(input, init) : new Request(String(input), init);
    const url = new URL(request.url);
    if (url.origin !== DATABASE || url.username || url.password || url.hash || !/^\/rest\/v1\/(?:[a-z_]+|rpc\/[a-z_]+)$/.test(url.pathname)) throw new OperatingError(503, 'DATABASE_BOUNDARY');
    const kind = url.pathname.slice('/rest/v1/rpc/'.length);
    let outgoing = request;
    if (request.method === 'POST' && ['create_booking','create_online_booking'].includes(kind)) {
      if (!operation.operationId || operation.method !== 'POST' || !['/api/v1/bookings','/api/v1/admin/bookings'].includes(operation.path)) throw new OperatingError(400, 'OPERATION_REQUIRED');
      const args: unknown = await request.json();
      outgoing = new Request(DATABASE + '/rest/v1/rpc/site_operating_create', { method: 'POST', headers: request.headers,
        body: JSON.stringify({ p_operation_id: operation.operationId, p_request_hash: bodyHash, p_kind: kind, p_args: args }) });
    }
    const response = await transport(outgoing, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    if (response.status >= 300 && response.status < 400) throw new OperatingError(503, 'DATABASE_REDIRECT');
    return response;
  }) as typeof fetch;
}

function fixtureStaff(env: ServerEnv) {
  return createMiddleware<{ Variables: StaffVars }>(async (c, next) => {
    const {data,error} = await createSupabaseAdminClient(env).rpc('resolve_staff_session', {p_email:OWNER_EMAIL});
    const row = data?.[0];
    if (error || !row || row.role !== 'owner') throw new HTTPException(503);
    const staff: StaffIdentity = { email:OWNER_EMAIL,staffId:row.staff_id,displayName:row.display_name,role:row.role,roleName:row.role_name,agendaScope:"all",attentionEnabled:false,permisos:row.permisos??{} };
    c.set('staff',staff); await next();
  });
}

async function replay(env: ServerEnv, operation: Operation, hash: string): Promise<Response | null> {
  if (!operation.operationId) return null;
  const {data,error} = await createSupabaseAdminClient(env).from('site_operating_creates').select('request_hash,api_response').eq('operation_id',operation.operationId).maybeSingle();
  if (error) throw new OperatingError(503,'IDEMPOTENCY_UNAVAILABLE');
  if (!data) return null;
  if (data.request_hash !== hash) throw new OperatingError(409,'IDEMPOTENCY_MISMATCH');
  return Response.json(data.api_response,{status:201,headers:{'Cache-Control':'no-store'}});
}

/** Only the explicit synthetic allergy scenario may cross this test boundary. */
export function isTestAllergyField(field: PersonalizationFieldDTO): boolean {
  return field.slug==='alergias' && field.fieldRole==='context' && field.fieldType==='single_choice' && field.decision==='contextual';
}
export function filterTestPersonalization(fields: PersonalizationFieldDTO[], detail = false): PersonalizationFieldDTO[] {
  return fields.flatMap(field=>{
    if(isTestAllergyField(field)) return [{...field,isRequired:false,options:field.options.filter(o=>TEST_ALLERGY_OPTIONS.some(allowed=>allowed===o.slug))}];
    if(field.slug==='alergias'||field.fieldRole==='context'||field.fieldType==='text'||(detail&&field.decision!=='operational')) return [];
    return [field];
  });
}
export function validateTestAnswers(operation: Operation, fields: PersonalizationFieldDTO[], answers: Record<string,unknown>): void {
  const body=operation.body as Record<string,unknown>|undefined;
  const allowAllergy=operation.method==='POST'&&operation.path==='/api/v1/bookings'&&body?.testAllergyScenario===true;
  for(const [key,value] of Object.entries(answers)) {
    const field=fields.find(f=>f.slug===key && (key==='alergias' ? allowAllergy&&isTestAllergyField(f)&&TEST_ALLERGY_OPTIONS.some(v=>v===value) : f.fieldRole==='modifier'&&f.decision==='operational'));
    if(!field?.options.some(o=>o.slug===value)) throw new OperatingError(400,'OPTION_NOT_ALLOWED');
  }
}
/** The scenario marker is gateway metadata, never canonical booking content. */
export function canonicalOperationBody(operation: Operation): unknown {
  if(!['/api/v1/bookings','/api/v1/admin/bookings'].includes(operation.path)||operation.method!=='POST'||!operation.body) return operation.body;
  const {testAllergyScenario: _marker,testCommentScenario: _commentMarker,testCustomerScenario: _customerMarker,...body}=operation.body as Record<string,unknown>;
  return body;
}

/** Public-token status pages never expose the private discussion with the team.
 * Explicit projection also prevents future contextual DTO additions leaking here. */
export function publicTestBookingView(view: BookingView): BookingView {
  return {
    publicToken:view.publicToken,status:view.status,startsAt:view.startsAt,endsAt:view.endsAt,
    shownDurationMin:view.shownDurationMin,priceDisplayMode:view.priceDisplayMode,
    priceEstimatedMin:view.priceEstimatedMin,depositAmount:view.depositAmount,
    depositRateApplied:view.depositRateApplied,paymentRequiredUntil:view.paymentRequiredUntil,
    refundDue:view.refundDue,customerNote:null,area:view.area,
    customer:{firstName:view.customer.firstName,lastName:view.customer.lastName},
    items:view.items.map(i=>({role:i.role,name:i.name,priceAmount:i.priceAmount,lengthTier:i.lengthTier,durationMin:i.durationMin})),
  };
}

async function validatePersonalization(env: ServerEnv, operation: Operation) {
  if (!operation.body || !['/api/v1/quote','/api/v1/availability','/api/v1/bookings','/api/v1/admin/bookings'].includes(operation.path)) return;
  const body = operation.body as Record<string,any>;
  const parts = operation.path.endsWith('/availability') ? String(body.service).split(',').map((serviceSlug,i)=>({serviceSlug,personalization:i===0?body.personalization:undefined})) : body.services??[{serviceSlug:body.serviceSlug,personalization:body.personalization}];
  const catalog = createCatalogRepository(createSupabaseAnonClient(env));
  for (const part of parts) {
    if (!Object.keys(part.personalization??{}).length) continue;
    const detail = await catalog.getServiceDetail(part.serviceSlug);
    if (!detail) throw new OperatingError(404,'SERVICE_NOT_FOUND');
    validateTestAnswers(operation,detail.personalization,part.personalization??{});
  }
}

/** IDs originate from selected database rows, not from an authorization claim.
 * Missing ledger, unknown IDs or query errors never grant context access. */
export async function trustedTestBookingIds(env: ServerEnv, bookingIds: readonly string[]): Promise<ReadonlySet<string>> {
  if(env.SUPABASE_URL!==DATABASE) throw new OperatingError(503,'WRONG_TEST_PROJECT');
  const ids=[...new Set(bookingIds)];
  const trusted=new Set<string>();
  const admin=createSupabaseAdminClient(env);
  for(let offset=0;offset<ids.length;offset+=100) {
    const batch=ids.slice(offset,offset+100);
    const {data,error}=await admin.from('site_operating_creates').select('booking_id').in('booking_id',batch);
    if(error) throw new OperatingError(503,'PROVENANCE_UNAVAILABLE');
    for(const row of data??[]) if(typeof row.booking_id==='string'&&batch.includes(row.booking_id)) trusted.add(row.booking_id);
  }
  return trusted;
}

export async function executeOperation(env: ServerEnv, raw: Operation, hash: string): Promise<Response> {
  if (env.SUPABASE_URL !== DATABASE || env.MERCADO_PAGO_ACCESS_TOKEN || env.EMAIL_PROVIDER_API_KEY || env.WHATSAPP_PROVIDER_TOKEN || env.ANTHROPIC_API_KEY) throw new OperatingError(503,'ISOLATION_REQUIRED');
  const operation = parseOperation(raw);
  const previous = await replay(env,operation,hash); if (previous) return previous;
  await validatePersonalization(env,operation);
  const app = new Hono();
  app.onError((error,c)=> {
    const status = error instanceof HTTPException ? error.status : 503;
    return c.json({error:{message: status<500 && error instanceof HTTPException ? error.message : 'La base de prueba no está disponible. Reintentá sin cambiar las opciones.',status}},status);
  });
  app.use('*',async(c,next)=>{c.header('Cache-Control','no-store');await next();});
  app.get('/api/v1/health',c=>c.json({data:{mode:'isolated-canonical-agenda',productionConnected:false,payments:false,notifications:false}}));
  app.route('/api/v1/catalog',createCatalogRoute(env,{termsVersion:SITE_TERMS_VERSION}));
  app.route('/api/v1/quote',createQuoteRoute(env));
  app.route('/api/v1/availability',createAvailabilityRoute(env));
  app.route('/api/v1/bookings',createBookingsRoute(env,{termsVersion:SITE_TERMS_VERSION}));
  app.route('/api/v1/admin',createAdminRoute(env,{authenticate:fixtureStaff(env),context:{mode:'site',resolveTrusted:ids=>trustedTestBookingIds(env,ids)}}));
  if (/\/(availability|bookings|admin\/agenda)/.test(operation.path)) await expireStaleBookings(createSupabaseAdminClient(env));
  const response = await app.request(ORIGIN+operation.path, {method:operation.method, ...(operation.body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(canonicalOperationBody(operation))})});
  // A concurrent retry may have committed while validation was underway.
  const saved = await replay(env,operation,hash); if(saved) return saved;
  if (operation.method==='GET' && /^\/api\/v1\/bookings\/[a-f0-9]{32}$/.test(new URL(operation.path,ORIGIN).pathname) && response.ok) {
    const payload=await response.json() as {data:BookingView};
    return Response.json({data:publicTestBookingView(payload.data)},{headers:{'Cache-Control':'no-store'}});
  }
  if (operation.path.startsWith('/api/v1/catalog/') && response.ok) {
    const payload = await response.json() as any;
    if (operation.path.split('?')[0].endsWith('/personalization')) payload.data=filterTestPersonalization(payload.data);
    if (payload.data?.personalization) payload.data.personalization=filterTestPersonalization(payload.data.personalization,true);
    return Response.json(payload,{headers:{'Cache-Control':'no-store'}});
  }
  return response;
}

export async function executeAuthenticated(env: ServerEnv, operation: Operation, bodyHash: string, nonce: string, expiresAt: number, transport: typeof fetch = fetch) {
  bindSupabaseTransport(env,databaseTransport(operation,bodyHash,transport));
  const {data,error}=await createSupabaseAdminClient(env).rpc('site_operating_consume_nonce',{p_nonce:nonce,p_expires_at:new Date(expiresAt*1000).toISOString()});
  if(error) throw new OperatingError(503,'NONCE_UNAVAILABLE');
  if(data!==true) throw new OperatingError(409,'REPLAY_REJECTED');
  return executeOperation(env,operation,bodyHash);
}
