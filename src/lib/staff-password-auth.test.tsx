import {describe, expect, test} from 'bun:test';
import type {SupabaseClient} from '@supabase/supabase-js';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {crearIngresoConContrasena, ERROR_INGRESO, correoValido} from './staff-auth';
import {SignIn} from '@/components/booking/admin/SignIn';

function setup(options: {providers?:string[]; response?:unknown; throws?:boolean; noClient?:boolean} = {}) {
 const calls:unknown[]=[]; const tokens:string[]=[];
 const login=crearIngresoConContrasena({
  config:async()=>({supabaseUrl:'https://example.invalid',publishableKey:'test-public',proveedores:options.providers??['email']}),
  cliente:async()=>options.noClient?null:({auth:{signInWithPassword:async(input:unknown)=>{
    calls.push(input); if(options.throws)throw new Error('sensitive provider detail');
    return options.response??{data:{session:{access_token:'mock-session'}},error:null};
  }}} as unknown as Pick<SupabaseClient,'auth'>),
  guardarToken:token=>tokens.push(token),
 });
 return {login,calls,tokens};
}
describe('ingreso individual por contraseña, sin red',()=>{
 test('usa SDK, conserva contraseña exacta y exige sesión antes de avisar al panel',async()=>{
  const s=setup();expect(await s.login(' equipo@example.invalid ',' ficticia ')).toEqual({ok:true});
  expect(s.calls).toEqual([{email:'equipo@example.invalid',password:' ficticia '}]);
  expect(s.tokens).toEqual(['mock-session']);
 });
 test('email no admitido en config no llama al proveedor',async()=>{
  for(const providers of [[],['google']]){const s=setup({providers});expect((await s.login('a@example.invalid','ficticia')).ok).toBe(false);expect(s.calls).toEqual([]);}
 });
 test('datos inválidos se rechazan antes del SDK',async()=>{
  const s=setup();for(const [mail,password] of [['sin-arroba','x'],['a@b.invalid',''],['a@b.invalid','x'.repeat(1025)]])expect((await s.login(mail,password)).ok).toBe(false);
  expect(s.calls).toEqual([]);expect(correoValido('a\nb@example.invalid')).toBe(false);
 });
 test('sin sesión o con error nunca guarda token ni enumera cuentas',async()=>{
  for(const response of [{data:{session:null},error:null},{data:{session:{access_token:''}},error:null},{data:{session:null},error:{message:'user missing'}},{data:{session:{access_token:'bad'}},error:{message:'wrong password'}}]){
   const s=setup({response});expect(await s.login('a@example.invalid','ficticia')).toEqual({ok:false,mensaje:ERROR_INGRESO});expect(s.tokens).toEqual([]);
  }
 });
 test('fallo de red o cliente ausente se cierra con mensaje genérico',async()=>{
  for(const options of [{throws:true},{noClient:true}]){const s=setup(options);expect(await s.login('a@example.invalid','ficticia')).toEqual({ok:false,mensaje:ERROR_INGRESO});expect(s.tokens).toEqual([]);}
 });
 test('SSR no ofrece token manual ni afirma acceso concedido',()=>{
  const html=renderToStaticMarkup(<SignIn onToken={()=>{throw new Error('not authorized');}} error={null} aviso={null}/>);
  expect(html).not.toContain('staff-token');expect(html).not.toContain('Token de acceso');expect(html).toContain('Panel del salón');
 });
 test('contrato UI: contraseña protegida, limpieza inmediata, form y doble envío bloqueado',()=>{
  const ui=readFileSync(new URL('../components/booking/admin/SignIn.tsx',import.meta.url),'utf8');
  expect(ui).toContain('type="password"');expect(ui).toContain('autoComplete="current-password"');expect(ui).toContain('<form onSubmit=');
  expect(ui).toContain('if (ocupado.current ||');expect(ui).toContain('ocupado.current = true;');
  expect(ui).toContain('const intento = entrarConContrasena(mail, password);\n            setPassword("");');
  expect(ui).not.toMatch(/(?:localStorage|sessionStorage|console\.|URLSearchParams)/);
  expect(ui).not.toContain('writeStaffToken');expect(ui).not.toContain('staff-token');
 });
 test('link no auto-registra y Google sigue configurado como alternativa',()=>{
  const auth=readFileSync(new URL('./staff-auth.ts',import.meta.url),'utf8');
  expect(auth).toContain('shouldCreateUser: false');expect(auth).not.toContain('.signUp(');expect(auth).toContain('provider: "google"');
 });
});
