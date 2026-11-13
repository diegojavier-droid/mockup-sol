/** Public SDK storage adapter: retired clients cannot persist a late refresh. */
export class StaffAuthStorage {
  private snapshot = new Map<string, string>();
  private retired = false;
  private cleared: boolean | undefined;
  private disposed = false;
  private marker: string | null;
  readonly markerKey: string;
  constructor(private backing: Pick<Storage,'getItem'|'setItem'|'removeItem'> | undefined, readonly key: string) {
    this.markerKey = `${key}:generation`;
    this.marker = backing?.getItem(this.markerKey) ?? null;
    for (const k of this.keys()) {
      const value = backing?.getItem(k);
      if (value != null) this.snapshot.set(k,value);
    }
  }
  private keys() { return [this.key, `${this.key}-code-verifier`, `${this.key}-user`]; }
  current() {
    if (this.retired || this.disposed) return false;
    try { return !this.backing || this.backing.getItem(this.markerKey) === this.marker; }
    catch { return false; }
  }
  matchesAccessToken(token:string): boolean {
    if (!this.current()) return false;
    try {
      const raw=this.getItem(this.key);
      if (!raw) return false;
      const session:unknown=JSON.parse(raw);
      return Boolean(session && typeof session === "object" &&
        "access_token" in session && session.access_token === token);
    } catch { return false; }
  }
  shouldEndSession(): boolean {
    if (!this.current()) return true;
    try { return this.getItem(this.key) === null; } catch { return true; }
  }
  getItem(key:string): string|null {
    if (this.disposed) return null;
    // A logout uses this bounded in-memory snapshot to call provider signOut.
    if (this.retired) return this.snapshot.get(key) ?? null;
    if (!this.current()) return null;
    const value = this.backing ? this.backing.getItem(key) : this.snapshot.get(key) ?? null;
    if (value != null) this.snapshot.set(key,value);
    return value;
  }
  setItem(key:string,value:string) {
    if (!this.current()) return;
    this.backing?.setItem(key,value);
    this.snapshot.set(key,value);
  }
  removeItem(key:string) {
    if (this.current()) this.backing?.removeItem(key);
    this.snapshot.delete(key);
  }
  retire(broadcast=true): boolean {
    if (this.retired) return this.cleared ?? false;
    let cleared=Boolean(this.backing);
    // Read the CURRENT persisted session before retiring. Another tab may
    // have refreshed it since our last SDK read; signOut must use that value.
    if (this.backing) {
      try {
        if (this.backing.getItem(this.markerKey) !== this.marker) {
          this.retired=true; this.snapshot.clear(); this.cleared=true;
          return true; // A newer lifecycle owns disk. Never delete its session.
        }
        for (const key of this.keys()) {
          const value=this.backing.getItem(key);
          if (value === null) this.snapshot.delete(key); else this.snapshot.set(key,value);
        }
      } catch { cleared=false; }
    }
    this.retired=true;
    if (broadcast && this.backing) {
      try { this.backing.setItem(this.markerKey,crypto.randomUUID()); } catch { cleared=false; }
    }
    for (const key of broadcast ? this.keys() : []) {
      try { this.backing?.removeItem(key); if (this.backing?.getItem(key) != null) cleared=false; }
      catch { cleared=false; }
    }
    this.cleared=cleared;
    return cleared;
  }

  dispose() { this.retired=true; this.disposed=true; this.snapshot.clear(); }
}

export interface StaffLogoutResult { localCleared:boolean; providerSignedOut:boolean; mensaje?:string; }
/** No successful signOut implies immediate revocation of already-issued JWTs. */
export async function finishStaffLogout(deps: {
  auth: {signOut:(options:{scope:'local'})=>Promise<{error:unknown}>; stopAutoRefresh:()=>Promise<void>; dispose:()=>Promise<void>} | null;
  storage:StaffAuthStorage|null;
  localCleared:boolean;
  timeoutMs?:number;
}):Promise<StaffLogoutResult> {
  let providerSignedOut=false;
  try {
    providerSignedOut=await authDeadline((async () => {
      await deps.auth?.stopAutoRefresh();
      return deps.auth ? !(await deps.auth.signOut({scope:'local'})).error : false;
    })(), deps.timeoutMs);
  } catch { /* Local cleanup is mandatory even when provider is unreachable. */ }
  finally {
    deps.storage?.dispose();
    // Dispose must start but cannot keep the UI waiting on a broken SDK.
    try { void deps.auth?.dispose().catch(() => undefined); } catch { /* no private SDK cleanup */ }
  }
  return {localCleared:deps.localCleared,providerSignedOut,
    ...(!deps.localCleared ? {mensaje:'No pudimos borrar todo el acceso guardado. No compartas este dispositivo hasta borrar los datos de este sitio en el navegador.'}
      : !providerSignedOut ? {mensaje:'Saliste en este navegador. No pudimos confirmar el cierre con el proveedor.'} : {})};
}

/** Synchronous event listener, safe to call from SDK callbacks without awaiting SDK work. */
export function createStaffAuthMirror(deps:{current:()=>boolean;matchesToken:(token:string)=>boolean;isEmpty:()=>boolean;token:(token:string)=>void;empty:()=>void;signedOut:()=>void}) {
  return (event:string,session:{access_token?:string}|null) => {
    if (!deps.current()) return;
    if (event === "SIGNED_OUT") { deps.signedOut(); return; }
    if (session?.access_token) {
      if (deps.matchesToken(session.access_token)) deps.token(session.access_token);
    } else if (deps.isEmpty()) deps.empty();
  };
}

export const AUTH_TIMEOUT_MS = 10_000;
export async function authDeadline<T>(operation:Promise<T>, timeoutMs=AUTH_TIMEOUT_MS, onTimeout?:()=>void):Promise<T> {
  let timer:ReturnType<typeof setTimeout> | undefined;
  const timeout=new Promise<never>((_,reject) => {timer=setTimeout(() => {
    onTimeout?.(); reject(new Error("Authentication request timed out"));
  },timeoutMs);});
  try { return await Promise.race([operation,timeout]); }
  finally { if(timer !== undefined) clearTimeout(timer); }
}
/** Auth responses are small JSON payloads; bound headers AND response-body reads. */
export async function staffAuthFetch(input:RequestInfo|URL, init?:RequestInit, timeoutMs=AUTH_TIMEOUT_MS, fetcher: typeof fetch=fetch):Promise<Response> {
  const controller=new AbortController();
  const incoming=init?.signal ?? (input instanceof Request ? input.signal : undefined);
  const abort=() => controller.abort();
  if(incoming?.aborted) abort(); else incoming?.addEventListener("abort",abort,{once:true});
  try {
    return await authDeadline((async () => {
      const response=await fetcher(input,{...init,signal:controller.signal});
      const bytes=await response.arrayBuffer();
      return new Response([101,204,205,304].includes(response.status) ? null : bytes,{
        status:response.status,statusText:response.statusText,headers:response.headers,
      });
    })(),timeoutMs,abort);
  } finally { incoming?.removeEventListener("abort",abort); }
}

/** Failed disk cleanup cannot be undone by an automatic restore in this page. */
export class StaffAuthPersistence {
  private quarantined=false;
  recordCleanup(cleared:boolean) { if (!cleared) this.quarantined=true; }
  canRestore() { return !this.quarantined; }
  storage(backing:Storage|undefined) { return this.quarantined ? undefined : backing; }
}
