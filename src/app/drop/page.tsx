import type { Metadata } from 'next';
import { DropComposer } from '@/components/DropComposer';

export const metadata: Metadata = {
  title: 'Send a private drop',
  description:
    'Encrypt something in your browser and share a link. The key never reaches our servers.',
};

export default function DropPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <span className="stamp">Encrypted on this device</span>
        <h1 className="mt-4 font-serif text-[2rem] leading-tight text-chrome">
          Send a private drop
        </h1>
        <p className="mt-2 max-w-xl text-base leading-relaxed text-body">
          For one person, not the Wall. Encrypted here, on your device, with the key living in the
          link you share — after the <span className="text-amber">#</span>, which browsers never
          transmit. This system stores bytes it cannot read.
        </p>
      </header>

      <DropComposer />
    </div>
  );
}
