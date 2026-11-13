import { z } from 'zod';
export const publicKeySchema = z.object({ kty: z.literal('EC'), crv: z.literal('P-256'),
  x: z.string().regex(/^[A-Za-z0-9_-]{43}$/), y: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  kid: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/), alg: z.literal('ES256'),
  use: z.literal('sig').optional(), key_ops: z.array(z.literal('verify')).optional(), ext: z.boolean().optional(),
}).strict();
export type SigningPublicKey = z.infer<typeof publicKeySchema>;
export async function sha256(value: string | Uint8Array): Promise<string> {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer))].map(b => b.toString(16).padStart(2, '0')).join('');
}
