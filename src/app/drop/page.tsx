import type { Metadata } from 'next';
import { DropComposer } from '@/components/DropComposer';

export const metadata: Metadata = {
  title: 'Send a private drop',
  description:
    'Encrypt something in your browser and share a link. The key never reaches our servers.',
};

export default function DropPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <div className="sealed mb-4">Encrypted in your browser</div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Send a private drop</h1>
        <p className="mt-2 text-pretty leading-relaxed text-chalk-dim">
          For one person, not the Wall. This is encrypted here, on your device, and the key lives in
          the link you share - after the <code className="text-chalk">#</code>, which browsers never
          send to a server. We store bytes we cannot read.
        </p>
      </header>

      <DropComposer />
    </div>
  );
}
