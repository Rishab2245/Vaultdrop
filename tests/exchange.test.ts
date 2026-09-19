import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { __resetRateLimits } from '@/lib/ratelimit';
import { ECONOMY, refundFor } from '@/lib/economy';
import { deriveGhostIdFromSecret, sha256Base64 } from '@/lib/server-crypto';
import { settleStaleEscrow } from '@/lib/sweep';

import { GET as ghostGet, POST as ghostPost } from '@/app/api/ghost/route';
import { GET as wallGet, POST as wallPost } from '@/app/api/wall/route';
import { GET as secretGet } from '@/app/api/wall/[id]/route';
import { POST as openPost } from '@/app/api/wall/[id]/open/route';
import { POST as verdictPost } from '@/app/api/opens/[id]/verdict/route';
import {
  GET as threadKeyGet,
  POST as threadCreate,
} from '@/app/api/wall/[id]/thread/route';
import { GET as threadsGet } from '@/app/api/threads/route';
import {
  GET as messagesGet,
  POST as messagesPost,
} from '@/app/api/threads/[id]/messages/route';

let callerSeq = 0;

function req(url: string, init: RequestInit & { ghost?: string } = {}): Request {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-forwarded-for': `10.9.${Math.floor(callerSeq / 250) % 250}.${++callerSeq % 250}`,
  };
  if (init.ghost) headers.authorization = `Ghost ${init.ghost}`;
  return new Request(url, { ...init, headers });
}

function post(url: string, body: unknown, ghost?: string): Request {
  return req(url, { method: 'POST', body: JSON.stringify(body), ghost });
}

function get(url: string, ghost?: string): Request {
  return req(url, { ghost });
}

function params<T extends Record<string, string>>(value: T) {
  return { params: Promise.resolve(value) };
}

/** Register a ghost and hand back the secret its client would keep. */
async function makeGhost(tag: string) {
  const secret = `test-secret-${tag}-${Math.random().toString(36).slice(2)}`;
  const id = deriveGhostIdFromSecret(secret);
  const response = await ghostPost(
    post('http://t/api/ghost', { id, publicKey: `pk-${tag}-${'A'.repeat(40)}` })
  );
  expect(response.status).toBe(201);
  const codename = (await response.json()).codename as string;

  // Claim the daily grant up front. It lands on the first authenticated call of
  // the day, so without this it fires inside whichever request a test makes
  // first and quietly shifts every balance assertion by ECONOMY.dailyGrant.
  await ghostGet(get('http://t/api/ghost', secret));

  return { secret, id, codename };
}

async function fileRecord(
  ghostSecret: string | undefined,
  body: Record<string, unknown>
) {
  const response = await wallPost(
    post(
      'http://t/api/wall',
      {
        mood: 'confession',
        palette: 0,
        authorTokenHash: sha256Base64(`tok-${Math.random()}`),
        ...body,
      },
      ghostSecret
    )
  );
  return { status: response.status, data: await response.json() };
}

beforeEach(async () => {
  __resetRateLimits();
  await prisma.threadMessage.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.open.deleteMany();
  await prisma.report.deleteMany();
  await prisma.wallSecret.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.ghost.deleteMany();
});

describe('ghost identity', () => {
  it('registers with a welcome balance and a derived codename', async () => {
    const ghost = await makeGhost('a');
    expect(ghost.codename).toMatch(/^GHOST-[0-9A-F]{4}-[A-Z]$/);

    const me = await ghostGet(get('http://t/api/ghost', ghost.secret));
    const data = await me.json();
    expect(data.ghost.keys).toBe(ECONOMY.welcomeGrant + ECONOMY.dailyGrant);
    expect(data.ledger.some((e: { reason: string }) => e.reason === 'welcome')).toBe(true);
  });

  it('re-registering the same id restores rather than duplicating', async () => {
    const ghost = await makeGhost('b');
    const again = await ghostPost(
      post('http://t/api/ghost', { id: ghost.id, publicKey: 'pk-b' })
    );
    expect(again.status).toBe(200);
    expect((await again.json()).restored).toBe(true);
    expect(await prisma.ghost.count()).toBe(1);
  });

  it('refuses an unknown ghost secret', async () => {
    const me = await ghostGet(get('http://t/api/ghost', 'not-a-real-secret'));
    expect(me.status).toBe(401);
  });

  it('grants the daily keys once per UTC day, not once per request', async () => {
    const ghost = await makeGhost('c');
    await ghostGet(get('http://t/api/ghost', ghost.secret));
    await ghostGet(get('http://t/api/ghost', ghost.secret));
    const third = await ghostGet(get('http://t/api/ghost', ghost.secret));

    const data = await third.json();
    expect(data.ghost.keys).toBe(ECONOMY.welcomeGrant + ECONOMY.dailyGrant);
    expect(data.ledger.filter((e: { reason: string }) => e.reason === 'daily')).toHaveLength(1);
  });
});

