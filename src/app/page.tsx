import Link from 'next/link';
import { prisma } from '@/lib/db';
import { compactNumber } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PATHS = [
  {
    href: '/confess',
    code: 'WALL',
    title: 'File a public record',
    body: 'Say it out loud, to everyone, with nothing attached to your name. Other people say "same" more often than you would think.',
  },
  {
    href: '/drop',
    code: 'DROP',
    title: 'Send an encrypted drop',
    body: 'For one person. Encrypted on your device, opened once, then destroyed. The key rides in the link fragment and never reaches this system.',
  },
  {
    href: '/inbox',
    code: 'INBOX',
    title: 'Open an anonymous inbox',
    body: 'Publish a handle and find out what people actually think. Only your device holds the key that decrypts what comes back.',
  },
];

async function getStats() {
  try {
    const [secrets, reactions] = await Promise.all([
      prisma.wallSecret.count({ where: { hidden: false } }),
      prisma.wallSecret.aggregate({
        _sum: { reactFelt: true, reactHug: true, reactWhoa: true, reactSame: true },
      }),
    ]);

    const sum = reactions._sum;
    return {
      secrets,
      reactions:
        (sum.reactFelt ?? 0) + (sum.reactHug ?? 0) + (sum.reactWhoa ?? 0) + (sum.reactSame ?? 0),
    };
  } catch {
    // A cold database must not take the landing page down with it.
    return { secrets: 0, reactions: 0 };
  }
}

export default async function HomePage() {
  const stats = await getStats();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <section>
        {/*
          The headline is the thesis: the system can print the sentence, and
          cannot print who said it. The bar is real - it marks the one field
          nothing in this architecture can fill.
        */}
        <h1 className="font-serif text-[clamp(2rem,6.5vw,3.4rem)] font-normal leading-[1.08] text-chrome">
          Say it without{' '}
          <span className="redact" aria-label="saying who">
            saying who
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-body">
          A record system for the things you cannot put your name on. No account, no email, no
          phone number, no IP log — and for anything private, no key on our side to read it with.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/wall" className="cmd-primary no-underline">
            F1: Read the wall
          </Link>
          <Link href="/confess" className="cmd no-underline">
            F2: File a record
          </Link>
        </div>

        {stats.secrets > 0 && (
          <p className="mt-5 text-2xs uppercase tracking-[0.12em] tabular text-label">
            {compactNumber(stats.secrets)} records on file
            {stats.reactions > 0 && ` · ${compactNumber(stats.reactions)} marked "same"`}
          </p>
        )}
      </section>

      <section className="mt-12 grid gap-2 md:grid-cols-3">
        {PATHS.map((path) => (
          <Link
            key={path.href}
            href={path.href}
            className="group border border-hairline no-underline hover:border-amber"
          >
            <div className="border-b border-hairline bg-panel px-2 py-1">
              <span className="field group-hover:text-amber">{path.code}</span>
            </div>
            <div className="p-3">
              <h2 className="font-serif text-read text-chrome">{path.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-label">{path.body}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="mt-12 border border-hairline">
        <div className="rec-head">
          <span>SYSTEM · DATA HELD</span>
          <span className="ml-auto text-sealed">VERIFIABLE</span>
        </div>

        <div className="p-4">
          <h2 className="font-serif text-[1.5rem] leading-tight text-chrome">
            Most anonymous apps mean{' '}
            <span className="italic">anonymous to other users</span>.
          </h2>

          <p className="mt-3 max-w-2xl text-base leading-relaxed text-body">
            They still know your device, your IP, your phone number, and exactly which confession
            you wrote. This is built the other way around. Private drops and inbox messages are
            encrypted before they leave your browser, so what reaches this database is bytes we
            hold no key for. Not policy — arithmetic.
          </p>

          <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="field">Never collected</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-label">
                Accounts, emails, phone numbers, IP logs, device fingerprints, third-party
                analytics, advertising identifiers.
              </dd>
            </div>
            <div>
              <dt className="field">Held, and why</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-label">
                Wall records, because they are public on purpose. Ciphertext we cannot read, until
                it expires. Counter totals, with no record of who tapped them.
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/how-it-works" className="cmd no-underline">
              How the encryption works
            </Link>
            <Link href="/privacy" className="cmd-bare no-underline">
              Full inventory →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
