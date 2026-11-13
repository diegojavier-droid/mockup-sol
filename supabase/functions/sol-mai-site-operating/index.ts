import { authenticateOperation } from '../../../server/site-operating/auth';
import { executeAuthenticated, isolatedEnv } from '../../../server/site-operating/backend';
import { errorResponse } from '../../../server/site-operating/gateway';
import { EXPECTED_ACTOR_HASH, SIGNING_PUBLIC_KEY } from '../../../server/site-operating/config';
declare const Deno: {env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Promise<Response>):void};
Deno.serve(async request=>{
  try {
    const {operation,nonce,expiresAt,bodyHash}=await authenticateOperation(request,SIGNING_PUBLIC_KEY,EXPECTED_ACTOR_HASH);
    return await executeAuthenticated(isolatedEnv(name=>Deno.env.get(name)),operation,bodyHash,nonce,expiresAt);
  } catch(error) { return errorResponse(error); }
});
