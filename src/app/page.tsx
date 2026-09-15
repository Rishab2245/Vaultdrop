import Link from 'next/link';
import { prisma } from '@/lib/db';
import { compactNumber } from '@/lib/format';
import { Mark } from '@/components/Brand';

export const dynamic = 'force-dynamic';

const PATHS = [
  {
    href: '/confess',
    eyebrow: 'Public',
    title: 'Confess to the Wall',
    body: 'Say the thing out loud, to everyone, with nothing attached to your name. Other people say "same" more often than you would think.',
    cta: 'Say it',
  },
  {
    href: '/drop',
    eyebrow: 'One person',
    title: 'Send a private drop',
    body: 'Encrypted in your browser, opened once, then destroyed. The key travels in the link, which means it never reaches us at all.',
    cta: 'Encrypt something',
  },
  {
    href: '/inbox',
    eyebrow: 'Your link',
    title: 'Collect anonymous messages',
    body: 'Put a link in your bio and find out what people actually think. Only your device can decrypt what comes back.',
    cta: 'Get my link',
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
    <div>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 animate-glow rounded-full bg-violet/20 blur-[130px]"
        />

        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pb-24 sm:pt-28">
          <Mark className="mx-auto h-14 w-14" />

          <h1 className="mt-8 text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            Say it without
            <br />
            saying who.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-chalk-dim sm:text-lg">
            A place for the things you cannot put your name on. No account, no email, no phone
            number - and for anything private, no way for us to read it even if someone made us try.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/wall" className="btn-primary px-7 py-3">
              Read the Wall
            </Link>
            <Link href="/confess" className="btn-ghost px-7 py-3">
              Confess something
            </Link>
          </div>

          {stats.secrets > 0 && (
            <p className="mt-8 text-sm text-chalk-faint">
              {compactNumber(stats.secrets)} secrets told
              {stats.reactions > 0 && ` · ${compactNumber(stats.reactions)} people said "same"`}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {PATHS.map((path) => (
            <Link
              key={path.href}
              href={path.href}
              className="group panel flex flex-col p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet/40"
            >
              <span className="label">{path.eyebrow}</span>
              <h2 className="mt-3 text-xl font-semibold tracking-tight">{path.title}</h2>
              <p className="mt-2.5 flex-1 text-pretty text-sm leading-relaxed text-chalk-dim">
                {path.body}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-violet-soft">
                {path.cta}
                <span
                  aria-hidden="true"
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
        <div className="panel p-8 sm:p-10">
          <div className="sealed mb-5">What we actually store</div>
          <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            Most anonymous apps mean &ldquo;anonymous to other users&rdquo;.
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-chalk-dim">
            They still know your device, your IP, your phone number, and exactly which confession
            you wrote. We built this the other way around. Private drops and inbox messages are
            encrypted before they leave your browser, so what reaches our database is bytes we have
            no key for. Not policy - arithmetic.
          </p>

          <dl className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-chalk">Never collected</dt>
              <dd className="mt-2 text-sm leading-relaxed text-chalk-faint">
                Accounts, emails, phone numbers, IP logs, device fingerprints, third-party
                analytics, advertising identifiers.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-chalk">Kept, and why</dt>
              <dd className="mt-2 text-sm leading-relaxed text-chalk-faint">
                Wall posts, because they are public on purpose. Ciphertext we cannot read, until it
                expires. Reaction counts, with no record of who tapped them.
              </dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/how-it-works" className="btn-ghost">
              How the encryption works
            </Link>
            <Link href="/privacy" className="btn-quiet">
              Read the specifics →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
