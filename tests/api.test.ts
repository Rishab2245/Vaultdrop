import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { __resetRateLimits } from '@/lib/ratelimit';
import { sha256Base64 } from '@/lib/server-crypto';

import { GET as wallGet, POST as wallPost } from '@/app/api/wall/route';
import { DELETE as wallDelete } from '@/app/api/wall/[id]/route';
import { POST as reactPost } from '@/app/api/wall/[id]/react/route';
import { POST as reportPost } from '@/app/api/wall/[id]/report/route';
import { POST as dropsPost } from '@/app/api/drops/route';
import { GET as dropGet } from '@/app/api/drops/[id]/route';
import { POST as dropOpen } from '@/app/api/drops/[id]/open/route';
import { POST as inboxCreate } from '@/app/api/inboxes/route';
import {
  GET as inboxMessagesGet,
  POST as inboxMessagesPost,
} from '@/app/api/inboxes/[handle]/messages/route';

/** Each call gets a unique forwarded-for so tests do not exhaust each other's budget. */
let callerSeq = 0;
function post(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': `10.0.0.${++callerSeq % 250}`,
    },
    body: JSON.stringify(body),
  });
}

function get(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, {
    headers: { 'x-forwarded-for': `10.0.1.${++callerSeq % 250}`, ...headers },
  });
}

function params<T extends Record<string, string>>(value: T) {
  return { params: Promise.resolve(value) };
}

async function createSecret(body = 'A perfectly ordinary secret that should pass screening.') {
  const token = 'token-' + Math.random().toString(36).slice(2);
  const response = await wallPost(
    post('http://t/api/wall', {
      body,
      mood: 'confession',
      palette: 1,
      authorTokenHash: sha256Base64(token),
    })
  );
  return { response, data: await response.json(), token };
}

beforeEach(async () => {
  __resetRateLimits();
  await prisma.report.deleteMany({});
  await prisma.wallSecret.deleteMany({});
  await prisma.encryptedDrop.deleteMany({});
  await prisma.inbox.deleteMany({});
});

describe('POST /api/wall', () => {
  it('creates a secret and returns it without author fields', async () => {
    const { response, data } = await createSecret();
    expect(response.status).toBe(201);
    expect(data.secret.body).toContain('perfectly ordinary');

    // The response must never carry anything that links back to the writer.
    const serialised = JSON.stringify(data.secret);
    expect(serialised).not.toContain('authorTokenHash');
    expect(serialised).not.toContain('token-');
  });

  it('rejects a body that is too short', async () => {
    const response = await wallPost(
      post('http://t/api/wall', { body: 'hi', mood: 'confession', authorTokenHash: 'x' })
    );
    expect(response.status).toBe(400);
  });

  it('rejects an unknown mood', async () => {
    const response = await wallPost(
      post('http://t/api/wall', {
        body: 'Something long enough to pass the length check.',
        mood: 'not-a-mood',
        authorTokenHash: 'x',
      })
    );
    expect(response.status).toBe(400);
  });

  it('refuses content the screener blocks', async () => {
    const response = await wallPost(
      post('http://t/api/wall', {
        body: 'I am going to kill him when he gets home tonight.',
        mood: 'rage',
        authorTokenHash: 'x',
      })
    );
    expect(response.status).toBe(422);
  });

  it('strips contact details before storing', async () => {
    const { data } = await createSecret('Message me at leaker@example.com about all of this.');
    expect(data.secret.body).not.toContain('example.com');
    expect(data.redactions).toBeGreaterThan(0);

    const stored = await prisma.wallSecret.findUnique({ where: { id: data.secret.id } });
    expect(stored?.body).not.toContain('example.com');
  });

  it('falls back to the first palette when given a bad index', async () => {
    const response = await wallPost(
      post('http://t/api/wall', {
        body: 'Palette index is out of range on purpose here.',
        mood: 'joy',
        palette: 999,
        authorTokenHash: 'x',
      })
    );
    const data = await response.json();
    expect(data.secret.palette).toBe(0);
  });
});

describe('GET /api/wall', () => {
  it('hides reported-and-hidden secrets from the feed', async () => {
    const { data } = await createSecret();
    await prisma.wallSecret.update({ where: { id: data.secret.id }, data: { hidden: true } });

    const feed = await (await wallGet(get('http://t/api/wall'))).json();
    expect(feed.items.find((s: { id: string }) => s.id === data.secret.id)).toBeUndefined();
  });

  it('filters by mood', async () => {
    await createSecret();
    const feed = await (await wallGet(get('http://t/api/wall?mood=rage'))).json();
    expect(feed.items).toHaveLength(0);
  });

  it('surfaces a brand-new secret in the hot feed', async () => {
    // Regression guard: with no seed point a fresh secret scores zero and is
    // invisible forever, which silently kills the wall.
    const { data } = await createSecret();
    const feed = await (await wallGet(get('http://t/api/wall?sort=hot'))).json();
    expect(feed.items[0].id).toBe(data.secret.id);
  });
});