describe('locked records', () => {
  it('never returns a locked body to someone who has not paid', async () => {
    // This is the exact bug the previous build shipped: content on every
    // secret, gated only in the React component.
    const author = await makeGhost('author');
    const { data } = await fileRecord(author.secret, {
      body: 'THE-SECRET-ITSELF-9K2P: the locked body nobody has paid for.',
      teaser: 'Something I have never told my family about that year.',
      isLocked: true,
      priceKeys: 3,
    });
    expect(data.secret.isLocked).toBe(true);

    const feed = await wallGet(get('http://t/api/wall'));
    const payload = JSON.stringify(await feed.json());

    expect(payload).not.toContain('THE-SECRET-ITSELF-9K2P');
    expect(payload).toContain('Something I have never told my family');
  });

  it('never returns a locked body from the single-record endpoint either', async () => {
    // Regression guard. The feed gated locked bodies correctly while
    // GET /api/wall/[id] returned `body` unconditionally, so anyone who knew an
    // id could read a sealed record for free - the same failure as the build
    // this one replaced, one route over. Every path that can emit `body` makes
    // this decision on its own; there is no single choke point.
    const author = await makeGhost('single-author');
    const { data } = await fileRecord(author.secret, {
      body: 'BY-ID-CANARY-3T: sealed, and not for the curious.',
      teaser: 'A teaser that is safe for anyone to read.',
      isLocked: true,
      priceKeys: 2,
    });
    const id = data.secret.id;

    const anon = await secretGet(get(`http://t/api/wall/${id}`), params({ id }));
    expect(JSON.stringify(await anon.json())).not.toContain('BY-ID-CANARY-3T');

    const stranger = await makeGhost('single-stranger');
    const signedIn = await secretGet(
      get(`http://t/api/wall/${id}`, stranger.secret),
      params({ id })
    );
    expect(JSON.stringify(await signedIn.json())).not.toContain('BY-ID-CANARY-3T');

    // The author can always read their own.
    const own = await secretGet(get(`http://t/api/wall/${id}`, author.secret), params({ id }));
    expect((await own.json()).secret.body).toContain('BY-ID-CANARY-3T');
  });

  it('returns the locked body by id once that ghost has paid for it', async () => {
    const author = await makeGhost('paid-author');
    const reader = await makeGhost('paid-reader');
    const { data } = await fileRecord(author.secret, {
      body: 'PAID-BY-ID-5R: visible only after the Keys moved.',
      teaser: 'Something worth the two Keys, I promise.',
      isLocked: true,
      priceKeys: 2,
    });
    const id = data.secret.id;

    await openPost(post(`http://t/api/wall/${id}/open`, {}, reader.secret), params({ id }));

    const after = await secretGet(get(`http://t/api/wall/${id}`, reader.secret), params({ id }));
    expect((await after.json()).secret.body).toContain('PAID-BY-ID-5R');
  });

  it('hides it from a signed-in ghost who has not opened it either', async () => {
    const author = await makeGhost('author2');
    await fileRecord(author.secret, {
      body: 'HIDDEN-FROM-STRANGERS-4Q: still sealed.',
      teaser: 'A teaser that gives away nothing at all.',
      isLocked: true,
      priceKeys: 2,
    });

    const stranger = await makeGhost('stranger');
    const feed = await wallGet(get('http://t/api/wall', stranger.secret));
    expect(JSON.stringify(await feed.json())).not.toContain('HIDDEN-FROM-STRANGERS-4Q');
  });

  it('requires a ghost to lock a record', async () => {
    const { status } = await fileRecord(undefined, {
      body: 'A locked record with nobody to pay.',
      teaser: 'A teaser without an author behind it.',
      isLocked: true,
      priceKeys: 3,
    });
    expect(status).toBe(401);
  });

  it('requires a teaser', async () => {
    const author = await makeGhost('author3');
    const { status } = await fileRecord(author.secret, {
      body: 'Locked with no teaser at all.',
      isLocked: true,
      priceKeys: 3,
    });
    expect(status).toBe(400);
  });
});

