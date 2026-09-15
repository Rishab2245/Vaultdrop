import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'What we store',
  description: 'A field-by-field account of everything in the VaultDrop database.',
};

const TABLES = [
  {
    name: 'Wall secrets',
    fields: [
      ['The text', 'Public by design. Screened for contact details before it is saved.'],
      ['Mood and colour', 'What you picked.'],
      ['Reaction counts', 'Totals only. No record of who reacted.'],
      ['A hash of your delete token', 'Lets you delete your own post. Cannot be reversed to you.'],
      ['Created-at timestamp', 'For ordering the feed.'],
    ],
  },
  {
    name: 'Encrypted drops and inbox messages',
    fields: [
      ['Ciphertext', 'We have no key for this and cannot obtain one.'],
      ['Nonce and salt', 'Needed to decrypt. Useless without the key.'],
      ["The sender's throwaway public key", 'Different for every message. Links to nothing.'],
      ['Expiry time', 'When we delete it.'],
    ],
  },
  {
    name: 'Inboxes',
    fields: [
      ['Handle', 'The one you chose.'],
      ['Public key', 'So strangers can encrypt to you.'],
      ['A hash of your owner token', 'Proves the inbox is yours when you collect messages.'],
    ],
  },
];

const NEVER = [
  'Names, emails, phone numbers',
  'Passwords or accounts of any kind',
  'IP addresses, in any table',
  'Device or browser fingerprints',
  'Third-party analytics or trackers',
  'Advertising or marketing identifiers',
  'Which secrets you read or reacted to',
  'Any private key, ever',
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-20">
      <header className="mb-14">
        <h1 className="text-balance text-4xl font-semibold tracking-tight">What we store</h1>
        <p className="mt-4 max-w-xl leading-relaxed text-body">
          Not a policy - an inventory. This is every field in the database, and the list is short
          enough to print.
        </p>
      </header>

      <div className="space-y-10">
        {TABLES.map((table) => (
          <section key={table.name}>
            <h2 className="text-lg font-semibold tracking-tight">{table.name}</h2>
            <dl className="mt-4 divide-y divide-hairline border-y border-hairline">
              {table.fields.map(([fieldName, why]) => (
                <div key={fieldName} className="grid gap-1 py-3.5 sm:grid-cols-[minmax(0,1fr)_1.4fr] sm:gap-6">
                  <dt className="text-sm font-medium text-chrome">{fieldName}</dt>
                  <dd className="text-sm leading-relaxed text-label">{why}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <section className="border border-hairline mt-14 p-7">
        <h2 className="text-lg font-semibold tracking-tight">Never collected</h2>
        <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {NEVER.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-body">
              <span className="mt-0.5 text-sealed" aria-hidden="true">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="text-lg font-semibold tracking-tight">Rate limiting, without logs</h2>
        <p className="mt-3 leading-relaxed text-body">
          Spam control still needs to tell callers apart. We keep counters in memory, keyed by an
          HMAC of the caller&apos;s IP under a secret that is regenerated every hour and never
          written to disk. Nothing persists, the key cannot be reversed to an address, and after
          rotation the link between the two is gone for us as well.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-lg font-semibold tracking-tight">If someone asks us for data</h2>
        <p className="mt-3 leading-relaxed text-body">
          For a private drop or an inbox message we can hand over ciphertext, and that is the whole
          extent of it - we hold no key and there is no key to compel. For the Wall we can hand over
          what is already public, which is the text itself. There is no account behind it to
          identify, because there is no account.
        </p>
      </section>
    </div>
  );
}
