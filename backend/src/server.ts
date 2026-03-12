import express, { Express } from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { Server as SocketIOServer } from 'socket.io';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { createContext } from './graphql/context';
import { sessionMiddleware } from './middleware/session.middleware';
import { generalRateLimit } from './middleware/ratelimit.middleware';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import { restRouter } from './rest/router';
import { uploadRouter } from './rest/upload.router';
import path from 'path';
import { realtimeService } from './services/realtime.service';
import { env } from './config/env';

export interface VaultDropServer {
  app: Express;
  httpServer: http.Server;
  io: SocketIOServer;
  apolloServer: ApolloServer;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export async function createServer(): Promise<VaultDropServer> {
  const app = express();
  const httpServer = http.createServer(app);

  // Socket.io setup
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  realtimeService.setIO(io);

  // Socket.io event handlers
  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    socket.on('subscribe:secret', (secretId: string) => {
      socket.join(`secret:${secretId}`);
    });

    socket.on('unsubscribe:secret', (secretId: string) => {
      socket.leave(`secret:${secretId}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  // Apollo Server
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (formattedError, error) => {
      console.error('[GraphQL Error]', formattedError.message);
      return formattedError;
    },
  });

  await apolloServer.start();

  // Core middleware
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature', 'x-session-id'],
    })
  );

  // Stripe webhook MUST use raw body - register BEFORE json body-parser
  app.use(
    '/api/webhooks/stripe',
    bodyParser.raw({ type: 'application/json' })
  );

  app.use(bodyParser.json({ limit: '1mb' }));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(generalRateLimit);

  // Session middleware
  app.use(sessionMiddleware);

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // REST API routes
  app.use('/api', restRouter);
  app.use('/api/upload', uploadRouter);

  // GraphQL endpoint
  app.use(
    '/graphql',
    expressMiddleware(apolloServer, {
      context: async ({ req, res }: { req: any; res: any }) => createContext({ req, res }),
    }) as any
  );

  // Error handling
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  const start = async (): Promise<void> => {
    await new Promise<void>((resolve) => {
      httpServer.listen(env.PORT, () => {
        console.log(`\n🚀 VaultDrop Backend running:`);
        console.log(`   HTTP:    http://localhost:${env.PORT}`);
        console.log(`   GraphQL: http://localhost:${env.PORT}/graphql`);
        console.log(`   SSE:     http://localhost:${env.PORT}/api/sse`);
        console.log(`   Health:  http://localhost:${env.PORT}/api/health`);
        console.log(`   Env:     ${env.NODE_ENV}\n`);
        resolve();
      });
    });
  };

  const stop = async (): Promise<void> => {
    await apolloServer.stop();
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    io.close();
  };

  return { app, httpServer, io, apolloServer, start, stop };
}
