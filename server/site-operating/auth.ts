import {decode,sign,verify} from 'hono/jwt';
import {z} from 'zod';
import {publicKeySchema,sha256} from './crypto';
import {AUDIENCE,FUNCTION_PATH,ORIGIN,MAX_BYTES,OperatingError,parseOperation} from './contract';
export {sha256};
export interface SigningEnv {SITE_TEST_OWNER_SUB?:string;SITE_TEST_SIGNING_PRIVATE_JWK?:string}
/** Sites dispatch supplies this identity; browser bearer tokens are irrelevant. */
export function requireSiteOwner(request:Request,env:SigningEnv):string {
 const subject=request.headers.get('oai-authenticated-user-id');
 if(!subject)throw new OperatingError(401,'OWNER_REQUIRED');
 if(!env?.SITE_TEST_OWNER_SUB||!env?.SITE_TEST_SIGNING_PRIVATE_JWK)throw new OperatingError(503,'UNCONFIGURED');
 if(subject!==env.SITE_TEST_OWNER_SUB)throw new OperatingError(403,'OWNER_REQUIRED');
 if(new URL(request.url).origin!==ORIGIN)throw new OperatingError(403,'WRONG_ORIGIN');
 return subject;
}
const privateKeySchema=publicKeySchema.omit({key_ops:true}).extend({d:z.string().regex(/^[A-Za-z0-9_-]{43}$/),key_ops:z.array(z.literal('sign')).optional()}).strict();
const hash=z.string().regex(/^[a-f0-9]{64}$/);
const headerSchema=z.object({alg:z.literal('ES256'),typ:z.literal('JWT'),kid:z.string()}).strict();
const claimsSchema=z.object({iss:z.literal(ORIGIN),aud:z.literal(AUDIENCE),iat:z.number().int(),exp:z.number().int(),jti:z.string().uuid(),actor:hash,method:z.literal('POST'),path:z.literal(FUNCTION_PATH),bodyHash:hash}).strict();
export async function readBounded(input:Request|Response,limit=MAX_BYTES):Promise<Uint8Array> {
 const size=input.headers.get('content-length');
 if(size&&(!/^\d+$/.test(size)||Number(size)>limit))throw new OperatingError(413,'BODY_TOO_LARGE');
 if(!input.body)throw new OperatingError(400,'BODY_REQUIRED');
 const reader=input.body.getReader(),chunks:Uint8Array[]=[];let length=0;
 try {while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw new OperatingError(413,'BODY_TOO_LARGE');}chunks.push(value);}}finally{reader.releaseLock();}
 const result=new Uint8Array(length);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}
export async function readJson(request:Request):Promise<unknown>{try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readBounded(request)));}catch(e){if(e instanceof OperatingError)throw e;throw new OperatingError(400,'INVALID_JSON');}}
export async function signOperation(env:SigningEnv,subject:string|undefined,raw:unknown):Promise<Request>{
 if(!env.SITE_TEST_OWNER_SUB||!env.SITE_TEST_SIGNING_PRIVATE_JWK)throw new OperatingError(503,'UNCONFIGURED');
 if(!subject||subject!==env.SITE_TEST_OWNER_SUB)throw new OperatingError(403,'OWNER_REQUIRED');
 const operation=parseOperation(raw),key=privateKeySchema.parse(JSON.parse(env.SITE_TEST_SIGNING_PRIVATE_JWK));
 const body=JSON.stringify(operation);if(new TextEncoder().encode(body).length>MAX_BYTES)throw new OperatingError(413,'BODY_TOO_LARGE');
 const now=Math.floor(Date.now()/1000);
 const token=await sign({iss:ORIGIN,aud:AUDIENCE,iat:now,exp:now+60,jti:crypto.randomUUID(),actor:await sha256(subject),method:'POST',path:FUNCTION_PATH,bodyHash:await sha256(body)},key,'ES256');
 return new Request(AUDIENCE,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body,redirect:'manual'});
}
export async function authenticateOperation(request:Request,keyInput:unknown,expectedActorHash:string){
 const url=new URL(request.url);
 if(request.method!=='POST'||url.search||!(url.origin+url.pathname===AUDIENCE||url.pathname==='/sol-mai-site-operating'))throw new OperatingError(404,'NOT_FOUND');
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new OperatingError(415,'JSON_REQUIRED');
 const key=publicKeySchema.parse(keyInput);hash.parse(expectedActorHash);
 const auth=request.headers.get('authorization')??'';
 if(!auth.startsWith('Bearer ')||auth.length>4096)throw new OperatingError(401,'UNAUTHORIZED');
 let claims:z.infer<typeof claimsSchema>;
 try{const header=headerSchema.parse(decode(auth.slice(7)).header);if(header.kid!==key.kid)throw Error();
 claims=claimsSchema.parse(await verify(auth.slice(7),key,{alg:'ES256',iss:ORIGIN,aud:AUDIENCE}));
 const now=Math.floor(Date.now()/1000);
 if(claims.actor!==expectedActorHash||claims.iat>now||claims.exp<=now||claims.exp<=claims.iat||claims.exp-claims.iat>60||now-claims.iat>60)throw Error();
 }catch{throw new OperatingError(401,'UNAUTHORIZED');}
 const bytes=await readBounded(request);if(await sha256(bytes)!==claims.bodyHash)throw new OperatingError(401,'UNAUTHORIZED');
 let raw:unknown;try{raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new OperatingError(400,'INVALID_JSON');}
 return {operation:parseOperation(raw),nonce:claims.jti,expiresAt:claims.exp,bodyHash:claims.bodyHash,actorHash:claims.actor};
}
