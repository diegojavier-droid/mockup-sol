import { resolve } from 'node:path';
/** Explicit fixture profile. Never inherited from ambient deployment/browser state. */
export function browserProfile(root, profile) {
  if (!['original', 'site-test'].includes(profile)) throw new Error('Explicit browser fixture profile required');
  return {
    alias: { '@': resolve(root, 'src'), '@deployment': resolve(root, 'src/deployment', profile) },
    tsconfig: resolve(root, profile === 'original' ? 'tsconfig.json' : 'tsconfig.site-test.json'),
  };
}
