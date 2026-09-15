import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How it works',
  description: 'The actual cryptography behind VaultDrop, in plain language.',
};

const STEPS = [
  {
    n: '01',
    title: 'Your browser makes the key',
    body: 'When you send a private drop, a 256-bit AES-GCM key is generated on your device. It is never uploaded. For inboxes we generate an ECDH P-256 keypair instead, and only the public half is ever published.',
  },
  {
    n: '02',
    title: 'Encryption happens before the network',
    body: 'The text is encrypted locally. What travels to our server is ciphertext and a nonce. There is no moment where we hold the readable version, so there is no moment where we could log it.',
  },
  {
    n: '03',
    title: 'The key rides in the fragment',
    body: 'Your link looks like /d/abc123#KEY. Everything after the # is the fragment, and browsers have never sent fragments to servers. It is not a promise we are making - it is how HTTP works.',
  },
  {
    n: '04',
    title: 'We forget on a timer',
    body: 'Every drop carries an expiry. One-time drops are deleted the instant they are claimed, using a conditional write so two people racing the same link cannot both win.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-20">
      <header className="mb-14">
        <div className="stamp mb-5">The mechanism</div>
        <h1 className="text-balance text-4xl font-semibold tracking-tight">How it works</h1>
        <p className="mt-4 max-w-xl leading-relaxed text-body">
          &ldquo;We respect your privacy&rdquo; is a sentence anyone can write. Here is the part
          that is checkable instead.
        </p>
      </header>

      <ol className="space-y-10">
        {STEPS.map((step) => (
          <li key={step.n} className="flex gap-5 sm:gap-7">
            <span className="shrink-0 font-mono text-sm text-amber">{step.n}</span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{step.title}</h2>
              <p className="mt-2 leading-relaxed text-body">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="border border-hairline mt-16 p-7">
        <h2 className="text-xl font-semibold tracking-tight">Where this does not protect you</h2>
        <p className="mt-3 leading-relaxed text-body">
          Being straight about the limits is part of the product:
        </p>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-body">
          <li>
            <strong className="text-chrome">The Wall is public and unencrypted.</strong> It has to
            be - everyone is meant to read it. Encrypting it would be theatre. Write accordingly.
          </li>
          <li>
            <strong className="text-chrome">Whoever holds the link can read the drop.</strong> If you
            send it over a channel that is already compromised, the encryption did not help. Add a
            passphrase and share that separately.
          </li>
          <li>
            <strong className="text-chrome">Your writing is identifying.</strong> Details, timing,
            and turn of phrase deanonymise people far more often than technical leaks do.
          </li>
          <li>
            <strong className="text-chrome">We serve the code that does the encrypting.</strong> A
            compromised server could ship malicious JavaScript. That is true of every browser-based
            E2E tool, ours included, which is why the source is public.
          </li>
          <li>
            <strong className="text-chrome">Lose your key, lose your messages.</strong> There is no
            reset link. That is the cost of us not having a copy.
          </li>
        </ul>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/drop" className="cmd-primary">
          Send an encrypted drop
        </Link>
        <Link href="/privacy" className="cmd">
          What we store
        </Link>
      </div>
    </div>
  );
}