describe('the escrow lifecycle', () => {
  async function setup() {
    const author = await makeGhost('esc-author');
    const reader = await makeGhost('esc-reader');
    const { data } = await fileRecord(author.secret, {
      body: 'The paid body, revealed only after opening.',
      teaser: 'What I did the night before the wedding.',
      isLocked: true,
      priceKeys: 3,
    });
    return { author, reader, secretId: data.secret.id as string };
  }

  it('charges the reader, reveals the body, and pays the author nothing yet', async () => {
    const { author, reader, secretId } = await setup();

    const opened = await openPost(
      post(`http://t/api/wall/${secretId}/open`, {}, reader.secret),
      params({ id: secretId })
    );
    const data = await opened.json();

    expect(opened.status).toBe(200);
    expect(data.body).toContain('The paid body');
    expect(data.keys).toBe(ECONOMY.welcomeGrant + ECONOMY.dailyGrant - 3);

    // The author has earned nothing at this point - that is the whole design.
    const authorRow = await prisma.ghost.findUnique({ where: { id: author.id } });
    expect(authorRow!.keys).toBe(ECONOMY.welcomeGrant + ECONOMY.dailyGrant);
    expect(await prisma.open.count({ where: { status: 'escrow' } })).toBe(1);
  });

  it('pays the author when the reader says it was worth it', async () => {
    const { author, reader, secretId } = await setup();
    const opened = await openPost(
      post(`http://t/api/wall/${secretId}/open`, {}, reader.secret),
      params({ id: secretId })
    );
    const openId = (await opened.json()).open.id;

    const verdict = await verdictPost(
      post(`http://t/api/opens/${openId}/verdict`, { verdict: 'worth' }, reader.secret),
      params({ id: openId })
    );
    expect(verdict.status).toBe(200);

    const authorRow = await prisma.ghost.findUnique({ where: { id: author.id } });
    expect(authorRow!.keys).toBe(ECONOMY.welcomeGrant + ECONOMY.dailyGrant + 3);
    expect(authorRow!.worthItCount).toBe(1);
  });

  it('refunds most of the price and pays nothing when it was not', async () => {
    const { author, reader, secretId } = await setup();
    const opened = await openPost(
      post(`http://t/api/wall/${secretId}/open`, {}, reader.secret),
      params({ id: secretId })
    );
    const openId = (await opened.json()).open.id;

    const verdict = await verdictPost(
      post(`http://t/api/opens/${openId}/verdict`, { verdict: 'not_worth' }, reader.secret),
      params({ id: openId })
    );
    const data = await verdict.json();

    expect(data.refunded).toBe(refundFor(3));
    expect(data.keys).toBe(ECONOMY.welcomeGrant + ECONOMY.dailyGrant - 3 + refundFor(3));

    const authorRow = await prisma.ghost.findUnique({ where: { id: author.id } });
    expect(authorRow!.keys).toBe(ECONOMY.welcomeGrant + ECONOMY.dailyGrant);
    expect(authorRow!.notWorthCount).toBe(1);
  });

  it('refuses a second verdict on the same open', async () => {
    const { reader, secretId } = await setup();
    const opened = await openPost(
      post(`http://t/api/wall/${secretId}/open`, {}, reader.secret),
      params({ id: secretId })
    );
    const openId = (await opened.json()).open.id;

    await verdictPost(
      post(`http://t/api/opens/${openId}/verdict`, { verdict: 'worth' }, reader.secret),
      params({ id: openId })
    );
    const second = await verdictPost(
      post(`http://t/api/opens/${openId}/verdict`, { verdict: 'not_worth' }, reader.secret),
      params({ id: openId })
    );
    expect(second.status).toBe(409);
  });

  it('will not let a stranger rate somebody else&apos;s open', async () => {
    const { reader, secretId } = await setup();
    const opened = await openPost(
      post(`http://t/api/wall/${secretId}/open`, {}, reader.secret),
      params({ id: secretId })
    );
    const openId = (await opened.json()).open.id;

    const meddler = await makeGhost('meddler');
    const attempt = await verdictPost(
      post(`http://t/api/opens/${openId}/verdict`, { verdict: 'worth' }, meddler.secret),
      params({ id: openId })
    );
    expect(attempt.status).toBe(403);
  });

  it('does not charge twice for re-opening the same record', async () => {
    const { reader, secretId } = await setup();
    await openPost(
      post(`http://t/api/wall/${secretId}/open`, {}, reader.secret),
      params({ id: secretId })
    );
    const again = await openPost(
      post(`http://t/api/wall/${secretId}/open`, {}, reader.secret),
      params({ id: secretId })
    );
    const data = await again.json();

    expect(data.replay).toBe(true);
    expect(data.body).toContain('The paid body');
    expect(await prisma.open.count()).toBe(1);
  });

  it('refuses when the reader cannot afford it', async () => {
    const author = await makeGhost('rich');
    const { data } = await fileRecord(author.secret, {
      body: 'An expensive body.',
      teaser: 'The most expensive thing on the wall.',
      isLocked: true,
      priceKeys: ECONOMY.maxPrice,
    });

    const pauper = await makeGhost('pauper');
    await prisma.ghost.update({ where: { id: pauper.id }, data: { keys: 1 } });

    const attempt = await openPost(
      post(`http://t/api/wall/${data.secret.id}/open`, {}, pauper.secret),
      params({ id: data.secret.id })
    );
    expect(attempt.status).toBe(402);
    expect(await prisma.open.count()).toBe(0);
  });

  it('will not let an author open their own record', async () => {
    const { author, secretId } = await setup();
    const attempt = await openPost(
      post(`http://t/api/wall/${secretId}/open`, {}, author.secret),
      params({ id: secretId })
    );
    expect(attempt.status).toBe(400);
  });

  it('releases unrated escrow to the author once the window closes', async () => {
    const { author, reader, secretId } = await setup();
    const opened = await openPost(
      post(`http://t/api/wall/${secretId}/open`, {}, reader.secret),
      params({ id: secretId })
    );
    const openId = (await opened.json()).open.id;

    // Age the open past the rating window.
    await prisma.open.update({
      where: { id: openId },
      data: { createdAt: new Date(Date.now() - (ECONOMY.verdictWindowHours + 1) * 3_600_000) },
    });

    expect(await settleStaleEscrow()).toBe(1);

    const authorRow = await prisma.ghost.findUnique({ where: { id: author.id } });
    expect(authorRow!.keys).toBe(ECONOMY.welcomeGrant + ECONOMY.dailyGrant + 3);
    // Silence pays, but it is not an endorsement.
    expect(authorRow!.worthItCount).toBe(0);
    expect(authorRow!.opensReceived).toBe(1);
  });
});

