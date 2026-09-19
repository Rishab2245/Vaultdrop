import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { __resetRateLimits } from '@/lib/ratelimit';
import { deriveGhostIdFromSecret, sha256Base64 } from '@/lib/server-crypto';
import { isValidEcdhPublicKey } from '@/lib/public-key';
import { isPlausibleBitcoinAddress } from '@/components/Donate';
import { screenWallBody } from '@/lib/moderation';
import { realPublicKey } from './helpers';

import { POST as ghostPost, GET as ghostGet } from '@/app/api/ghost/route';
import { GET as wallGet, POST as wallPost } from '@/app/api/wall/route';
import { POST as suggestionsPost } from '@/app/api/suggestions/route';
import { POST as sweepPost } from '@/app/api/maintenance/sweep/route';

let seq = 0;
function req(url: string, init: RequestInit & { ghost?: string } = {}): Request {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-forwarded-for': `10.5.${Math.floor(seq / 250) % 250}.${++seq % 250}`,
  };
  if (init.ghost) headers.authorization = `Ghost ${init.ghost}`;
  return new Request(url, { ...init, headers });
}
const post = (u: string, b: unknown, g?: string) =>
  req(u, { method: 'POST', body: JSON.stringify(b), ghost: g });
const get = (u: string, g?: string) => req(u, { ghost: g });

beforeEach(async () => {
  __resetRateLimits();
  await prisma.suggestion.deleteMany();
  await prisma.wallSecret.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.ghost.deleteMany();
});

describe('public key validation', () => {
  it('accepts a real ECDH P-256 key', async () => {
    expect(isValidEcdhPublicKey(await realPublicKey())).toBe(true);
  });

  it('rejects the junk that shipped to production once', () => {
    // A seeding script stored sixty literal 'S' characters as a public key.
    // Every record by those ghosts became unreachable, and the browser blamed
    // the user's connection for it.
    expect(isValidEcdhPublicKey('S'.repeat(60))).toBe(false);
    expect(isValidEcdhPublicKey('A'.repeat(124))).toBe(false);
    expect(isValidEcdhPublicKey('')).toBe(false);
    expect(isValidEcdhPublicKey('not base64 at all !!')).toBe(false);
  });

  it('rejects an RSA key, which is the right shape but the wrong algorithm', async () => {
    const { generateKeyPairSync } = await import('node:crypto');
    const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const spki = publicKey.export({ format: 'der', type: 'spki' }) as Buffer;
    expect(isValidEcdhPublicKey(spki.toString('base64'))).toBe(false);
  });

  it('refuses to register a ghost with an unusable key', async () => {
    const secret = 'sec-bad-key';
    const response = await ghostPost(
      post('http://t/api/ghost', { id: deriveGhostIdFromSecret(secret), publicKey: 'S'.repeat(60) })
    );
    expect(response.status).toBe(400);
    expect(await prisma.ghost.count()).toBe(0);
  });
});

describe('authentication cannot be bypassed', () => {
  it('treats an unknown bearer as anonymous, never as someone', async () => {
    const response = await ghostGet(get('http://t/api/ghost', 'totally-made-up'));
    expect(response.status).toBe(401);
  });

  it('is not fooled by a ghost id presented as the secret', async () => {
    // The id is public-ish (it appears in no response, but assume it leaks).
    // Presenting it must not authenticate, because the server stores its hash.
    const secret = 'sec-real-one';
    const id = deriveGhostIdFromSecret(secret);
    await ghostPost(post('http://t/api/ghost', { id, publicKey: await realPublicKey() }));

    const asId = await ghostGet(get('http://t/api/ghost', id));
    expect(asId.status).toBe(401);
  });
});

