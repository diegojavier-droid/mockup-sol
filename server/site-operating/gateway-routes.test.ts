import {describe,it,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {parseOperation} from './contract';
const root = new URL('../../',import.meta.url);
const source=(path:string)=>readFileSync(new URL(path,root),'utf8');
const get=(path:string)=>parseOperation({method:'GET',path:'/api/v1'+path});
describe('visible admin modules and strict gateway integration',()=>{
 it('accepts actual static GET routes in admin hooks and business hours hooks',()=>{
  const text=source('src/lib/api/admin-hooks.ts')+'\n'+source('src/lib/api/business-hours-admin.ts');
  const staticRoutes=[...text.matchAll(/adminApi\.get[\s\S]*?\(\s*["`]([^"`]+)["`]/g)].map(m=>m[1]).filter(path=>!path.includes('$'));
  expect(staticRoutes.length).toBeGreaterThanOrEqual(15);
  for(const path of staticRoutes)expect(get('/admin'+path)).toBeDefined();
 });
 it('accepts the parameterized requests actually sent by agenda, calendar, audit, dashboard and station hooks',()=>{
  for(const path of [
   '/admin/agenda?date=2026-12-01&days=7&area=peluqueria',
   '/admin/agenda/resumen?desde=2026-01-01&hasta=2026-12-31',
   '/admin/audit?desde=2026-11-01T00%3A00%3A00.000Z&limit=50&entityType=booking',
   '/admin/audit?actorId=d17ba69b-28d0-426e-a201-9df8fb8bc477&cursor=2&limit=50',
   '/admin/dashboard?from=2026-11-01&to=2026-11-30',
   '/admin/stations?',
   '/admin/stations?area=peluqueria&at=2026-12-01T09%3A00%3A00-03%3A00',
   '/admin/capacity?area=unas&startsAt=2026-12-01T12%3A00%3A00.000Z&endsAt=2026-12-01T13%3A00%3A00.000Z',
   '/admin/customers?q=Clienta%20de%20prueba',
   '/admin/cash-register?day=2026-12-01',
   '/admin/invoicing/summary?year=2026',
   '/admin/invoicing/pending?from=2026-01-01&to=2026-12-31',
   '/admin/reconciliation?from=2026-01-01&to=2026-12-31&format=json',
   '/catalog/services?category=peluqueria',
   '/catalog/extras?category=unas',
   '/catalog/personalization?category=unas',
  ])expect(get(path)).toBeDefined();
 });
 it('rejects text and ignored queries on all other routes; at only accepts station timestamps',()=>{
  for(const path of [
   '/admin/stations?at=secret',
   '/admin/stations?at=2026-12-01T12:00:00Z&at=2026-12-02T12:00:00Z',
   '/admin/me?at=2026-12-01T12:00:00Z',
   '/admin/stations?q=secret',
   '/catalog/services?actorId=secret',
   '/admin/customers?q=una%20persona%20real',
   '/admin/audit?entityType=diagnostico',
   '/admin/audit?actorId=secret',
   '/admin/audit?limit=201',
   '/admin/dashboard?from=secret&to=secret',
   '/admin/agenda?days=32',
   '/admin/reconciliation?from=2026-01-01&to=2026-12-31&format=csv',
  ])expect(()=>get(path)).toThrow();
 });
 it('does not mount customer search or AI text entry in the operable panel',()=>{
  const dialog=source('src/components/booking/admin/NewBookingDialog.tsx');
  expect(dialog).toContain('useCustomerSearch(isSiteTest ? "" : search)');
  expect(source('src/lib/api/admin-hooks.ts')).toContain('enabled: term.trim().length >= 2');
  expect(dialog).toContain('!isSiteTest && <Field label="Nota (opcional)"');
  expect(dialog).toContain('isSiteTest ? {testCustomerScenario:true');
  const sections=source('src/components/booking/admin/secciones.tsx');
  expect(sections).toContain('<SoloLectura><PuestosFueraScreen /></SoloLectura>');
  expect(sections).toContain('<SoloLectura><ProductosScreen /></SoloLectura>');
  expect(sections).toContain('<SoloLectura><InvoicingScreen /></SoloLectura>');
  expect(sections).toContain('<fieldset disabled>');
  expect(sections).toContain('if(!isSiteTest)return <>{children}</>');
  const prices=source('src/components/booking/admin/SalonScreen.tsx');
  expect(prices).toContain('!isSiteTest && <Asistente');
 });
});
