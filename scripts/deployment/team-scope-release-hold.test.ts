import {expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

test('standard production deploy stops before build or remote publication',()=>{
 const pkg=JSON.parse(readFileSync('package.json','utf8'));
 expect(pkg.scripts.deploy.startsWith('node scripts/deployment/team-scope-release-hold.mjs &&')).toBe(true);
 const result=spawnSync('node',['scripts/deployment/team-scope-release-hold.mjs'],{encoding:'utf8'});
 expect(result.status).toBe(1);
 expect(result.stderr).toContain('not been approved for production');
 expect(result.stderr).toContain('24-hour policy unchanged');
});

test('GitHub production jobs cannot bypass the release hold with direct Wrangler or DB CLI',()=>{
 for(const [file,jobName] of [
  ['cloudflare-deploy.yml','deploy'],
  ['supabase-schema-deploy.yml','deploy-schema'],
 ]) {
  const workflow=Bun.YAML.parse(readFileSync(`.github/workflows/${file}`,'utf8')) as any;
  const gate=workflow.jobs['production-release-gate'];
  const deploy=workflow.jobs[jobName];
  expect(deploy.needs).toBe('production-release-gate');
  expect(deploy.if).toBeUndefined();
  expect(gate['continue-on-error']).toBeUndefined();
  expect(gate.if).toBeUndefined();
  expect(gate.environment).toBeUndefined();
  expect(gate.env).toBeUndefined();
  expect(JSON.stringify(gate)).not.toContain('secrets.');
  expect(gate.steps).toHaveLength(2);
  expect(gate.steps[0].with['persist-credentials']).toBe(false);
  expect(gate.steps[1].run).toBe('node scripts/deployment/team-scope-release-hold.mjs');
  expect(gate.steps[1].if).toBeUndefined();
  expect(gate.steps[1]['continue-on-error']).toBeUndefined();
 }
});
