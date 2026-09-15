# VaultDrop

**Say it without saying who.**

Anonymous confessions and end-to-end encrypted drops. No accounts, no email, no
phone numbers, no IP logs — and for anything private, no way for the server to
read it even under compulsion.

---

## Why this exists

Most "anonymous" apps mean anonymous *to other users*. The operator still knows
your device, your IP, your phone number, and exactly which confession you wrote.
VaultDrop is built the other way around: private drops and inbox messages are
encrypted in the browser before they touch the network, so what reaches the
database is ciphertext with no key attached. That isn't a policy promise — it's
arithmetic.

## What it does

| Surface | What it is | Privacy model |
|---|---|---|
| **The Wall** | Public anonymous confessions, ranked by a time-decayed heat score | Plaintext by design — it's meant to be read. Screened for contact details on write. |
| **Private drops** | Encrypt something, share a link, it self-destructs | AES-256-GCM. Key rides in the URL fragment, which browsers never transmit. |
| **Inboxes** | Your own link; strangers send you messages only you can decrypt | ECDH P-256 + HKDF. Private key generated in your browser, never uploaded. |

## Quick start

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed    # optional — sample confessions so the Wall isn't empty
npm run dev
```

Open http://localhost:3000.

SQLite by default, so there is nothing to provision. WebCrypto requires a secure
context, which `localhost` counts as — but any other host must be HTTPS.

## Commands

```bash
npm run dev        # dev server
npm run build      # production build
npm start          # serve the build
npm test           # 80 tests: crypto, moderation, ranking, API, sweep
npm run typecheck  # tsc --noEmit
npm run db:studio  # browse the database
```

## How the encryption works

**Private drops.** The browser generates a 256-bit AES-GCM key, encrypts
locally, and uploads only ciphertext and a nonce. The key is base64url-encoded
into the link fragment: `/d/<id>#<key>`. Fragments are never sent to servers —
that's HTTP, not a promise we're making. An optional passphrase is stretched
with PBKDF2 (600k iterations) and combined with the link key through HKDF, so a
leaked link alone still can't open the drop.

**Inboxes.** An ECDH P-256 keypair is generated in the browser; only the public
half is published. Senders derive a shared secret using a throwaway keypair of
their own, so messages are unlinkable both to the sender and to each other. The
owner's private key never leaves their device — which is why creating an inbox
shows a recovery key exactly once.

**Capability tokens.** "Delete my post" works without identity: the client keeps
a random token, the server stores only its SHA-256 hash, and comparison is
constant-time. There is no user to look up because there is no user.

### Where it does not protect you

Stated plainly, because a security tool that oversells itself is worse than none:

- The Wall is public and unencrypted. It has to be.
- Whoever holds a drop link can read it. Encryption doesn't help if you send the
  link over a compromised channel — add a passphrase and share it separately.
- Writing style, timing, and detail deanonymise people far more often than
  technical leaks do.
- We serve the JavaScript that does the encrypting. A compromised server could
  ship malicious code. True of every browser-based E2E tool; the source is
  public so it can be checked.
- Lose the key, lose the data. There is no reset link.

## Architecture

```
Next.js 15 (App Router) ── React 19 ── Tailwind
  ├── src/app/api/*      REST route handlers
  ├── src/lib/crypto.ts  WebCrypto, zero dependencies
  ├── src/lib/moderation.ts
  └── Prisma ── SQLite (dev) / Postgres (prod)
```

No Redis, no GraphQL, no Python service, no payment provider, no third-party
analytics. The whole client bundle is ~103 kB shared.

## Production

Switch the Prisma datasource to `postgresql` and set a real `DATABASE_URL`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Nothing else changes — the enum-shaped fields are validated strings precisely so
both engines work.

```bash
docker build -t vaultdrop .
docker run -p 3000:3000 -e DATABASE_URL="file:./prod.db" vaultdrop
```

### Environment

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Prisma connection string |
| `NEXT_PUBLIC_SITE_URL` | yes | Public origin, used to build share links |
| `CRON_SECRET` | no | Bearer token for `POST /api/maintenance/sweep` |

Expired drops are swept opportunistically on write. On a low-traffic site, point
a scheduler at the sweep endpoint so expiry is guaranteed:

```bash
curl -X POST https://your-host/api/maintenance/sweep \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Moderation

Anonymous confession platforms die of harassment, not of bad infrastructure —
Secret shut down in 2015 over exactly that. So the Wall:

- **Blocks** credible threats, sexual content involving minors, payment card
  numbers (Luhn-checked), national ID numbers, and spam.
- **Redacts** emails, phone numbers, links, social handles, and street addresses
  rather than rejecting the whole post — someone being honest shouldn't lose it
  all over a stray phone number.
- **Auto-hides** at three reports, because leaving harassment up for an hour is
  worse than a false positive.

This applies to the Wall only. Encrypted drops are unreadable to the server by
construction and cannot be scanned — that is the point of them, and claiming
otherwise would be a lie. Those are protected by being unlisted, expiring, and
reportable by whoever holds the link.

## License

MIT. See [LICENSE](LICENSE).
