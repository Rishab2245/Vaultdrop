import express, { Router, Request, Response } from 'express';
import { stripeWebhookHandler } from './stripe.webhook';
import { sseRouter } from './sse.router';
import { sessionService } from '../services/session.service';

const router: Router = express.Router();

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'vaultdrop-backend',
  });
});

// Stripe webhook (must use raw body - handled before body-parser)
router.post('/webhooks/stripe', stripeWebhookHandler);

// SSE routes
router.use('/sse', sseRouter);

// Session token refresh
router.post('/auth/refresh', async (req: Request, res: Response) => {
  const session = req.session;
  if (!session) {
    res.status(401).json({ error: 'No active session' });
    return;
  }

  const { signSessionToken } = await import('../utils/crypto');
  const token = signSessionToken({ sessionId: session.id, codename: session.codename });

  res.cookie('vaultdrop_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 90 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({ ok: true });
});

// Logout - clear session cookie
router.post('/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('vaultdrop_session', { path: '/' });
  res.json({ ok: true });
});

export { router as restRouter };
