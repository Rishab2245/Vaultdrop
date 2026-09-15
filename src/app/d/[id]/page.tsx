import type { Metadata } from 'next';
import { DropReader } from '@/components/DropReader';

// Deliberately excluded from search results and link previews: a private drop
// should not show up in anybody's index.
export const metadata: Metadata = {
  title: 'A private drop',
  description: 'Someone sent you something encrypted.',
  robots: { index: false, follow: false },
};

export default async function DropPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <DropReader id={id} />
    </div>
  );
}
