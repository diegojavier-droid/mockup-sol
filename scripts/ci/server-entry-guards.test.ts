import { expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('both legacy CI paths use the exact deployment entrypoint guard', () => {
  for (const [file, name] of [
    ['backend-scaffold.yml', 'Guard frontend against server/ imports'],
    ['database-clean-room.yml', 'Run repository guards'],
  ]) {
    const workflow = Bun.YAML.parse(readFileSync(`.github/workflows/${file}`, 'utf8')) as any;
    const steps = Object.values(workflow.jobs).flatMap((job: any) => job.steps ?? []);
    const step = steps.find((step: any) => step.name === name) as any;
    expect(step.run).toContain('bun run check:deployment');
    expect(step['continue-on-error']).toBeUndefined();
    expect(step.if).toBeUndefined();
  }
});

test('deployment guard permits only the two configured entries, not a browser server.ts', () => {
  const dir = mkdtempSync('src/ci-guard-');
  try {
    // A broad filename exclusion would incorrectly allow this client module.
    const path = join(dir, 'server.ts');
    for (const source of [
      `import { forbidden } from '../../server/src/config/env';`,
      `const forbidden = import('../../server/src/config/env');`,
    ]) {
      writeFileSync(path, source);
      const result = spawnSync('node', ['scripts/deployment/check-boundaries.mjs'], { encoding: 'utf8' });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(`Browser source imports server-only code: ${path}`);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
