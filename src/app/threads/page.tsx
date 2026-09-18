import type { Metadata } from 'next';
import { ThreadList } from '@/components/ThreadList';

export const metadata: Metadata = {
  title: 'Threads',
  description: 'Private encrypted conversations with people who have been where you are.',
  robots: { index: false, follow: false },
};

export default function ThreadsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <h1 className="font-serif text-[2rem] leading-tight text-chrome">Threads</h1>
        <p className="mt-2 max-w-xl text-base leading-relaxed text-body">
          Private conversations that started because someone recognised themselves in what you
          wrote. Encrypted on both devices &mdash; this system routes them without being able to
          read them.
        </p>
      </header>

      <ThreadList />
    </div>
  );
}
