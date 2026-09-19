import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { __resetRateLimits } from '@/lib/ratelimit';
import { realPublicKey } from './helpers';
import { deriveGhostIdFromSecret, sha256Base64 } from '@/lib/server-crypto';

import { GET as ghostGet, POST as ghostPost } from '@/app/api/ghost/route';
import { POST as wallPost } from '@/app/api/wall/route';
import {
  GET as commentsGet,
  POST as commentsPost,
} from '@/app/api/wall/[id]/comments/route';
import {
  DELETE as commentDelete,
  POST as commentAction,
} from '@/app/api/comments/[id]/route';
import { GET as leaderboardGet } from '@/app/api/leaderboard/route';

let seq = 0;
function req(url: string, init: RequestInit & { ghost?: string } = {}): Request {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-forwarded-for': `10.7.${Math.floor(seq / 250) % 250}.${++seq % 250}`,
  };
  if (init.ghost) headers.authorization = `Ghost ${init.ghost}`;
  return new Request(url, { ...init, headers });
}
const post = (u: string, b: unknown, g?: string) =>
  req(u, { method: 'POST', body: JSON.stringify(b), ghost: g });
const get = (u: string, g?: string) => req(u, { ghost: g });
const del = (u: string, g?: string) => req(u, { method: 'DELETE', ghost: g });
const params = <T extends Record<string, string>>(v: T) => ({ params: Promise.resolve(v) });

async function makeGhost(tag: string) {
  const secret = `c-${tag}-${Math.random().toString(36).slice(2)}`;
  const id = deriveGhostIdFromSecret(secret);
  await ghostPost(post('http://t/api/ghost', { id, publicKey: await realPublicKey() }));
  await ghostGet(get('http://t/api/ghost', secret));
  return { secret, id };
}

async function fileRecord(ghostSecret: string | undefined, extra: Record<string, unknown> = {}) {
  const r = await wallPost(
    post(
      'http://t/api/wall',
      {
        body: `A record about ${Math.random().toString(36).slice(2)} that nobody else has written.`,
        mood: 'confession',
        palette: 0,
        authorTokenHash: sha256Base64(`t${Math.random()}`),
        ...extra,
      },
      ghostSecret
    )
  );
  return (await r.json()).secret;
}

beforeEach(async () => {
  __resetRateLimits();
  await prisma.comment.deleteMany();
  await prisma.threadMessage.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.open.deleteMany();
  await prisma.report.deleteMany();
  await prisma.wallSecret.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.ghost.deleteMany();
});

