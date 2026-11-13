import {expect,test} from 'bun:test';
import {createMemoryHistory,createRootRoute,createRouter,RouterProvider} from '@tanstack/react-router';
import {renderToStaticMarkup} from 'react-dom/server';
import {PanelShell} from '../components/booking/admin/PanelShell';
import {ARBOL,modulosDisponibles,buscarModulo,buscarSeccion,ENTRADA} from './panel-nav';
import type {StaffIdentity} from './staff-session';
import {readFileSync} from 'node:fs';
const owner={staffId:'s',role:'owner',displayName:'Sol',permisos:Object.fromEntries(ARBOL.map(m=>[m.permiso,'full']))} as StaffIdentity;
async function render(identity:StaffIdentity|undefined){
 const module=buscarModulo('agenda')!;
 const root=createRootRoute({component:()=> <PanelShell modulo={module} seccion={module.secciones[0]} identidad={identity} onSalir={()=>{}}><p>Contenido</p></PanelShell>});
 const router=createRouter({routeTree:root,history:createMemoryHistory({initialEntries:['/']})});
 await router.load();return renderToStaticMarkup(<RouterProvider router={router}/>);
}
test('owner navigation keeps working links and removes unfinished modules and mobile Clientas',async()=>{
 const html=await render(owner);
 expect(html).toContain('Agenda');expect(html).toContain('Finanzas');expect(html).toContain('href="/panel/agenda/hoy"');
 expect(html).not.toContain('href="/panel/clientas/');expect(html).not.toContain('>Clientas<');
 for(const module of modulosDisponibles(owner))expect(module.secciones.every(s=>s.listo)).toBe(true);
});
test('assigned navigation contains only agenda; no permissions contains no module destinations',async()=>{
 const assigned=await render({...owner,agendaScope:'assigned'});expect(assigned).toContain('href="/panel/agenda/hoy"');expect(assigned).not.toContain('href="/panel/finanzas/');
 const empty=await render(undefined);expect(modulosDisponibles(undefined)).toEqual([]);expect(empty).not.toContain('aria-label="Secciones de');
});
test('pending routes remain recognized with plain explanation and initial destination unchanged',()=>{
 const pending=ARBOL.flatMap(m=>m.secciones.filter(s=>!s.listo).map(s=>({m,s})));
 expect(pending.length).toBeGreaterThan(0);
 for(const {m,s} of pending)expect(buscarSeccion(buscarModulo(m.slug)!,s.slug)).toBe(s);
 const source=readFileSync(new URL('../routes/panel/$modulo/$seccion.tsx',import.meta.url),'utf8');
 expect(source).toContain('Esta función no está disponible');expect(source).not.toContain('está en el árbol del sistema');expect(ENTRADA).toBe('/panel/agenda/hoy');
});
