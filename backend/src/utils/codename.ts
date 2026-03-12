import crypto from 'crypto';

export function generateCodename(): string {
  const digits = crypto.randomInt(1000, 9999);
  const letterIdx = crypto.randomBytes(1)[0] % 26;
  const letter = String.fromCharCode(65 + letterIdx);
  return `GHOST-${digits}-${letter}`;
}
