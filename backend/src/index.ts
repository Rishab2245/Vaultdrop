import { createServer } from './server';
import { startScheduler, stopScheduler } from './jobs/scheduler';
import { vaultAIService } from './services/vault-ai.service';
import { closeRedisConnections } from './config/redis';
import prisma from './config/prisma';

async function main(): Promise<void> {
  // Create and start the HTTP/GraphQL/Socket.io server
  const server = await createServer();
  await server.start();

  // Start background jobs
  startScheduler();

  // Start AI scoring worker
  vaultAIService.startWorker();

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[Main] Received ${signal}, shutting down gracefully...`);

    try {
      stopScheduler();
      await vaultAIService.stopWorker();
      await server.stop();
      await closeRedisConnections();
      await prisma.$disconnect();
      console.log('[Main] Shutdown complete.');
      process.exit(0);
    } catch (err) {
      console.error('[Main] Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    console.error('[Main] Uncaught exception:', err);
    shutdown('uncaughtException').catch(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[Main] Unhandled rejection:', reason);
    shutdown('unhandledRejection').catch(() => process.exit(1));
  });
}

main().catch((err) => {
  console.error('[Main] Fatal error during startup:', err);
  process.exit(1);
});