describe('replies', () => {
  it('requires a ghost, so abuse carries a standing', async () => {
    const author = await makeGhost('a');
    const rec = await fileRecord(author.secret);

    const anon = await commentsPost(
      post(`http://t/api/wall/${rec.id}/comments`, { body: 'I have been here too.' }),
      params({ id: rec.id })
    );
    expect(anon.status).toBe(401);
  });

  it('posts, counts, and reports the writer standing', async () => {
    const author = await makeGhost('b');
    const replier = await makeGhost('c');
    const rec = await fileRecord(author.secret);

    const posted = await commentsPost(
      post(`http://t/api/wall/${rec.id}/comments`, { body: 'I have been exactly here.' }, replier.secret),
      params({ id: rec.id })
    );
    expect(posted.status).toBe(201);

    const listed = await commentsGet(get(`http://t/api/wall/${rec.id}/comments`), params({ id: rec.id }));
    const data = await listed.json();
    expect(data.comments).toHaveLength(1);
    expect(data.comments[0].author.standing).toBe('UNPROVEN');

    const row = await prisma.wallSecret.findUnique({ where: { id: rec.id } });
    expect(row!.commentCount).toBe(1);
  });

  it('marks a reply from the record author', async () => {
    const author = await makeGhost('d');
    const rec = await fileRecord(author.secret);

    await commentsPost(
      post(`http://t/api/wall/${rec.id}/comments`, { body: 'Thank you for reading this.' }, author.secret),
      params({ id: rec.id })
    );

    const listed = await commentsGet(
      get(`http://t/api/wall/${rec.id}/comments`, author.secret),
      params({ id: rec.id })
    );
    const data = await listed.json();
    expect(data.comments[0].byRecordAuthor).toBe(true);
    expect(data.isRecordAuthor).toBe(true);
  });

  it('screens a reply the same way it screens a record', async () => {
    const author = await makeGhost('e');
    const replier = await makeGhost('f');
    const rec = await fileRecord(author.secret);

    const threat = await commentsPost(
      post(
        `http://t/api/wall/${rec.id}/comments`,
        { body: 'I am going to kill you tomorrow at your address.' },
        replier.secret
      ),
      params({ id: rec.id })
    );
    expect(threat.status).toBe(422);

    const pii = await commentsPost(
      post(
        `http://t/api/wall/${rec.id}/comments`,
        { body: 'Message me on sam@example.com and we can talk about this properly.' },
        replier.secret
      ),
      params({ id: rec.id })
    );
    const data = await pii.json();
    expect(pii.status).toBe(201);
    expect(data.comment.body).not.toContain('example.com');
  });

  it('flattens a reply to a reply rather than nesting forever', async () => {
    const author = await makeGhost('g');
    const one = await makeGhost('h');
    const rec = await fileRecord(author.secret);

    const root = await commentsPost(
      post(`http://t/api/wall/${rec.id}/comments`, { body: 'The first thing anyone said.' }, one.secret),
      params({ id: rec.id })
    );
    const rootId = (await root.json()).comment.id;

    const child = await commentsPost(
      post(
        `http://t/api/wall/${rec.id}/comments`,
        { body: 'A reply to the first thing.', parentId: rootId },
        author.secret
      ),
      params({ id: rec.id })
    );
    const childId = (await child.json()).comment.id;

    const grandchild = await commentsPost(
      post(
        `http://t/api/wall/${rec.id}/comments`,
        { body: 'A reply to the reply, which should flatten.', parentId: childId },
        one.secret
      ),
      params({ id: rec.id })
    );
    // Attaches to the root, not to the child: one level, never two.
    expect((await grandchild.json()).comment.parentId).toBe(rootId);
  });

  it('lets the record author remove a reply from their own record', async () => {
    const author = await makeGhost('i');
    const replier = await makeGhost('j');
    const rec = await fileRecord(author.secret);

    const posted = await commentsPost(
      post(`http://t/api/wall/${rec.id}/comments`, { body: 'Something the author does not want.' }, replier.secret),
      params({ id: rec.id })
    );
    const commentId = (await posted.json()).comment.id;

    const removed = await commentDelete(del(`http://t/api/comments/${commentId}`, author.secret), params({ id: commentId }));
    expect(removed.status).toBe(200);
    expect((await removed.json()).removedBy).toBe('record_author');
    expect(await prisma.comment.count()).toBe(0);
  });

  it('keeps a stranger from removing somebody else&apos;s reply', async () => {
    const author = await makeGhost('k');
    const replier = await makeGhost('l');
    const stranger = await makeGhost('m');
    const rec = await fileRecord(author.secret);

    const posted = await commentsPost(
      post(`http://t/api/wall/${rec.id}/comments`, { body: 'A reply a stranger will try to delete.' }, replier.secret),
      params({ id: rec.id })
    );
    const commentId = (await posted.json()).comment.id;

    const attempt = await commentDelete(
      del(`http://t/api/comments/${commentId}`, stranger.secret),
      params({ id: commentId })
    );
    expect(attempt.status).toBe(403);
    expect(await prisma.comment.count()).toBe(1);
  });

  it('hides a reply once enough people flag it', async () => {
    const author = await makeGhost('n');
    const replier = await makeGhost('o');
    const rec = await fileRecord(author.secret);

    const posted = await commentsPost(
      post(`http://t/api/wall/${rec.id}/comments`, { body: 'A reply that several people will flag.' }, replier.secret),
      params({ id: rec.id })
    );
    const commentId = (await posted.json()).comment.id;

    for (let i = 0; i < 3; i++) {
      await commentAction(
        post(`http://t/api/comments/${commentId}`, { action: 'report' }),
        params({ id: commentId })
      );
    }

    const listed = await commentsGet(get(`http://t/api/wall/${rec.id}/comments`), params({ id: rec.id }));
    expect((await listed.json()).comments).toHaveLength(0);
  });

  it('refuses replies once the author closes the record', async () => {
    const author = await makeGhost('p');
    const replier = await makeGhost('q');
    const rec = await fileRecord(author.secret);

    await prisma.wallSecret.update({ where: { id: rec.id }, data: { commentsLocked: true } });

    const attempt = await commentsPost(
      post(`http://t/api/wall/${rec.id}/comments`, { body: 'Too late to say this.' }, replier.secret),
      params({ id: rec.id })
    );
    expect(attempt.status).toBe(409);
  });
});

describe('standing', () => {
  it('ranks nobody until there is enough evidence', async () => {
    const ghost = await makeGhost('r');
    await fileRecord(ghost.secret);

    const board = await leaderboardGet(get('http://t/api/leaderboard'));
    const data = await board.json();
    expect(data.ghosts).toHaveLength(0);
  });

  it('never puts a locked body in the hall of fame', async () => {
    // The leaderboard is one more path that can emit a body. It does not get
    // to be the one that leaks.
    const author = await makeGhost('s');
    const rec = await fileRecord(author.secret, {
      body: 'HALL-CANARY-2Z: the sealed body, which must not rank in the open.',
      teaser: 'A teaser that is perfectly safe to show anywhere.',
      isLocked: true,
      priceKeys: 2,
    });
    await prisma.wallSecret.update({
      where: { id: rec.id },
      data: { reactFelt: 40, worthItCount: 9 },
    });

    const board = await leaderboardGet(get('http://t/api/leaderboard'));
    const payload = JSON.stringify(await board.json());

    expect(payload).not.toContain('HALL-CANARY-2Z');
    expect(payload).toContain('perfectly safe to show anywhere');
  });

  it('ranks by the confirmed rate rather than by volume', async () => {
    const prolific = await makeGhost('t');
    const trusted = await makeGhost('u');

    // Read a great deal, liked about half the time.
    await prisma.ghost.update({
      where: { id: prolific.id },
      data: { opensReceived: 100, worthItCount: 50, notWorthCount: 50 },
    });
    // Read far less, but almost always worth it.
    await prisma.ghost.update({
      where: { id: trusted.id },
      data: { opensReceived: 10, worthItCount: 9, notWorthCount: 1 },
    });

    const board = await leaderboardGet(get('http://t/api/leaderboard'));
    const { ghosts } = await board.json();

    expect(ghosts[0].rate).toBe(90);
    expect(ghosts[0].standing).toBe('TRUSTED');
    expect(ghosts[1].rate).toBe(50);
  });
});
