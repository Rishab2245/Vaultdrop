import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { normaliseHandle } from '@/lib/constants';
import { InboxSender } from '@/components/InboxSender';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const clean = normaliseHandle(handle);
  return {
    title: `Send /${clean} an anonymous message`,
    description: 'They will never know it was you. Encrypted so we cannot read it either.',
    openGraph: {
      title: `Tell /${clean} what you really think`,
      description: 'Anonymous and end-to-end encrypted. No account needed.',
    },
  };
}

export default async function SendPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const inbox = await prisma.inbox.findUnique({
    where: { handle: normaliseHandle(handle) },
    select: { handle: true, publicKey: true },
  });

  if (!inbox) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <InboxSender handle={inbox.handle} publicKey={inbox.publicKey} />
    </div>
  );
}