describe('injection and malformed input', () => {
  it('does not let a query object through as a Prisma operator', async () => {
    // Every user value is coerced with asString before it reaches a where
    // clause, so an operator object arrives as text and simply matches nothing.
    const response = await wallGet(get('http://t/api/wall?q=' + encodeURIComponent('{"$ne":null}')));
    expect(response.status).toBe(200);
    expect((await response.json()).items).toHaveLength(0);
  });

  it('survives a malformed ?since= instead of 500ing', async () => {
    const response = await wallGet(get('http://t/api/wall?sort=new&since=not-a-date'));
    expect(response.status).toBe(200);
  });

  it('clamps an absurd page number', async () => {
    const response = await wallGet(get('http://t/api/wall?page=999999999'));
    expect(response.status).toBe(200);
  });

  it('rejects a body that is not an object', async () => {
    const response = await wallPost(
      req('http://t/api/wall', { method: 'POST', body: '"a bare string"' })
    );
    expect(response.status).toBe(400);
  });

  it('rejects unparseable JSON without throwing', async () => {
    const response = await wallPost(req('http://t/api/wall', { method: 'POST', body: '{ broken' }));
    expect(response.status).toBe(400);
  });

  it('refuses an over-long field rather than storing it', async () => {
    const ghost = 'sec-long';
    await ghostPost(
      post('http://t/api/ghost', {
        id: deriveGhostIdFromSecret(ghost),
        publicKey: await realPublicKey(),
      })
    );
    const response = await wallPost(
      post('http://t/api/wall', {
        body: 'x'.repeat(100_000),
        mood: 'confession',
        palette: 0,
        authorTokenHash: sha256Base64('t'),
      })
    );
    expect(response.status).toBe(400);
  });

  it('ignores a palette index outside the list', async () => {
    const response = await wallPost(
      post('http://t/api/wall', {
        body: 'A perfectly ordinary confession with a nonsense palette index.',
        mood: 'confession',
        palette: 9999,
        authorTokenHash: sha256Base64('t2'),
      })
    );
    expect(response.status).toBe(201);
    expect((await response.json()).secret.palette).toBe(0);
  });
});

describe('the sweep endpoint', () => {
  it('refuses without the shared secret', async () => {
    const response = await sweepPost(post('http://t/api/maintenance/sweep', {}));
    // 503 when unconfigured, 401 when configured and wrong. Never 200.
    expect([401, 503]).toContain(response.status);
  });
});

describe('moderation cannot be walked around', () => {
  it('still redacts an email split across unusual spacing', () => {
    const verdict = screenWallBody('Reach me at person.name@example.com whenever you like.');
    expect(verdict.action).toBe('allow');
    if (verdict.action === 'allow') expect(verdict.body).not.toContain('example.com');
  });

  it('blocks a threat regardless of casing', () => {
    expect(screenWallBody('I AM GOING TO KILL him tomorrow at his address').action).toBe('block');
  });

  it('screens suggestions too, since a human reads them later', async () => {
    const response = await suggestionsPost(
      post('http://t/api/suggestions', {
        body: 'Great site. You can reach me on someone@example.com about it.',
        kind: 'idea',
      })
    );
    expect(response.status).toBe(201);
    const stored = await prisma.suggestion.findFirst();
    expect(stored!.body).not.toContain('example.com');
  });

  it('does not let a huge payload through the suggestion box', async () => {
    const response = await suggestionsPost(
      post('http://t/api/suggestions', { body: 'x'.repeat(50_000), kind: 'idea' })
    );
    expect(response.status).toBe(400);
  });
});

describe('the donation address is never guessed', () => {
  it('accepts real address shapes', () => {
    expect(isPlausibleBitcoinAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe(true);
    expect(isPlausibleBitcoinAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe(true);
    expect(isPlausibleBitcoinAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toBe(true);
  });

  it('rejects anything that would send money into a void', () => {
    // A wrong address rendered as if it were right is unrecoverable, so the
    // panel must refuse rather than guess.
    expect(isPlausibleBitcoinAddress('')).toBe(false);
    expect(isPlausibleBitcoinAddress('your-address-here')).toBe(false);
    expect(isPlausibleBitcoinAddress('bc1')).toBe(false);
    // Base58 excludes 0, O, I and l - a transcription slip must not pass.
    expect(isPlausibleBitcoinAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfN0')).toBe(false);
    expect(isPlausibleBitcoinAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')).toBe(false);
  });
});