describe('anti-farming', () => {
  it('stops paying an author a reader keeps coming back to', async () => {
    const author = await makeGhost('farm-a');
    const reader = await makeGhost('farm-b');
    await prisma.ghost.update({ where: { id: reader.id }, data: { keys: 100 } });

    const ids: string[] = [];
    for (let i = 0; i < ECONOMY.sameAuthorOpenCap + 1; i++) {
      const { data } = await fileRecord(author.secret, {
        body: `Locked body number ${i} with entirely distinct wording about topic ${i}.`,
        teaser: `Teaser number ${i}, about a completely different matter each time.`,
        isLocked: true,
        priceKeys: 1,
      });
      ids.push(data.secret.id);
    }

    const before = (await prisma.ghost.findUnique({ where: { id: author.id } }))!.keys;

    for (const id of ids) {
      const opened = await openPost(
        post(`http://t/api/wall/${id}/open`, {}, reader.secret),
        params({ id })
      );
      const openId = (await opened.json()).open.id;
      await verdictPost(
        post(`http://t/api/opens/${openId}/verdict`, { verdict: 'worth' }, reader.secret),
        params({ id: openId })
      );
    }

    const after = (await prisma.ghost.findUnique({ where: { id: author.id } }))!.keys;
    // Paid for the first `cap` opens only, not for all of them.
    expect(after - before).toBe(ECONOMY.sameAuthorOpenCap);
  });

  it('earns nothing for reposting an existing record', async () => {
    const original =
      'I have been pretending to understand my job for two years and I am terrified that someone will finally ask me a direct question.';

    const first = await makeGhost('orig');
    await fileRecord(first.secret, { body: original });

    const copycat = await makeGhost('copy');
    const before = (await prisma.ghost.findUnique({ where: { id: copycat.id } }))!.keys;

    const { data } = await fileRecord(copycat.secret, {
      body:
        'I HAVE been pretending to understand my job for two years, and I am terrified that someone will finally ask me a direct question!!!',
    });

    expect(data.isRepost).toBe(true);
    const after = (await prisma.ghost.findUnique({ where: { id: copycat.id } }))!.keys;
    expect(after).toBe(before);
  });

  it('pays for an original record', async () => {
    const ghost = await makeGhost('original');
    const before = (await prisma.ghost.findUnique({ where: { id: ghost.id } }))!.keys;

    const { data } = await fileRecord(ghost.secret, {
      body: 'A wholly unrelated confession about a bicycle I never returned to my neighbour.',
    });

    expect(data.isRepost).toBe(false);
    const after = (await prisma.ghost.findUnique({ where: { id: ghost.id } }))!.keys;
    expect(after).toBe(before + ECONOMY.fileReward);
  });
});

