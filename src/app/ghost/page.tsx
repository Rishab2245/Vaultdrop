import type { Metadata } from 'next';
import { GhostPanel } from '@/components/GhostPanel';

export const metadata: Metadata = {
  title: 'My ghost',
  description: 'Your codename, Keys, standing, and recovery key.',
  robots: { index: false, follow: false },
};

export default function GhostPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <h1 className="font-serif text-[2rem] leading-tight text-chrome">My ghost</h1>
        <p className="mt-2 max-w-xl text-base leading-relaxed text-body">
          A codename, a Key balance, and a standing you earned. Not an account &mdash; there is
          nothing here we could hand over, because there is nothing here that points at a person.
        </p>
      </header>

      <GhostPanel />
    </div>
  );
}
