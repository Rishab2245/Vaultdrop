import type { Metadata } from 'next';
import { LocalVault } from '@/components/LocalVault';

export const metadata: Metadata = {
  title: 'My vault',
  description: 'Everything this browser remembers. Stored here, not with us.',
  robots: { index: false, follow: false },
};

export default function VaultPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <h1 className="font-serif text-[2rem] leading-tight text-chrome">My vault</h1>
        <p className="mt-2 max-w-xl text-base leading-relaxed text-body">
          This page reads your browser, not our database. We could not build it server-side if we
          wanted to — nothing on our end links these records to you.
        </p>
      </header>

      <LocalVault />
    </div>
  );
}