describe('same-threads', () => {
  it('routes an encrypted conversation neither side can be identified through', async () => {
    const author = await makeGhost('thr-author');
    const sameGhost = await makeGhost('thr-same');

    const { data } = await fileRecord(author.secret, {
      body: 'I still have not told anyone that I was the one who broke it.',
    });
    const secretId = data.secret.id;

    // The starter fetches the author's public key to seal against.
    const keyResponse = await threadKeyGet(
      get(`http://t/api/wall/${secretId}/thread`, sameGhost.secret),
      params({ id: secretId })
    );
    const keyData = await keyResponse.json();
    expect(keyData.reachable).toBe(true);
    expect(keyData.publicKey).toBeTruthy();

    const created = await threadCreate(
      post(
        `http://t/api/wall/${secretId}/thread`,
        {
          ciphertext: 'SEALED-OPENING-MESSAGE',
          iv: 'aXY=',
          senderPubKey: 'ephemeral-pub',
        },
        sameGhost.secret
      ),
      params({ id: secretId })
    );
    expect(created.status).toBe(201);
    const threadId = (await created.json()).threadId;

    // The author sees it and can read the counterpart key to reply.
    const list = await threadsGet(get('http://t/api/threads', author.secret));
    const threads = (await list.json()).threads;
    expect(threads).toHaveLength(1);
    expect(threads[0].role).toBe('author');

    const reply = await messagesPost(
      post(
        `http://t/api/threads/${threadId}/messages`,
        { ciphertext: 'SEALED-REPLY', iv: 'aXY=', senderPubKey: 'ephemeral-pub-2' },
        author.secret
      ),
      params({ id: threadId })
    );
    expect(reply.status).toBe(201);

    const read = await messagesGet(
      get(`http://t/api/threads/${threadId}/messages`, sameGhost.secret),
      params({ id: threadId })
    );
    const messages = (await read.json()).messages;
    expect(messages).toHaveLength(2);
    // The server stores and returns ciphertext; it never held the plaintext.
    expect(messages[0].ciphertext).toBe('SEALED-OPENING-MESSAGE');
  });

  it('keeps a third party out of somebody else&apos;s thread', async () => {
    const author = await makeGhost('priv-author');
    const starter = await makeGhost('priv-starter');
    const { data } = await fileRecord(author.secret, {
      body: 'A confession that two people are about to talk about privately.',
    });

    const created = await threadCreate(
      post(
        `http://t/api/wall/${data.secret.id}/thread`,
        { ciphertext: 'X', iv: 'aXY=', senderPubKey: 'pk' },
        starter.secret
      ),
      params({ id: data.secret.id })
    );
    const threadId = (await created.json()).threadId;

    const nosy = await makeGhost('nosy');
    const attempt = await messagesGet(
      get(`http://t/api/threads/${threadId}/messages`, nosy.secret),
      params({ id: threadId })
    );
    expect(attempt.status).toBe(403);
  });

  it('will not start a thread on your own record', async () => {
    const author = await makeGhost('self-thread');
    const { data } = await fileRecord(author.secret, {
      body: 'My own record, which I should not be able to thread on.',
    });

    const attempt = await threadCreate(
      post(
        `http://t/api/wall/${data.secret.id}/thread`,
        { ciphertext: 'X', iv: 'aXY=', senderPubKey: 'pk' },
        author.secret
      ),
      params({ id: data.secret.id })
    );
    expect(attempt.status).toBe(400);
  });

  it('cannot reach an anonymously filed record', async () => {
    const { data } = await fileRecord(undefined, {
      body: 'Filed with no ghost attached, so there is nobody to reach.',
    });

    const someone = await makeGhost('reacher');
    const keyResponse = await threadKeyGet(
      get(`http://t/api/wall/${data.secret.id}/thread`, someone.secret),
      params({ id: data.secret.id })
    );
    expect((await keyResponse.json()).reachable).toBe(false);
  });
});
