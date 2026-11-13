import {SITE_TERMS_VERSION as TERMS_VERSION} from './contract';
import {describe,it,expect} from 'bun:test';
import {FIXTURE,ORIGIN,parseOperation,type Operation} from './contract';
import {operatingGateway} from './gateway';
import {canonicalOperationBody,publicTestBookingView,executeAuthenticated,executeOperation,isolatedEnv} from './backend';
import {DATABASE} from './contract';
const base={serviceSlug:'corte-fem',startsAt:'2026-12-01T12:00:00Z',customer:FIXTURE,testCustomerScenario:true,consent:{termsVersion:TERMS_VERSION}};
const {testCustomerScenario:_fixtureMarker,...canonicalBase}=base;
const op=(body:unknown):Operation=>({method:'POST',path:'/api/v1/bookings',operationId:'d17ba69b-28d0-426e-a201-9df8fb8bc477',body});
describe('explicit consented synthetic comment channel',()=>{
 it('preserves the exact comment, requires explicit marker and strips marker before canonical route',()=>{
  const note='  Escenario ficticio: conversar antes del servicio.\nSin datos reales.  ';
  const operation=parseOperation(op({...base,note,testCommentScenario:true}));
  expect(canonicalOperationBody(operation)).toEqual({...canonicalBase,note});
  expect(parseOperation(op({...base,note:'x'.repeat(500),testCommentScenario:true}))).toBeDefined();
  expect(parseOperation(op({...base,note:''}))).toBeDefined();
 });
 it('rejects unknown fields, missing/false marker, more than 500 characters and missing consent before egress',async()=>{
  const {consent,...unconsented}=base;
  const bad=[
   {...base,note:'synthetic'},
   {...base,note:'synthetic',testCommentScenario:false},
   {...base,note:'x'.repeat(501),testCommentScenario:true},
   {...base,note:'synthetic',testCommentScenario:true,unknown:'secret'},
   {...base,note:'synthetic',testCommentScenario:true,personalization:{comentario:'hidden'}},
   {...base,note:'synthetic',testCommentScenario:true,services:[{serviceSlug:'corte-fem',note:'hidden'}]},
   {...unconsented,note:'synthetic',testCommentScenario:true},
   {...base,consent:{termsVersion:'obsolete'},note:'synthetic',testCommentScenario:true},
  ];
  let calls=0;const transport=(async()=>{calls++;return Response.json({});}) as unknown as typeof fetch;
  for(const body of bad){
   expect(()=>parseOperation(op(body))).toThrow();
   const request=new Request(ORIGIN+'/api/v1/bookings',{method:'POST',headers:{origin:ORIGIN,'Content-Type':'application/json','oai-authenticated-user-id':'test-owner','X-Idempotency-Key':op(body).operationId!},body:JSON.stringify(body)});
   expect((await operatingGateway(request,{SITE_TEST_OWNER_SUB:'test-owner',SITE_TEST_SIGNING_PRIVATE_JWK:'must-not-be-used'},transport)).status).toBe(400);
  }
  expect(calls).toBe(0);
 });
 it('does not open any other route for comments or its marker',()=>{
  for(const path of ['/api/v1/quote','/api/v1/availability','/api/v1/admin/bookings']){
   const body=path.endsWith('availability')?{service:'corte-fem'}:path.endsWith('quote')?{serviceSlug:'corte-fem'}:{...base};
   for(const extra of [{note:'synthetic'},{testCommentScenario:true},{note:'synthetic',testCommentScenario:true}])expect(()=>parseOperation({...op({...body,...extra}),path,...(path.endsWith('/bookings')?{}:{operationId:undefined})})).toThrow();
  }
  expect(()=>parseOperation({method:'GET',path:'/api/v1/bookings/'+'a'.repeat(32)+'?note=secret'})).toThrow();
 });
 it('keeps the allergy and comment opt-ins independent',()=>{
  expect(()=>parseOperation(op({...base,note:'synthetic',testAllergyScenario:true}))).toThrow();
  expect(()=>parseOperation(op({...base,testCommentScenario:true,personalization:{alergias:'no'}}))).toThrow();
  const operation=parseOperation(op({...base,note:'synthetic',testCommentScenario:true,testAllergyScenario:true,personalization:{alergias:'no'}}));
  expect(canonicalOperationBody(operation)).toEqual({...canonicalBase,note:'synthetic',personalization:{alergias:'no'}});
 });
 it('public token status projection has no comment, allergy or future contextual fields',()=>{
  const view={publicToken:'a'.repeat(32),status:'pending_payment',startsAt:base.startsAt,endsAt:'2026-12-01T13:00:00Z',shownDurationMin:60,priceDisplayMode:'fixed',priceEstimatedMin:100,depositAmount:20,depositRateApplied:20,paymentRequiredUntil:null,refundDue:null,customerNote:'PRIVATE_COMMENT',area:'peluqueria',customer:{firstName:FIXTURE.firstName,lastName:FIXTURE.lastName,allergy:'PRIVATE_CONTEXT'},items:[{role:'main',name:'Corte',priceAmount:100,lengthTier:'corto',durationMin:60,personalization:{alergias:'si-leves'},metadata:'PRIVATE_CONTEXT'}],allergyScenarios:['PRIVATE_CONTEXT']};
  const result=publicTestBookingView(view);
  expect(result.customerNote).toBeNull();
  expect(JSON.stringify(result)).not.toContain('PRIVATE_');
  expect(JSON.stringify(result)).not.toContain('alergias');
  expect(result.items[0].name).toBe('Corte');
 });
 it('actual public booking handler suppresses private fields after canonical read',async()=>{
  const env=isolatedEnv(k=>({SUPABASE_URL:DATABASE,SUPABASE_SECRET_KEYS:'{"default":"sb_secret_test"}',SUPABASE_PUBLISHABLE_KEYS:'{"default":"sb_publishable_test"}'}[k]));
  const transport=(async(input:Request|URL|string)=>{
   const url=new URL((input as Request).url);
   if(url.pathname.endsWith('/site_operating_consume_nonce')) return Response.json(true);
   if(url.pathname.endsWith('/expire_stale_bookings')) return Response.json(0);
   if(url.pathname==='/rest/v1/bookings') return Response.json({public_token:'a'.repeat(32),status:'pending_payment',starts_at:base.startsAt,ends_at:'2026-12-01T13:00:00Z',shown_duration_min:60,price_display_mode:'fixed',price_estimated_min:100,deposit_amount:20,deposit_rate_applied:20,payment_required_until:null,refund_due:null,customer_note:'PRIVATE_COMMENT',areas:{slug:'peluqueria'},customers:{first_name:FIXTURE.firstName,last_name:FIXTURE.lastName},booking_items:[{role:'main',snapshot_name:'Corte',snapshot_price_amount:100,snapshot_length_tier:'corto',snapshot_duration_min:60,sort_order:0,metadata:{personalization:{alergias:'si-leves'}}}]});
   throw new Error('Unexpected test-only database request');
  }) as unknown as typeof fetch;
  const response=await executeAuthenticated(env,{method:'GET',path:'/api/v1/bookings/'+'a'.repeat(32)},'a'.repeat(64),crypto.randomUUID(),Math.floor(Date.now()/1000)+60,transport);
  expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toBe('no-store');
  const text=await response.text();expect(text).not.toContain('PRIVATE_COMMENT');expect(text).not.toContain('si-leves');expect(JSON.parse(text).data.customerNote).toBeNull();
  for(const suffix of ['?','?&','?&&','?note=secret','?unknown=1']) {
   await expect(executeOperation(env,{method:'GET',path:'/api/v1/bookings/'+'a'.repeat(32)+suffix},'a'.repeat(64))).rejects.toThrow('INVALID_OPERATION');
  }

 });

 it('gateway rejects empty and unknown query suffixes before any transport',async()=>{
  let calls=0;const transport=(async()=>{calls++;return Response.json({data:{customerNote:'PRIVATE_COMMENT'}});}) as unknown as typeof fetch;
  const env={SITE_TEST_OWNER_SUB:'test-owner',SITE_TEST_SIGNING_PRIVATE_JWK:'never-used'};
  for(const suffix of ['?','?&','?&&','?note=secret','?unknown=1']) {
   const request=new Request(ORIGIN+'/api/v1/bookings/'+'a'.repeat(32)+suffix,{headers:{'oai-authenticated-user-id':'test-owner'}});
   const response=await operatingGateway(request,env,transport);
   expect(response.status).toBe(400);expect(await response.text()).not.toContain('PRIVATE_COMMENT');
  }
  expect(calls).toBe(0);
 });

});
