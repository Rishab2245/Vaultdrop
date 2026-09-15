import type { Metadata } from 'next';
import { Composer } from '@/components/Composer';

export const metadata: Metadata = {
  title: 'Confess',
  description: 'Post something anonymously to the Wall.',
};

export default function ConfessPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Say it</h1>
        <p className="mt-2 text-pretty leading-relaxed text-chalk-dim">
          This goes on the public Wall. No account, no name, no way back to you - but it is public,
          so write it like a stranger will read it out loud.
        </p>
      </header>

      <Composer />
    </div>
  );
}
