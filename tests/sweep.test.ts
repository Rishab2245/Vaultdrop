import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { sweepExpired } from '@/lib/sweep';
import { POST as sweepRoute } from '@/app/api/maintenance/sweep/route';

const HOUR = 3_600_000;

async function makeDrop(expiresAt: Date) {
  return prisma.encryptedDrop.create({
    data: { ciphertext: 'Y2lwaGVy', iv: 'aXY=', expiresAt },
  });
}

function request(token?: string) {
  return new Request('http://t/api/maintenance/sweep', {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

beforeEach(async () => {
  await prisma.encryptedDrop.deleteMany({});
  delete process.env.CRON_SECRET;
});

describe('sweepExpired', () => {
  it('deletes expired drops and keeps live ones', async () => {
    await makeDrop(new Date(Date.now() - HOUR));
    await makeDrop(new Date(Date.now() - 1000));
    const live = await makeDrop(new Date(Date.now() + HOUR));

    expect(await sweepExpired()).toBe(2);

    const remaining = await prisma.encryptedDrop.findMany();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(live.id);
  });

  it('is safe to run when there is nothing to delete', async () => {
    await makeDrop(new Date(Date.now() + HOUR));
    expect(await sweepExpired()).toBe(0);
    expect(await prisma.encryptedDrop.count()).toBe(1);
  });
});

describe('POST /api/maintenance/sweep', () => {
  it('refuses to run when no secret is configured', async () => {
    const response = await sweepRoute(request('anything'));
    expect(response.status).toBe(503);
  });

  it('rejects a wrong or missing token', async () => {
    process.env.CRON_SECRET = 'correct-secret';
    expect((await sweepRoute(request())).status).toBe(401);
    expect((await sweepRoute(request('wrong'))).status).toBe(401);
  });

  it('sweeps with the right token', async () => {
    process.env.CRON_SECRET = 'correct-secret';
    await makeDrop(new Date(Date.now() - HOUR));

    const response = await sweepRoute(request('correct-secret'));
    expect(response.status).toBe(200);
    expect((await response.json()).deleted).toBe(1);
  });
});
