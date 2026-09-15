import type { Metadata } from 'next';
import { Composer } from '@/components/Composer';

export const metadata: Metadata = {
  title: 'Confess',
  description: 'Post something anonymously to the Wall.',
};

export default function ConfessPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <h1 className="font-serif text-[2rem] leading-tight text-chrome">Say it</h1>
        <p className="mt-2 max-w-xl text-base leading-relaxed text-body">
          This is filed on the public Wall. No account, no name, no way back to you — but it is
          public, so write it like a stranger will read it out loud.
        </p>
      </header>

      <Composer />
    </div>
  );
}
