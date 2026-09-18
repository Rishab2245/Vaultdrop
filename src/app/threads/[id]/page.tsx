import type { Metadata } from 'next';
import { ThreadView } from '@/components/ThreadView';

export const metadata: Metadata = {
  title: 'Thread',
  robots: { index: false, follow: false },
};

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <ThreadView threadId={id} />
    </div>
  );
}
