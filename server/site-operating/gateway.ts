import {OperatingError,ORIGIN,parseOperation} from './contract';
import {readBounded,readJson,signOperation,requireSiteOwner,type SigningEnv} from './auth';
export type OperatingEnv=SigningEnv;
const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export function errorResponse(error:unknown):Response{
 const status=error instanceof OperatingError?error.status:503;
 const message=status===401||status===403?'Este panel de prueba está reservado al propietario autenticado.':status===503?'La base de prueba no está disponible. Si estabas guardando, reintentá sin cambiar las opciones: no se duplicará el turno.':'Revisá las opciones elegidas para esta prueba.';
 return Response.json({error:{message,status}},{status,headers});
}
export async function operatingGateway(request:Request,env:OperatingEnv,transport:typeof fetch=fetch):Promise<Response>{
 try{
  const subject=requireSiteOwner(request,env);
  const url=new URL(request.url);
  const mutation=request.method!=='GET';
  if(mutation&&request.headers.get('origin')!==ORIGIN)throw new OperatingError(403,'WRONG_ORIGIN');
  if(mutation&&request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new OperatingError(415,'JSON_REQUIRED');
  const raw={method:request.method,path:url.href.slice(url.origin.length),...(mutation?{body:await readJson(request)}:{}),...(request.headers.has('x-idempotency-key')?{operationId:request.headers.get('x-idempotency-key')}: {})};
  const signed=await signOperation(env,subject,parseOperation(raw));
  const response=await transport(signed,{redirect:'manual',signal:AbortSignal.timeout(25000)});
  if(response.status>=300&&response.status<400)throw new OperatingError(503,'REDIRECT_REJECTED');
  if(response.headers.get('content-type')?.split(';')[0].trim()!=='application/json')throw new OperatingError(503,'INVALID_RESPONSE');
  const bytes=await readBounded(response,2*1024*1024);
  let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);JSON.parse(text);}catch{throw new OperatingError(503,'INVALID_RESPONSE');}
  if(!response.ok){const allowed=[400,401,403,404,409,413,415,422,429];throw new OperatingError(allowed.includes(response.status)?response.status:503,'OPERATION_FAILED');}
  return new Response(text,{status:response.status,headers});
 }catch(error){return errorResponse(error);}
}
