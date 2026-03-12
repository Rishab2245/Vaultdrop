import { Request, Response, NextFunction } from 'express';
import { AnonSession } from '@prisma/client';
import { verifySessionToken } from '../utils/crypto';
import { sessionService } from '../services/session.service';

declare global {
  namespace Express {
    interface Request {
      session?: AnonSession | null;
    }
  }
}

export async function sessionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    // Check cookie first
    const cookieToken = req.cookies?.vaultdrop_session;
    if (cookieToken) {
      token = cookieToken;
    }

    // Fallback to Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    // Fallback to x-session-id header (direct session ID lookup, used by frontend)
    if (!token) {
      const directSessionId = req.headers['x-session-id'] as string | undefined;
      if (directSessionId) {
        const session = await sessionService.getSessionById(directSessionId);
        req.session = session ?? null;
        if (session) {
          sessionService.updateLastSeen(session.id).catch(() => {});
        }
        return next();
      }
      req.session = null;
      return next();
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      req.session = null;
      return next();
    }

    const session = await sessionService.getSessionById(payload.sessionId);
    req.session = session;

    // Update lastSeenAt asynchronously (don't block request)
    if (session) {
      sessionService.updateLastSeen(session.id).catch((err) => {
        console.error('[SessionMiddleware] Failed to update lastSeenAt:', err.message);
      });
    }
  } catch (err) {
    console.error('[SessionMiddleware] Error:', err);
    req.session = null;
  }

  next();
}
