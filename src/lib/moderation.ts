/**
 * Moderation for the public Wall.
 *
 * Scope note, stated plainly: this applies to the Wall only. Encrypted drops
 * and inbox messages are unreadable to the server by construction, so they
 * cannot be scanned - that is the point of them, and pretending otherwise would
 * be a lie. Those surfaces are protected by being private, unlisted, expiring,
 * and reportable by whoever holds the link.
 *
 * Anonymous confession platforms die of harassment, not of bad infrastructure.
 * Secret shut down in 2015 over exactly this. So the Wall refuses to publish
 * anything that identifies a person, and it strips contact details rather than
 * trusting people to leave them out.
 */

export type Verdict =
  | { action: 'allow'; body: string; redactions: number }
  | { action: 'block'; reason: string };

const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// Deliberately broad: 7+ digits with common separators covers most phone shapes
// without trying to enumerate every national format.
const PHONE = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{2,4})?/g;

const CARD = /\b(?:\d[ -]?){13,19}\b/g;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g;
const URL = /\bhttps?:\/\/\S+|\bwww\.\S+/gi;
const SOCIAL_HANDLE = /(?:^|\s)@[A-Za-z0-9._]{3,30}\b/g;
const STREET =
  /\b\d{1,5}\s+[A-Za-z][A-Za-z\s]{2,30}\s(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd|court|ct|way)\b/gi;

/** Phrases that read as a credible threat rather than venting. */
const THREAT_PATTERNS = [
  /\bi(?:'m| am)? ?(?:going to|gonna|will) (?:kill|shoot|stab|hurt|beat|rape)\b/i,
  /\b(?:kill|shoot|stab|hurt) (?:you|him|her|them|his|her)\b.*\b(?:tomorrow|tonight|at \d|address)\b/i,
  /\bi know where (?:you|he|she|they) live\b/i,
  /\bwatch your back\b.*\b(?:address|school|work|home)\b/i,
];

const MINOR_RISK = [
  /\b(?:i(?:'m| am)|she(?:'s| is)|he(?:'s| is)) ?\d{1,2}\b.*\b(?:nude|naked|sext|hookup|sleep with)\b/i,
  /\b(?:child|kid|minor|underage|13|14|15)\b.*\b(?:nude|naked|sexual|sext)\b/i,
];

/** Luhn check, so we only treat a digit run as a card if it actually is one. */
function isLuhnValid(digits: string): boolean {
  const cleaned = digits.replace(/\D/g, '');
  if (cleaned.length < 13 || cleaned.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let d = cleaned.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

function countDigits(value: string): number {
  let n = 0;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c >= 48 && c <= 57) n++;
  }
  return n;
}

/** Collapse runs like "sooooo" and "!!!!!!" that exist only to grab the feed. */
function collapseShouting(body: string): string {
  return body.replace(/(.)\1{4,}/g, (m, ch: string) => ch.repeat(3));
}

function looksLikeSpam(body: string): boolean {
  const letters = body.replace(/[^A-Za-z]/g, '');
  if (letters.length >= 20) {
    const upper = letters.replace(/[^A-Z]/g, '').length;
    if (upper / letters.length > 0.8) return true;
  }
  const words = body.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 12) {
    const unique = new Set(words);
    if (unique.size / words.length < 0.3) return true;
  }
  return false;
}

/**
 * Screen a Wall submission.
 *
 * Contact details are redacted rather than rejected, because someone pouring
 * their heart out should not lose the whole post over a stray phone number.
 * Threats, sexual content involving minors, and financial identifiers are hard
 * blocks - there is no version of those that belongs on a public wall.
 */
export function screenWallBody(raw: string): Verdict {
  const body = raw.trim();

  if (!body) return { action: 'block', reason: 'Say something first.' };

  for (const pattern of MINOR_RISK) {
    if (pattern.test(body)) {
      return {
        action: 'block',
        reason: 'This appears to involve a minor in a sexual context and cannot be posted.',
      };
    }
  }

  for (const pattern of THREAT_PATTERNS) {
    if (pattern.test(body)) {
      return {
        action: 'block',
        reason: 'This reads as a threat against a specific person. Anonymity is not cover for that.',
      };
    }
  }

  if (SSN.test(body)) {
    return { action: 'block', reason: "That looks like someone's national ID number." };
  }
  SSN.lastIndex = 0;

  const cardMatches = body.match(CARD) ?? [];
  if (cardMatches.some(isLuhnValid)) {
    return { action: 'block', reason: 'That looks like a payment card number.' };
  }

  if (looksLikeSpam(body)) {
    return { action: 'block', reason: 'That reads as spam. Try it in your own words.' };
  }

  let redactions = 0;
  const redact = (value: string, pattern: RegExp, replacement: string): string =>
    value.replace(pattern, () => {
      redactions++;
      return replacement;
    });

  let cleaned = collapseShouting(body);
  cleaned = redact(cleaned, EMAIL, '[redacted]');
  cleaned = redact(cleaned, URL, '[link removed]');
  cleaned = redact(cleaned, STREET, '[address removed]');
  cleaned = redact(cleaned, SOCIAL_HANDLE, ' [handle removed]');

  // Only treat a digit run as a phone number if it is mostly digits; this keeps
  // years, ages, and "3 or 4 times" from being mangled.
  cleaned = cleaned.replace(PHONE, (match) => {
    if (countDigits(match) < 7) return match;
    redactions++;
    return '[number removed]';
  });

  const finalBody = cleaned.replace(/\s{3,}/g, '  ').trim();

  if (!finalBody || finalBody.replace(/\[[a-z ]+\]/g, '').trim().length < 8) {
    return {
      action: 'block',
      reason: 'After removing contact details there was nothing left to post.',
    };
  }

  return { action: 'allow', body: finalBody, redactions };
}
