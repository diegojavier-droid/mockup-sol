import {expect,it,afterEach} from 'bun:test';
import {assertTeamScopeTarget,loadServerEnv,__resetServerEnvCache} from './env';
const base={APP_ENV:'local',API_BASE_URL:'http://localhost:3001',PUBLIC_WEB_BASE_URL:'http://localhost:3000',SUPABASE_URL:'http://127.0.0.1:54321',SUPABASE_PUBLISHABLE_KEY:'fixture',INTERNAL_AUTH_JWT_AUDIENCE:'test',INTERNAL_AUTH_ALLOWED_EMAILS:'fixture@example.invalid'};
afterEach(()=>__resetServerEnvCache());
it('team pilot defaults off, requires literal explicit true and approved target',()=>{
 expect(loadServerEnv(base).TEAM_SCOPE_ENABLED).toBe(false);__resetServerEnvCache();
 expect(loadServerEnv({...base,TEAM_SCOPE_ENABLED:'true'}).TEAM_SCOPE_ENABLED).toBe(true);__resetServerEnvCache();
 expect(()=>loadServerEnv({...base,TEAM_SCOPE_ENABLED:'yes'})).toThrow();
});
it('accepts exact isolated origin and explicit loopback hosts only',()=>{
 for(const target of ['http://localhost:54321','http://127.0.0.1:54321','http://[::1]:54321','https://ijzpmwwjuvsgcsbcbzav.supabase.co'])expect(()=>assertTeamScopeTarget({TEAM_SCOPE_ENABLED:true,SUPABASE_URL:target})).not.toThrow();
});
it('rejects absent/ambiguous/remote targets before any network call',()=>{
 for(const target of [undefined,'','https://other.supabase.co','https://scope.invalid','https://ijzpmwwjuvsgcsbcbzav.supabase.co.evil.test','https://user:secret@ijzpmwwjuvsgcsbcbzav.supabase.co','https://ijzpmwwjuvsgcsbcbzav.supabase.co:444','http://ijzpmwwjuvsgcsbcbzav.supabase.co','http://localhost.evil.test','http://localhost:54321/path','http://localhost:54321?host=remote','http://localhost:54321#fragment','file://localhost/','http://127.1:54321','http://2130706433:54321','http://localhost:54321?','http://localhost:54321#','http://localhost:54321/a/..'])expect(()=>assertTeamScopeTarget({TEAM_SCOPE_ENABLED:true,SUPABASE_URL:target})).toThrow();
});
