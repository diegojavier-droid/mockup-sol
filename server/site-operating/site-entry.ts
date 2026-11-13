/** Site Worker routing boundary. Runs before loading or invoking TanStack SSR. */
import {requireSiteOwner} from './auth';
import {OperatingError} from './contract';
import {errorResponse,operatingGateway,type OperatingEnv} from './gateway';
type Render=()=>Promise<Response>;
export function siteRouteKind(pathname:string):'panel'|'api'|'public' {
 // Reject ambiguous separators, encoded traversal and repeated decoding rather
 // than allowing different URL parsers to disagree on the protected route.
 if(/%(?:2f|5c|2e|25)/i.test(pathname)||pathname.includes('\\'))throw new OperatingError(400,'AMBIGUOUS_PATH');
 let decoded:string;
 try{decoded=decodeURIComponent(pathname);}catch{throw new OperatingError(400,'INVALID_PATH');}
 if(/[\u0000-\u0020\u007f]/u.test(decoded))throw new OperatingError(400,'INVALID_PATH');
 const path=decoded.replace(/\/{2,}/g,'/').toLowerCase();
 if(/^\/(panel|agenda|operaciones)(?:\/|$)/.test(path))return 'panel';
 if(/^\/api(?:\/|$)/.test(path))return 'api';
 return 'public';
}
export async function dispatchSiteRequest(request:Request,env:OperatingEnv,render:Render):Promise<Response>{
 let kind:ReturnType<typeof siteRouteKind>;
 try{
  kind=siteRouteKind(new URL(request.url).pathname);
  if(kind==='panel')requireSiteOwner(request,env);
 }catch(error){return errorResponse(error);}
 if(kind==='api')return operatingGateway(request,env);
 const response=await render();
 if(kind==='public')return response;
 const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
