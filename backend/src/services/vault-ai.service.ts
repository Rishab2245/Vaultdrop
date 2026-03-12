import axios from 'axios';
import { Queue, Worker, Job } from 'bullmq';
import { env } from '../config/env';

interface AIScoreJob {
  secretId: string;
  content: string;
  category: string;
}

interface AIScoreResult {
  moderation_score: number;
  explosive_score: number;
  embedding_id?: string;
}

const AI_QUEUE_NAME = 'vault-ai-scoring';

export class VaultAIService {
  private queue: Queue<AIScoreJob> | null = null;
  private worker: Worker<AIScoreJob> | null = null;

  getQueue(): Queue<AIScoreJob> {
    if (!this.queue) {
      this.queue = new Queue<AIScoreJob>(AI_QUEUE_NAME, {
        connection: { url: env.REDIS_URL },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      });
    }
    return this.queue;
  }

  async queueScoring(secretId: string, content: string, category: string): Promise<void> {
    const queue = this.getQueue();
    await queue.add(
      'score-secret',
      { secretId, content, category },
      {
        jobId: `score-${secretId}`,
        priority: 1,
      }
    );
    console.log(`[VaultAI] Queued scoring job for secret: ${secretId}`);
  }

  startWorker(): void {
    this.worker = new Worker<AIScoreJob>(
      AI_QUEUE_NAME,
      async (job: Job<AIScoreJob>) => {
        const { secretId, content, category } = job.data;
        console.log(`[VaultAI] Processing scoring job for secret: ${secretId}`);

        const result = await this.callAIService(content, category);
        // Dynamic import to avoid circular dependency
        const { secretService } = await import('./secret.service');
        await secretService.updateAIScores(
          secretId,
          result.moderation_score,
          result.explosive_score
        );

        console.log(
          `[VaultAI] Scored secret ${secretId}: moderation=${result.moderation_score}, explosive=${result.explosive_score}`
        );
      },
      {
        connection: { url: env.REDIS_URL },
        concurrency: 5,
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`[VaultAI] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[VaultAI] Job ${job?.id} failed:`, err.message);
    });

    console.log('[VaultAI] Worker started');
  }

  private async callAIService(content: string, category: string): Promise<AIScoreResult> {
    try {
      const response = await axios.post<AIScoreResult>(
        `${env.AI_SERVICE_URL}/api/score`,
        { content, category },
        { timeout: 10000 }
      );
      return response.data;
    } catch (err) {
      console.warn('[VaultAI] AI service unavailable, using defaults');
      // Return sensible defaults when AI service is unavailable
      return {
        moderation_score: 80,
        explosive_score: 50 + Math.random() * 30,
      };
    }
  }

  async stopWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
  }
}

export const vaultAIService = new VaultAIService();
