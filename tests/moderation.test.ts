import { describe, expect, it } from 'vitest';
import { screenWallBody } from '@/lib/moderation';

function allowed(body: string) {
  const verdict = screenWallBody(body);
  if (verdict.action !== 'allow') {
    throw new Error(`expected allow, got block: ${verdict.reason}`);
  }
  return verdict;
}

function blocked(body: string) {
  const verdict = screenWallBody(body);
  if (verdict.action !== 'block') {
    throw new Error(`expected block, got allow: ${verdict.body}`);
  }
  return verdict;
}

describe('ordinary confessions pass through', () => {
  it('leaves a plain confession untouched', () => {
    const body = 'I told everyone I was fine for three years and I was not fine.';
    const verdict = allowed(body);
    expect(verdict.body).toBe(body);
    expect(verdict.redactions).toBe(0);
  });

  it('does not mangle numbers that are not contact details', () => {
    const body = 'I have rewritten this message 14 times and I am 27 years old.';
    const verdict = allowed(body);
    expect(verdict.body).toBe(body);
  });

  it('keeps years and dates readable', () => {
    const verdict = allowed('In 2019 I walked out of my own wedding rehearsal.');
    expect(verdict.body).toContain('2019');
  });
});

describe('contact details are stripped, not punished', () => {
  it('redacts an email address', () => {
    const verdict = allowed('Reach me at someone@example.com if you feel the same way.');
    expect(verdict.body).not.toContain('example.com');
    expect(verdict.body).toContain('[redacted]');
    expect(verdict.redactions).toBe(1);
  });

  it('redacts a phone number', () => {
    const verdict = allowed('My old number was +1 415 555 0132 and I still miss that life.');
    expect(verdict.body).not.toContain('555');
    expect(verdict.body).toContain('[number removed]');
  });

  it('removes links', () => {
    const verdict = allowed('The whole story is at https://example.com/thread if you care.');
    expect(verdict.body).not.toContain('http');
    expect(verdict.body).toContain('[link removed]');
  });

  it('removes social handles', () => {
    const verdict = allowed('It was @someone_real who did it, and everybody knew.');
    expect(verdict.body).not.toContain('@someone_real');
  });

  it('removes street addresses', () => {
    const verdict = allowed('I drove past 42 Maple Street every night for a year.');
    expect(verdict.body).not.toContain('Maple');
  });

  it('collapses shouting', () => {
    const verdict = allowed('I am so tired of pretending, sooooooooo tired of it all.');
    expect(verdict.body).toContain('sooo ');
    expect(verdict.body).not.toContain('soooo ');
  });
});

describe('hard blocks', () => {
  it('blocks a credible threat', () => {
    expect(blocked('I am going to kill him when he gets home tonight.').reason).toMatch(/threat/i);
  });

  it('blocks "I know where you live"', () => {
    expect(blocked('I know where you live and I am not done with you.').reason).toMatch(/threat/i);
  });

  it('blocks a valid card number', () => {
    // A well-known Visa test number, Luhn-valid.
    expect(blocked('The card is 4111 1111 1111 1111, spend it all.').reason).toMatch(/card/i);
  });

  it('ignores a digit run that is not Luhn-valid', () => {
    const verdict = screenWallBody('The reference was 1234 5678 9012 3456 on the form.');
    // Not a card, so it is redacted as a number rather than blocked outright.
    expect(verdict.action).toBe('allow');
  });

  it('blocks a national ID number', () => {
    expect(blocked('His SSN is 123-45-6789 and I never forgot it.').reason).toMatch(/ID number/i);
  });

  it('blocks sexual content involving a minor', () => {
    expect(blocked('She is 14 and she sent me nude photos last week.').reason).toMatch(/minor/i);
  });

  it('blocks shouting spam', () => {
    expect(blocked('BUY NOW CHEAP DEALS CLICK HERE FAST MONEY').reason).toMatch(/spam/i);
  });

  it('blocks repetition spam', () => {
    expect(
      blocked('win win win win win win win win win win win win win win').reason
    ).toMatch(/spam/i);
  });

  it('blocks an empty submission', () => {
    expect(blocked('   ').reason).toMatch(/say something/i);
  });

  it('blocks a post that is nothing but contact details', () => {
    expect(blocked('a@b.com https://x.com').reason).toMatch(/nothing left/i);
  });
});