describe('DELETE /api/wall/[id]', () => {
  it('deletes with the right token', async () => {
    const { data, token } = await createSecret();
    const response = await wallDelete(
      post(`http://t/api/wall/${data.secret.id}`, { authorTokenHash: sha256Base64(token) }),
      params({ id: data.secret.id })
    );
    expect(response.status).toBe(200);
    expect(await prisma.wallSecret.count()).toBe(0);
  });

  it('refuses a wrong token', async () => {
    const { data } = await createSecret();
    const response = await wallDelete(
      post(`http://t/api/wall/${data.secret.id}`, { authorTokenHash: sha256Base64('nope') }),
      params({ id: data.secret.id })
    );
    expect(response.status).toBe(403);
    expect(await prisma.wallSecret.count()).toBe(1);
  });
});

describe('reactions', () => {
  it('increments and undoes without going negative', async () => {
    const { data } = await createSecret();
    const id = data.secret.id;

    await reactPost(post(`http://t/r`, { reaction: 'felt' }), params({ id }));
    let state = await (await reactPost(post(`http://t/r`, { reaction: 'felt' }), params({ id }))).json();
    expect(state.reactions.felt).toBe(2);

    await reactPost(post(`http://t/r`, { reaction: 'felt', undo: true }), params({ id }));
    await reactPost(post(`http://t/r`, { reaction: 'felt', undo: true }), params({ id }));
    state = await (
      await reactPost(post(`http://t/r`, { reaction: 'felt', undo: true }), params({ id }))
    ).json();
    expect(state.reactions.felt).toBe(0);
  });

  it('rejects an unknown reaction', async () => {
    const { data } = await createSecret();
    const response = await reactPost(
      post('http://t/r', { reaction: 'shrug' }),
      params({ id: data.secret.id })
    );
    expect(response.status).toBe(400);
  });

  it('stores no per-person reaction record', async () => {
    const { data } = await createSecret();
    await reactPost(post('http://t/r', { reaction: 'hug' }), params({ id: data.secret.id }));

    // There is deliberately no table that could answer "who reacted".
    expect(Object.keys(prisma)).not.toContain('reaction');
  });
});

describe('reports', () => {
  it('auto-hides a secret once the threshold is reached', async () => {
    const { data } = await createSecret();
    const id = data.secret.id;

    for (let i = 0; i < 3; i++) {
      await reportPost(post('http://t/report', { reason: 'doxxing' }), params({ id }));
    }

    const stored = await prisma.wallSecret.findUnique({ where: { id } });
    expect(stored?.hidden).toBe(true);
    expect(stored?.reportCount).toBe(3);
  });

  it('rejects an unknown reason', async () => {
    const { data } = await createSecret();
    const response = await reportPost(
      post('http://t/report', { reason: 'because' }),
      params({ id: data.secret.id })
    );
    expect(response.status).toBe(400);
  });
});

