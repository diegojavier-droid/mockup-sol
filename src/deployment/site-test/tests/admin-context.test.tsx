import {expect,test} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {CustomerNote} from '@/components/booking/admin/CustomerNote';
import {AllergyScenarioNotice} from '@/components/booking/admin/AllergyScenarioNotice';
import type {AgendaEntry} from '@/lib/api/admin-hooks';
import {readFileSync} from 'node:fs';
test('authorized note is bounded plain text and absence stays absent',()=>{
 const entry={customer:null,customerNote:'Ejemplo <script>alert(1)</script>\nSegunda línea'} as unknown as AgendaEntry;
 const html=renderToStaticMarkup(<CustomerNote entry={entry}/>);
 expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>');expect(html).toContain('whitespace-pre-wrap');
 for(const note of [null,'','x'.repeat(501)])expect(renderToStaticMarkup(<CustomerNote entry={{...entry,customerNote:note}}/>)).toBe('');
});
test('allergy context keeps service names and ignores unknown answers',()=>{
 expect(renderToStaticMarkup(<AllergyScenarioNotice scenarios={undefined}/>)).toBe('');
 const html=renderToStaticMarkup(<AllergyScenarioNotice scenarios={[{serviceName:'Color',answer:'no'},{serviceName:'Maquillaje',answer:'si-leves'},{serviceName:'Oculto',answer:'unknown' as 'no'}]}/>);
 expect(html).toContain('Color');expect(html).toContain('Maquillaje');expect(html).not.toContain('Oculto');expect(html).toContain('No es diagnóstico');
});
test('Site owner boundary has no password auth and transport never adds bearer',()=>{
 const owner=readFileSync(new URL('../panel-access.tsx',import.meta.url),'utf8');
 const transport=readFileSync(new URL('../admin-transport.ts',import.meta.url),'utf8');
 expect(owner).toContain('if(identity.isError)');expect(owner).toContain('if(!identity.data)');expect(owner).not.toContain('staff-auth');
 expect(transport).toContain('credentials: "same-origin"');expect(transport).not.toContain('Bearer');expect(transport).not.toContain('Storage');
});

test('Site never mounts returning-customer identity or reads its browser token',()=>{
 const source=readFileSync(new URL('../../../routes/index.tsx',import.meta.url),'utf8');
 expect(source).toContain('!isSiteTest && Boolean(readCustomerToken())');
 expect(source).toContain('{!isSiteTest && <div className="pt-4">');
});
