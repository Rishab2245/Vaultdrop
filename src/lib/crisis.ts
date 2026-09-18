/**
 * Crisis detection and resourcing.
 *
 * A confession platform receives suicidal ideation, abuse disclosures, and
 * messages from people in real danger. Not occasionally - routinely. Secret
 * shut down in 2015 in large part because it had no answer for what its own
 * product attracted.
 *
 * Two deliberate design decisions:
 *
 * 1. This runs in the composer, before anything is submitted, and again on the
 *    reader. Someone typing this needs help now, not after a moderation queue
 *    gets to them tomorrow.
 *
 * 2. It never blocks posting and never deletes. Silencing someone who says they
 *    want to die teaches them this is another place that will not listen. The
 *    notice appears alongside what they wrote, and they decide what to do.
 *
 * The matching is deliberately loose. A false positive costs someone a
 * dismissable panel; a false negative costs considerably more.
 */

export interface CrisisResource {
  region: string;
  name: string;
  contact: string;
  href?: string;
  note?: string;
}

/**
 * Kept short and verifiable on purpose. An out-of-date helpline number is worse
 * than none, so the aggregator is listed first - it stays current across every
 * country, which a hardcoded list here cannot.
 */
export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    region: 'Worldwide',
    name: 'Find A Helpline',
    contact: 'findahelpline.com',
    href: 'https://findahelpline.com',
    note: 'Free, confidential lines in over 130 countries.',
  },
  {
    region: 'India',
    name: 'Tele-MANAS',
    contact: '14416',
    href: 'tel:14416',
    note: "The Government of India's national mental health helpline. 24/7, many languages.",
  },
  {
    region: 'United States',
    name: 'Suicide & Crisis Lifeline',
    contact: '988',
    href: 'tel:988',
    note: 'Call or text, 24/7.',
  },
  {
    region: 'United Kingdom',
    name: 'Samaritans',
    contact: '116 123',
    href: 'tel:116123',
    note: 'Free, 24/7.',
  },
];

/** Phrases that read as intent or active danger rather than figure of speech. */
const SELF_HARM = [
  /\bkill(ing)? myself\b/i,
  /\bend(ing)? (my|it all|my life)\b/i,
  /\b(want|going|plan|planning|ready) to die\b/i,
  /\bdo(n'?t| not) want to (be here|live|wake up)\b/i,
  /\bsuicid(e|al)\b/i,
  /\btake my own life\b/i,
  /\bcut(ting)? myself\b/i,
  /\bself[- ]harm\b/i,
  /\bbetter off (without me|dead)\b/i,
  /\bno (reason|point) (to|in) (liv|go)ing\b/i,
  /\boverdose\b/i,
];

const ABUSE = [
  /\b(he|she|they|my (dad|mum|mom|father|mother|husband|wife|partner|boyfriend|girlfriend)) (hits|beats|hurts|chokes|rapes) me\b/i,
  /\bbeing (abused|assaulted|raped|stalked)\b/i,
  /\b(was|got) (raped|assaulted|molested)\b/i,
  /\bafraid (of|for) my life\b/i,
  /\bhe('?s| is) going to kill me\b/i,
];

export type CrisisKind = 'self_harm' | 'abuse';

export interface CrisisSignal {
  kind: CrisisKind;
  /** Copy shown alongside the resources. Written to be read by someone in distress. */
  message: string;
}

const MESSAGES: Record<CrisisKind, string> = {
  self_harm:
    'It sounds like you are carrying something very heavy right now. You can still post this - nothing here is being blocked. But please talk to someone tonight as well.',
  abuse:
    'What you are describing sounds like someone is hurting you. You can still post this. There are also people whose entire job is helping with exactly this, confidentially.',
};

/**
 * Screen text for signs of crisis.
 *
 * Self-harm takes precedence when both match: it is the more time-critical of
 * the two, and stacking two panels on someone in distress helps nobody.
 */
export function detectCrisis(text: string): CrisisSignal | null {
  if (!text || text.length < 6) return null;

  if (SELF_HARM.some((pattern) => pattern.test(text))) {
    return { kind: 'self_harm', message: MESSAGES.self_harm };
  }
  if (ABUSE.some((pattern) => pattern.test(text))) {
    return { kind: 'abuse', message: MESSAGES.abuse };
  }
  return null;
}