describe('encrypted drops', () => {
  const payload = { ciphertext: 'Y2lwaGVy', iv: 'aXZpdml2', expiry: '24h' };

  it('stores a drop and describes it without revealing the ciphertext', async () => {
    const created = await (await dropsPost(post('http://t/api/drops', payload))).json();

    const meta = await (await dropGet(get('http://t/d'), params({ id: created.id }))).json();
    expect(meta.id).toBe(created.id);
    expect(meta).not.toHaveProperty('ciphertext');
  });

  it('does not burn a one-time drop just for being previewed', async () => {
    // A link-preview bot hitting GET must not destroy the secret.
    const created = await (
      await dropsPost(post('http://t/api/drops', { ...payload, burnAfterRead: true }))
    ).json();

    await dropGet(get('http://t/d'), params({ id: created.id }));
    await dropGet(get('http://t/d'), params({ id: created.id }));

    expect(await prisma.encryptedDrop.count()).toBe(1);
  });

  it('stores readAt as an explicit null so the burn claim can match it', async () => {
    // MongoDB regression guard. An optional field that is never written is
    // ABSENT from the document, not null, and a `readAt: null` filter does not
    // match a missing field - so the conditional claim in drops/[id]/open
    // matched nothing and every first read 404'd. The fix is to write the null;
    // this test fails if anyone tidies that away.
    const created = await (
      await dropsPost(post('http://t/api/drops', { ...payload, burnAfterRead: true }))
    ).json();

    const claimed = await prisma.encryptedDrop.updateMany({
      where: { id: created.id, readAt: null },
      data: { readAt: new Date() },
    });
    expect(claimed.count).toBe(1);
  });

  it('burns exactly once', async () => {
    const created = await (
      await dropsPost(post('http://t/api/drops', { ...payload, burnAfterRead: true }))
    ).json();

    const first = await dropOpen(post('http://t/o', {}), params({ id: created.id }));
    expect(first.status).toBe(200);
    expect((await first.json()).burned).toBe(true);

    const second = await dropOpen(post('http://t/o', {}), params({ id: created.id }));
    expect(second.status).toBe(404);
    expect(await prisma.encryptedDrop.count()).toBe(0);
  });

  it('lets a non-burn drop be opened repeatedly', async () => {
    const created = await (
      await dropsPost(post('http://t/api/drops', { ...payload, burnAfterRead: false }))
    ).json();

    expect((await dropOpen(post('http://t/o', {}), params({ id: created.id }))).status).toBe(200);
    expect((await dropOpen(post('http://t/o', {}), params({ id: created.id }))).status).toBe(200);
  });

  it('treats an expired drop as gone and cleans it up', async () => {
    const created = await (await dropsPost(post('http://t/api/drops', payload))).json();
    await prisma.encryptedDrop.update({
      where: { id: created.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const response = await dropGet(get('http://t/d'), params({ id: created.id }));
    expect(response.status).toBe(404);
    expect(await prisma.encryptedDrop.count()).toBe(0);
  });

  it('rejects an unknown expiry window', async () => {
    const response = await dropsPost(post('http://t/api/drops', { ...payload, expiry: 'forever' }));
    expect(response.status).toBe(400);
  });
});

describe('inboxes', () => {
  const publicKey = 'cHVibGljLWtleS1wbGFjZWhvbGRlcg==';

  async function makeInbox(handle: string, token = 'owner-token') {
    const response = await inboxCreate(
      post('http://t/api/inboxes', {
        handle,
        publicKey,
        ownerTokenHash: sha256Base64(token),
      })
    );
    return { response, token };
  }

  it('claims a handle', async () => {
    const { response } = await makeInbox('nightowl');
    expect(response.status).toBe(201);
  });

  it('refuses a duplicate handle', async () => {
    await makeInbox('nightowl');
    const { response } = await makeInbox('nightowl');
    expect(response.status).toBe(409);
  });

  it('refuses a reserved handle', async () => {
    const { response } = await makeInbox('admin');
    expect(response.status).toBe(400);
  });

  it('never stores a private key', async () => {
    await makeInbox('nightowl');
    const stored = await prisma.inbox.findUnique({ where: { handle: 'nightowl' } });
    expect(Object.keys(stored ?? {})).not.toContain('privateKey');
  });

  it('accepts a message and returns nothing that probes the inbox', async () => {
    await makeInbox('nightowl');
    const response = await inboxMessagesPost(
      post('http://t/m', { ciphertext: 'Y2lwaGVy', iv: 'aXY=', senderPubKey: 'a2V5' }),
      params({ handle: 'nightowl' })
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ sent: true });
  });

  it('requires the owner token to collect messages', async () => {
    await makeInbox('nightowl');

    const noToken = await inboxMessagesGet(get('http://t/m'), params({ handle: 'nightowl' }));
    expect(noToken.status).toBe(401);

    const wrongToken = await inboxMessagesGet(
      get('http://t/m', { 'x-owner-token-hash': sha256Base64('wrong') }),
      params({ handle: 'nightowl' })
    );
    expect(wrongToken.status).toBe(403);
  });

  it('returns messages to the real owner', async () => {
    const { token } = await makeInbox('nightowl');
    await inboxMessagesPost(
      post('http://t/m', { ciphertext: 'Y2lwaGVy', iv: 'aXY=', senderPubKey: 'a2V5' }),
      params({ handle: 'nightowl' })
    );

    const response = await inboxMessagesGet(
      get('http://t/m', { 'x-owner-token-hash': sha256Base64(token) }),
      params({ handle: 'nightowl' })
    );
    const data = await response.json();
    expect(data.messages).toHaveLength(1);
    expect(data.messages[0].ciphertext).toBe('Y2lwaGVy');
  });

  it('does not let one inbox owner read another inbox', async () => {
    await makeInbox('alice', 'alice-token');
    await makeInbox('bob', 'bob-token');

    const response = await inboxMessagesGet(
      get('http://t/m', { 'x-owner-token-hash': sha256Base64('alice-token') }),
      params({ handle: 'bob' })
    );
    expect(response.status).toBe(403);
  });
});

describe('rate limiting', () => {
  it('refuses a caller who floods the wall', async () => {
    const caller = { 'x-forwarded-for': '203.0.113.9' };
    const body = {
      body: 'A perfectly ordinary secret that should pass screening.',
      mood: 'confession',
      authorTokenHash: 'x',
    };

    const make = () =>
      new Request('http://t/api/wall', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...caller },
        body: JSON.stringify(body),
      });

    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await wallPost(make())).status);

    expect(statuses.filter((s) => s === 201)).toHaveLength(5);
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
  });
});
