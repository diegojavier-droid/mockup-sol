import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
const out='.sites-runtime/operating-edge';
await mkdir(out,{recursive:true});
await build({entryPoints:['supabase/functions/sol-mai-site-operating/index.ts'],outfile:out+'/index.js',bundle:true,format:'esm',platform:'neutral',target:'es2022',packages:'external',legalComments:'none'});
await writeFile(out+'/deno.json',JSON.stringify({imports:{'hono':'npm:hono@4.12.27','hono/factory':'npm:hono@4.12.27/factory','hono/http-exception':'npm:hono@4.12.27/http-exception','hono/jwt':'npm:hono@4.12.27/jwt','zod':'npm:zod@3.25.76','@supabase/supabase-js':'npm:@supabase/supabase-js@2.110.0'},compilerOptions:{strict:true}},null,2)+'\n');
console.log(out+'/index.js');
