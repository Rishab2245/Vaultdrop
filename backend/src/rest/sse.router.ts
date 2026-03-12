import express, { Router, Request, Response } from 'express';
import { getSubscriber, REDIS_KEYS } from '../config/redis';

const router: Router = express.Router();

// Track active SSE connections
const sseClients = new Set<Response>();

// Subscribe to Redis channels for SSE broadcast
let isSubscribed = false;

async function ensureSubscriptions(): Promise<void> {
  if (isSubscribed) return;
  isSubscribed = true;

  const subscriber = getSubscriber();

  await subscriber.subscribe(REDIS_KEYS.sseChannel, REDIS_KEYS.poolUpdateChannel, (err) => {
    if (err) {
      console.error('[SSE] Redis subscribe error:', err.message);
    }
  });

  subscriber.on('message', (channel: string, message: string) => {
    if (sseClients.size === 0) return;

    try {
      const parsed = JSON.parse(message);
      const data = `event: ${parsed.type}\ndata: ${JSON.stringify(parsed.data)}\n\n`;

      for (const client of sseClients) {
        try {
          client.write(data);
        } catch {
          sseClients.delete(client);
        }
      }
    } catch (err) {
      console.error('[SSE] Message parse error:', err);
    }
  });

  console.log('[SSE] Redis subscriptions established');
}

/**
 * GET /api/sse
 * Server-Sent Events endpoint for real-time updates
 */
router.get('/', async (req: Request, res: Response) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Allow CORS for SSE
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL ?? '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  res.flushHeaders();

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);

  // Register client
  sseClients.add(res);
  console.log(`[SSE] Client connected (total: ${sseClients.size})`);

  // Ensure Redis subscriptions
  ensureSubscriptions().catch((err) => {
    console.error('[SSE] Failed to setup subscriptions:', err.message);
  });

  // Heartbeat every 25 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 25000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
    console.log(`[SSE] Client disconnected (total: ${sseClients.size})`);
  });

  req.on('error', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

/**
 * GET /api/sse/pool
 * SSE for pool-specific updates
 */
router.get('/pool', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send current pool state immediately
  const { poolService } = await import('../services/pool.service');
  try {
    const pool = await poolService.getCurrentPool();
    res.write(`event: pool:state\ndata: ${JSON.stringify(pool)}\n\n`);
  } catch (err) {
    console.error('[SSE:pool] Error fetching initial pool state:', err);
  }

  sseClients.add(res);
  ensureSubscriptions().catch(console.error);

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

export { router as sseRouter };
