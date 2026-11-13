import {SITE_TERMS_VERSION as TERMS_VERSION} from './contract';
import {describe,it,expect,beforeAll} from 'bun:test';
import {sign,decode} from 'hono/jwt';
import {AUDIENCE,ORIGIN,FUNCTION_PATH,FIXTURE,MAX_BYTES,OperatingError,parseOperation,type Operation} from './contract';
import {signOperation,authenticateOperation,sha256,readBounded,type SigningEnv} from './auth';
import {operatingGateway} from './gateway';
let env:SigningEnv,key:Record<string,unknown>,privateKey:Parameters<typeof sign>[1],actor:string;
const subject='unit-test-owner';
const id='d17ba69b-28d0-426e-a201-9df8fb8bc477';
const token='a'.repeat(32);
const booking={serviceSlug:'corte-fem',lengthTier:'corto',personalization:{tipo:'liso'},extraCodes:[],startsAt:'2026-12-01T12:00:00.000Z',customer:FIXTURE,testCustomerScenario:true,consent:{termsVersion:TERMS_VERSION}};
const create=():Operation=>({method:'POST',path:'/api/v1/bookings',body:booking,operationId:id});
const goodHeaders={'oai-authenticated-user-id':subject,origin:ORIGIN,'Content-Type':'application/json','X-Idempotency-Key':id};
const req=(body:unknown,headers:Record<string,string>=goodHeaders,path='/api/v1/bookings',method='POST')=>new Request(ORIGIN+path,{method,headers,...(method!=='GET'?{body:JSON.stringify(body)}:{})});
beforeAll(async()=>{
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 key={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test-key',alg:'ES256',use:'sig'};
 const privateJwk={...await crypto.subtle.exportKey('jwk',pair.privateKey),kid:'test-key',alg:'ES256',use:'sig'};
 privateKey=privateJwk;
 env={SITE_TEST_OWNER_SUB:subject,SITE_TEST_SIGNING_PRIVATE_JWK:JSON.stringify(privateKey)};
 actor=await sha256(subject);
});
describe('strict Site test contract',()=>{
 it('accepts canonical web and internal fixtures with stable create keys',()=>{
  expect(parseOperation(create()).body).toEqual(booking);
  const {consent,...internal}=booking;
  expect(parseOperation({...create(),path:'/api/v1/admin/bookings',body:{...internal,source:'manual',override:true,overrideReason:'Prueba de sobreturno'}}).method).toBe('POST');
  expect(()=>parseOperation({...create(),operationId:undefined})).toThrow();
 });
 it('rejects unknown fields recursively, real contacts and all context answers',()=>{
  const bodies=[{...booking,diagnostico:'secret'}, {...booking,note:'secret'}, {...booking,customer:{...FIXTURE,firstName:''}}, {...booking,customer:{...FIXTURE,diagnostico:'secret'}}, {...booking,personalization:{enfermedad:'diabetes'}}, {...booking,personalization:{alergias:'si'}}, {...booking,personalization:{tipo:'secret'}}, {...booking,services:[{serviceSlug:'corte-fem',diagnostico:'secret'}]}];
  for(const body of bodies)expect(()=>parseOperation({...create(),body})).toThrow();
  expect(()=>parseOperation({...create(),extra:'secret'})).toThrow();
 });
 it('rejects over four service parts without changing the canonical same-area rule',()=>{
  expect(()=>parseOperation({...create(),body:{...booking,services:Array(5).fill({serviceSlug:'corte-fem'})}})).toThrow();
  expect(parseOperation({...create(),body:{...booking,services:Array(4).fill({serviceSlug:'corte-fem'})}})).toBeDefined();
 });
 it('has no mutation escape for payment, staff, AI, refunds, notes or invoices',()=>{
  for(const path of ['/payments/checkout/x','/payments/webhook','/auth/login','/admin/staff','/admin/roles',`/admin/bookings/${id}/attention/start`,`/admin/bookings/${id}/attention/finish`,`/admin/customers/${id}/notes`,'/admin/salon/price-assist',`/admin/bookings/${id}/refund-done`,`/admin/bookings/${id}/invoiced`,`/admin/bookings/${id}/no-show/revert`]){
   expect(()=>parseOperation({method:'POST',path:'/api/v1'+path,body:{}})).toThrow();
  }
  for(const method of ['PUT','DELETE','OPTIONS','HEAD'])expect(()=>parseOperation({method,path:'/api/v1/admin/bookings',body:{}})).toThrow();
 });
 it('accepts every permitted operational shape and rejects private closure text',()=>{
  for(const [method,path,body] of [
   ['POST','/quote',{serviceSlug:'corte-fem',personalization:{densidad:'abundante'}}],
   ['POST','/availability',{service:'corte-fem',length:'corto',days:21,personalization:{tipo:'liso'}}],
   ['POST',`/bookings/${token}/cancel`,{}],
   ['PATCH',`/admin/bookings/${id}/status`,{status:'attended'}],
   ['POST',`/admin/bookings/${id}/no-show`,{}],
   ['POST',`/admin/bookings/${id}/station`,{stationId:null}],
   ['POST',`/admin/bookings/${id}/close`,{finalPrice:1000,servicesDone:'Atención de prueba',payments:[{amount:1000,method:'efectivo'}]}],
   ['PATCH',`/admin/business-hours/${id}`,{isActive:false,expected:{opensAt:'09:00:00',closesAt:'18:00:00',isActive:true}}],
   ['PATCH','/admin/services/corte-fem/tiers/corto',{priceMain:1000}],
   ['POST','/admin/salon/services/corte-fem/price',{lengthTier:'corto',priceMain:1000,durationMin:30}],
  ] as const)expect(parseOperation({method,path:'/api/v1'+path,body})).toBeDefined();
  for(const body of [{finalPrice:0,formula:'health secret'},{finalPrice:0,payments:[{amount:1,method:'efectivo',note:'secret'}]},{finalPrice:0,payments:[{amount:1,method:'efectivo',unknown:'secret'}]}])expect(()=>parseOperation({method:'POST',path:`/api/v1/admin/bookings/${id}/close`,body})).toThrow();
 });
 it('rejects request smuggling, arbitrary query names, repeats, private search and GET bodies',()=>{
  for(const path of ['https://other.invalid/api/v1/health','//other.invalid/api/v1/health','/api/v1/catalog/../health','/api/v1/%68ealth','/api/v1/health#x','/api/v1/health?q=secret','/api/v1/health?diagnostico=secret','/api/v1/health?days=1&days=2'])expect(()=>parseOperation({method:'GET',path})).toThrow();
  expect(()=>parseOperation({method:'GET',path:'/api/v1/health',body:{}})).toThrow();
  expect(()=>parseOperation({method:'POST',path:'/api/v1/quote?days=2',body:{serviceSlug:'corte-fem'}})).toThrow();
  expect(parseOperation({method:'GET',path:'/api/v1/admin/customers?q=Clienta%20de%20prueba'})).toBeDefined();
 });
});
describe('operation signatures',()=>{
 it('binds identity, destination, method, path and exact operation body',async()=>{
  const signed=await signOperation(env,subject,create());
  expect(signed.url).toBe(AUDIENCE);expect(signed.redirect).toBe('manual');
  const result=await authenticateOperation(signed,key,actor);
  expect(result.operation).toEqual(create());expect(result.actorHash).toBe(actor);
  expect(result.nonce).toMatch(/^[a-f0-9-]{36}$/);expect(result.expiresAt).toBeGreaterThan(Date.now()/1000);
 });
 it('rejects absent or wrong owners before signing',async()=>{
  for(const owner of [undefined,'other'])await expect(signOperation(env,owner,create())).rejects.toThrow();
  await expect(signOperation({},subject,create())).rejects.toThrow();
 });
 it('rejects tampered body, unknown signer and wrong actor',async()=>{
  const signed=await signOperation(env,subject,create());
  const tampered=new Request(AUDIENCE,{method:'POST',headers:signed.headers,body:JSON.stringify({...create(),body:{...booking,startsAt:'2026-12-02T12:00:00Z'}})});
  await expect(authenticateOperation(tampered,key,actor)).rejects.toThrow();
  await expect(authenticateOperation(await signOperation(env,subject,create()),key,'f'.repeat(64))).rejects.toThrow();
  await expect(authenticateOperation(await signOperation(env,subject,create()),{...key,kid:'different'},actor)).rejects.toThrow();
 });
 it('rejects signed stale/future tokens and wrong audience/path/method despite valid signature',async()=>{
  const valid=await signOperation(env,subject,create());const raw=await valid.text();
  const original=decode(valid.headers.get('authorization')!.slice(7)).payload;
  const now=Math.floor(Date.now()/1000);
  for(const patch of [{iat:now+1,exp:now+60},{iat:now-61,exp:now-1},{iat:now,exp:now+61},{aud:'https://other.invalid'},{path:'/functions/v1/other'},{method:'GET'},{iss:'https://other.invalid'}]){
   const jwt=await sign({...original,...patch},privateKey,'ES256');
   await expect(authenticateOperation(new Request(AUDIENCE,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt},body:raw}),key,actor)).rejects.toThrow();
  }
 });
 it('requires external or stripped exact Edge path and JSON',async()=>{
  const signed=await signOperation(env,subject,create());
  const headers=signed.headers,body=await signed.text();
  expect((await authenticateOperation(new Request('http://edge-runtime/sol-mai-site-operating',{method:'POST',headers,body}),key,actor)).operation).toEqual(create());
  for(const url of [AUDIENCE+'?x=1',AUDIENCE+'/other'])await expect(authenticateOperation(new Request(url,{method:'POST',headers,body}),key,actor)).rejects.toThrow();
  await expect(authenticateOperation(new Request(AUDIENCE,{method:'POST',headers:{...Object.fromEntries(headers),'Content-Type':'text/plain'},body}),key,actor)).rejects.toThrow();
 });
 it('bounds streamed bodies even without a content-length',async()=>{
  await expect(readBounded(new Request(AUDIENCE,{method:'POST',body:'x'.repeat(MAX_BYTES+1)}))).rejects.toThrow();
  await expect(readBounded(new Response('[]',{headers:{'content-length':'999999999'}}))).rejects.toThrow();
 });
});
describe('Site gateway egress boundary',()=>{
 it('does not send missing/wrong identities, service bearer alone, CSRF or malformed body',async()=>{
  let calls=0;const transport=(async()=>{calls++;throw Error();}) as unknown as typeof fetch;
  const cases:[Record<string,string>,unknown,number][]=[
   [{},booking,401],
   [{Authorization:'Bearer bypass'},booking,401],
   [{...goodHeaders,'oai-authenticated-user-id':'other'},booking,403],
   [{...goodHeaders,origin:'https://attacker.invalid'},booking,403],
   [{...goodHeaders,'Content-Type':'text/plain'},booking,415],
   [goodHeaders,{...booking,privateContext:'secret'},400],
   [goodHeaders,{...booking,personalization:{enfermedad:'diabetes'}},400],
   [goodHeaders,{...booking,customer:{...FIXTURE,email:'invalid-email'}},400],
  ];
  for(const [headers,body,status] of cases)expect((await operatingGateway(req(body,headers),env,transport)).status).toBe(status);
  expect(calls).toBe(0);
 });
 it('signs the exact validated request, strips browser headers and rejects redirects',async()=>{
  let calls=0;
  const transport=(async(input:Request|string|URL,init?:RequestInit)=>{
   calls++;expect(init?.redirect).toBe('manual');expect(init?.signal).toBeDefined();
   const r=input as Request;expect(r.url).toBe(AUDIENCE);expect(r.headers.get('oai-authenticated-user-id')).toBeNull();expect(r.headers.get('cookie')).toBeNull();
   expect((await authenticateOperation(r,key,actor)).operation).toEqual(create());
   return new Response(null,{status:302,headers:{Location:'https://other.invalid'}});
  }) as unknown as typeof fetch;
  const response=await operatingGateway(req(booking,{...goodHeaders,cookie:'privateCookie'}),env,transport);
  expect(response.status).toBe(503);expect(calls).toBe(1);
 });
 it('preserves actual canonical success and never reflects private backend errors/headers',async()=>{
  const success=(async()=>new Response(JSON.stringify({data:{publicToken:token,status:'pending_payment'}}),{status:201,headers:{'Content-Type':'application/json','set-cookie':'secret'}})) as unknown as typeof fetch;
  const r=await operatingGateway(req(booking),env,success);expect(r.status).toBe(201);expect(r.headers.get('set-cookie')).toBeNull();expect(r.headers.get('Cache-Control')).toBe('no-store');expect(await r.json()).toEqual({data:{publicToken:token,status:'pending_payment'}});
  const failed=(async()=>new Response(JSON.stringify({error:{message:'secret sql text'}}),{status:409,headers:{'Content-Type':'application/json'}})) as unknown as typeof fetch;
  const failure=await operatingGateway(req(booking),env,failed);expect(failure.status).toBe(409);expect(await failure.text()).not.toContain('secret');
 });
 it('requires JSON and bounds backend response; no synthetic fallback',async()=>{
  for(const response of [new Response('<html>bad</html>'),new Response('x'.repeat(2*1024*1024+1),{headers:{'Content-Type':'application/json'}}),new Response('not-json',{headers:{'Content-Type':'application/json'}})]){
   const transport=(async()=>response) as unknown as typeof fetch;
   expect((await operatingGateway(req(booking),env,transport)).ok).toBe(false);
  }
 });
});
