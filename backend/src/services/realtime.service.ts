import { Server as SocketIOServer } from 'socket.io';
import { getPublisher } from '../config/redis';

let io: SocketIOServer | null = null;

export class RealtimeService {
  setIO(socketIO: SocketIOServer): void {
    io = socketIO;
    console.log('[RealtimeService] Socket.IO instance registered');
  }

  getIO(): SocketIOServer | null {
    return io;
  }

  async emitWinnerAnnounced(data: {
    winnerSecretId: string;
    codename: string;
    prizeAmount: number;
    rankScore: number;
    snippet: string;
    category: string;
    poolDate: string;
  }): Promise<void> {
    if (io) {
      io.emit('winner:announced', data);
    }

    const publisher = getPublisher();
    await publisher.publish('winner:events', JSON.stringify({ type: 'winner:announced', data }));
    console.log(`[RealtimeService] Winner announced: ${data.codename} - $${data.prizeAmount}`);
  }

  async emitPoolUpdate(data: {
    poolDate: string;
    totalAmount: number;
    entryCount?: number;
  }): Promise<void> {
    if (io) {
      io.emit('pool:updated', data);
    }
  }

  async emitVoteUpdate(data: {
    secretId: string;
    voteCount: number;
    rankScore: number;
  }): Promise<void> {
    if (io) {
      io.to(`secret:${data.secretId}`).emit('vote:updated', data);
    }
  }

  broadcastToRoom(room: string, event: string, data: unknown): void {
    if (io) {
      io.to(room).emit(event, data);
    }
  }
}

export const realtimeService = new RealtimeService();
