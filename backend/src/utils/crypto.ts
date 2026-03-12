import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export interface SessionTokenPayload {
  sessionId: string;
  codename: string;
}

export function signSessionToken(payload: SessionTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '90d' });
}

export function verifySessionToken(token: string): SessionTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as SessionTokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 40);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base}-${suffix}`;
}
