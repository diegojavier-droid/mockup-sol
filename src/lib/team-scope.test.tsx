import {expect,test} from 'bun:test';
import {puede,type StaffIdentity} from './staff-session';
import {queMostrar} from './panel-sesion';
import {readFileSync} from 'node:fs';
const assigned={staffId:'p',agendaScope:'assigned',permisos:{calendario:'full',clientas:'full',finanzas:'full',configuracion:'full',servicios:'full'}} as StaffIdentity;
test('assigned navigation and direct sections deny global data even with stale broad permissions',()=>{
 expect(puede(assigned,'calendario')).toBe(true);
 for(const module of ['clientas','finanzas','servicios','configuracion'] as const){
  expect(puede(assigned,module)).toBe(false);
  expect(queMostrar({identidad:assigned,cargando:false},module)).toBe('sin-permiso');
 }
 expect(puede({...assigned,agendaScope:'all'},'finanzas','full')).toBe(true);
});
test('agenda avoids forbidden configuration calls and never labels failures as empty',()=>{
 const source=readFileSync(new URL('../components/booking/admin/AgendaScreen.tsx',import.meta.url),'utf8');
 expect(source).toContain('useAreas(!assigned && puede(identidad,"configuracion"))');
 expect(source).toContain('!agenda.isLoading && !agenda.isError && entries.length === 0');
 expect(source).toContain('entry.view === "operational"');
 expect(source).toContain('actions.closeService && canCharge');
 expect(source).toContain('const canCreate=!assigned && puede(identidad,"finanzas","full")');
 expect(source).toContain('markArrival:canCharge && allowed.markArrival');
 expect(source).toContain('!isSiteTest && canCharge && entry.status');
});
