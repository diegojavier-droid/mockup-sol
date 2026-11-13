/** Interactive React + real Supabase SDK, all HTTP replaced in-process.
 * This verifies component lifecycle, not browser or real Auth acceptance. */
import {expect,test} from 'bun:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {PanelAccess} from '../components/booking/admin/PanelAccess';
import {ERROR_INGRESO,salir} from './staff-auth';
import {clearStaffToken,readStaffToken} from './staff-session';

class MemoryStorage {
  values=new Map<string,string>(); blockRemoval=false;
  getItem(key:string){return this.values.get(key)??null;}
  setItem(key:string,value:string){this.values.set(key,value);}
  removeItem(key:string){if(this.blockRemoval&&key.startsWith('sb-'))throw new Error('blocked storage');this.values.delete(key);}
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
async function until(check:()=>boolean){for(let i=0;i<200;i++){await act(async()=>{await tick();});if(check())return;}throw new Error('component did not reach expected state');}

test('pending password survives session transition; error remains visible; failed local logout never reloads',async()=>{
  const oldFetch=globalThis.fetch;
  const windowDescriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
  const actDescriptor=Object.getOwnPropertyDescriptor(globalThis,'IS_REACT_ACT_ENVIRONMENT');
  const localStorage=new MemoryStorage(),sessionStorage=new MemoryStorage();
  const target=new EventTarget();let navigations=0;
  const windowFixture={localStorage,sessionStorage,location:{origin:'http://component.invalid',pathname:'/panel',search:'',hash:'',assign:()=>navigations++},history:{replaceState:()=>{}},addEventListener:target.addEventListener.bind(target),removeEventListener:target.removeEventListener.bind(target)};
  Object.defineProperty(globalThis,'window',{configurable:true,value:windowFixture});
  Object.defineProperty(globalThis,'IS_REACT_ACT_ENVIRONMENT',{configurable:true,value:true});
  let passwordCalls=0,logoutCalls=0,adminCalls=0,adminStatus=500;
  let releasePassword:((response:Response)=>void)|undefined;
  const requests:Array<{url:string;body:unknown}>=[];
  const json=(body:unknown,status=200)=>Response.json(body,{status});
  globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=String(input instanceof Request?input.url:input);
    if(url==='/api/v1/auth/panel-config')return json({data:{supabaseUrl:'http://127.0.0.1:6543',publishableKey:'fixture-public-only',proveedores:['email']}});
    if(url==='http://127.0.0.1:6543/auth/v1/token?grant_type=password'){
      passwordCalls++;requests.push({url,body:JSON.parse(String(init?.body))});
      return new Promise<Response>(resolve=>{releasePassword=resolve;});
    }
    if(url==='/api/v1/admin/me'){adminCalls++;return json({error:{code:adminStatus===403?'FORBIDDEN':'SERVER_ERROR',message:'Fixture identity error.'}},adminStatus);}
    if(url==='http://127.0.0.1:6543/auth/v1/logout?scope=local'){logoutCalls++;return json({msg:'fixture remote unavailable'},503);}
    throw new Error('Unexpected fixture HTTP destination');
  }) as typeof fetch;
  let tree:ReactTestRenderer|undefined;
  try{
    clearStaffToken();
    await act(async()=>{tree=create(<PanelAccess><p>Private fixture</p></PanelAccess>);});
    const root=()=>tree!.root;
    const field=(id:string)=>root().findByProps({id});
    const text=()=>JSON.stringify(tree!.toJSON());
    await until(()=>root().findAllByProps({id:'staff-mail'}).length===1);
    await act(async()=>{field('staff-mail').props.onChange({target:{value:'equipo@example.invalid'}});field('staff-password').props.onChange({target:{value:' ficticia sin trim '}});});
    const originalForm=root().findByType('form');
    await act(async()=>{originalForm.props.onSubmit({preventDefault(){}});});
    await until(()=>passwordCalls===1);
    expect(root().findByType('form')).toBe(originalForm);
    expect(field('staff-mail').props.value).toBe('equipo@example.invalid');
    expect(field('staff-password').props.value).toBe('');
    expect(field('staff-mail').props.disabled).toBe(true);
    expect(text()).toContain('Verificando…');
    await act(async()=>{root().findByType('form').props.onSubmit({preventDefault(){}});});
    expect(passwordCalls).toBe(1);
    expect(requests[0]?.body).toMatchObject({email:'equipo@example.invalid',password:' ficticia sin trim '});
    await act(async()=>{releasePassword!(json({error_code:'invalid_credentials',msg:'Invalid login credentials'},400));});
    await until(()=>text().includes(ERROR_INGRESO));
    expect(field('staff-mail').props.value).toBe('equipo@example.invalid');
    expect(field('staff-mail').props.disabled).toBe(false);
    expect(readStaffToken()).toBeNull();expect(adminCalls).toBe(0);

    await act(async()=>{field('staff-password').props.onChange({target:{value:'otra ficticia'}});});
    await act(async()=>{root().findByType('form').props.onSubmit({preventDefault(){}});});
    await until(()=>passwordCalls===2);
    const id='11111111-1111-4111-8111-111111111111';
    const token=[btoa(JSON.stringify({alg:'HS256'})),btoa(JSON.stringify({sub:id,session_id:'22222222-2222-4222-8222-222222222222',exp:Math.floor(Date.now()/1000)+3600})), 'fixture-signature'].join('.');
    await act(async()=>{releasePassword!(json({access_token:token,refresh_token:'fixture-only-refresh',token_type:'bearer',expires_in:3600,user:{id,email:'equipo@example.invalid',aud:'authenticated',role:'authenticated',created_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{}}}));});
    await until(()=>text().includes('No pudimos abrir el panel.'));
    expect(adminCalls).toBe(1);expect(readStaffToken()).toBe(token);
    expect(root().findAllByType('form')).toHaveLength(0);
    await act(async()=>{root().findAllByType('button').find(button=>button.children.includes('Cerrar sesión'))!.props.onClick();});
    await until(()=>root().findAllByProps({id:'staff-mail'}).length===1);
    expect(readStaffToken()).toBeNull();expect(navigations).toBe(0);
    await act(async()=>{field('staff-mail').props.onChange({target:{value:'equipo@example.invalid'}});field('staff-password').props.onChange({target:{value:'incorrecta después de error 500'}});});
    const afterErrorForm=root().findByType('form');
    await act(async()=>{afterErrorForm.props.onSubmit({preventDefault(){}});});
    await until(()=>passwordCalls===3);
    expect(root().findByType('form')).toBe(afterErrorForm);
    expect(field('staff-mail').props.disabled).toBe(true);
    await act(async()=>{releasePassword!(json({error_code:'invalid_credentials',msg:'Invalid login credentials'},400));});
    await until(()=>text().includes(ERROR_INGRESO));
    expect(field('staff-mail').props.value).toBe('equipo@example.invalid');
    adminStatus=403;
    await act(async()=>{field('staff-password').props.onChange({target:{value:'última ficticia'}});});
    await act(async()=>{root().findByType('form').props.onSubmit({preventDefault(){}});});
    await until(()=>passwordCalls===4);
    await act(async()=>{releasePassword!(json({access_token:token,refresh_token:'fixture-only-refresh',token_type:'bearer',expires_in:3600,user:{id,email:'equipo@example.invalid',aud:'authenticated',role:'authenticated',created_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{}}}));});
    await until(()=>text().includes('Probar con otro correo'));
    // First denied /me retires the generation and revalidates once; repeated denial is stable.
    expect(adminCalls).toBe(3);expect(readStaffToken()).toBe(token);
    localStorage.blockRemoval=true;
    const switchAccount=root().findAllByType('button').find(button=>button.children.includes('Probar con otro correo'))!;
    await act(async()=>{switchAccount.props.onClick();});
    await until(()=>text().includes('No compartas este dispositivo'));
    expect(navigations).toBe(0);expect(readStaffToken()).toBeNull();
    expect(root().findAllByProps({id:'staff-mail'})).toHaveLength(1);
    expect(text()).not.toContain('Private fixture');expect(logoutCalls).toBe(2);
    // A rerender/remount must not resurrect backing storage after failed cleanup.
    await act(async()=>{tree!.unmount();tree=create(<PanelAccess><p>Private fixture</p></PanelAccess>);});
    await until(()=>root().findAllByProps({id:'staff-mail'}).length===1);
    expect(readStaffToken()).toBeNull();expect(adminCalls).toBe(3);expect(navigations).toBe(0);
  }finally{
    localStorage.blockRemoval=false;
    await act(async()=>{tree?.unmount();await salir();});
    globalThis.fetch=oldFetch;
    if(windowDescriptor)Object.defineProperty(globalThis,'window',windowDescriptor);else Reflect.deleteProperty(globalThis,'window');
    if(actDescriptor)Object.defineProperty(globalThis,'IS_REACT_ACT_ENVIRONMENT',actDescriptor);else Reflect.deleteProperty(globalThis,'IS_REACT_ACT_ENVIRONMENT');
  }
},15000);
