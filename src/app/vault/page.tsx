import type { Metadata } from 'next';
import { LocalVault } from '@/components/LocalVault';

export const metadata: Metadata = {
  title: 'My vault',
  description: 'Everything this browser remembers. Stored here, not with us.',
  robots: { index: false, follow: false },
};

export default function VaultPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">My vault</h1>
        <p className="mt-2 text-pretty leading-relaxed text-chalk-dim">
          This page reads your browser, not our database. We could not build it server-side if we
          wanted to - nothing on our end links these to you.
        </p>
      </header>

      <LocalVault />
    </div>
  );
}
