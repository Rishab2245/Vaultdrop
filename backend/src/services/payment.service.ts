import { Payout, PayoutMethod, PayoutStatus } from '@prisma/client';
import prisma from '../config/prisma';
import stripe from '../config/stripe';
import { poolService } from './pool.service';
import { sessionService } from './session.service';

const ENTRY_FEE_CENTS = 199; // $1.99 default entry fee

export class PaymentService {
  async createEntryPaymentIntent(sessionId: string): Promise<{
    clientSecret: string;
    amount: number;
    currency: string;
  }> {
    const session = await sessionService.getSessionById(sessionId);
    if (!session) throw new Error('Session not found');

    const intent = await stripe.paymentIntents.create({
      amount: ENTRY_FEE_CENTS,
      currency: 'usd',
      metadata: {
        type: 'entry_fee',
        sessionId,
      },
    });

    return {
      clientSecret: intent.client_secret!,
      amount: intent.amount,
      currency: intent.currency,
    };
  }

  async createPeekPaymentIntent(
    secretId: string,
    sessionId: string,
    type: 'PEEK' | 'UNLOCK'
  ): Promise<{
    clientSecret: string;
    amount: number;
    currency: string;
  }> {
    const secret = await prisma.secret.findUnique({ where: { id: secretId } });
    if (!secret) throw new Error('Secret not found');

    const price = type === 'PEEK' ? secret.peekPrice : secret.unlockPrice;
    if (!price) throw new Error('This secret does not have a price set for this action');

    const amountCents = Math.round(Number(price) * 100);

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      metadata: {
        type: type === 'PEEK' ? 'peek_fee' : 'unlock_fee',
        secretId,
        sessionId,
        peekType: type,
      },
    });

    return {
      clientSecret: intent.client_secret!,
      amount: intent.amount,
      currency: intent.currency,
    };
  }

  async confirmPeek(
    secretId: string,
    sessionId: string,
    txId: string,
    type: 'PEEK' | 'UNLOCK'
  ): Promise<void> {
    const secret = await prisma.secret.findUnique({ where: { id: secretId } });
    if (!secret) throw new Error('Secret not found');

    const price = type === 'PEEK' ? secret.peekPrice : secret.unlockPrice;
    const amountPaid = price ? Number(price) : 0;

    // Record the peek
    await prisma.$transaction([
      prisma.peek.create({
        data: {
          secretId,
          sessionId,
          type,
          amountPaid,
          txId,
        },
      }),
      prisma.secret.update({
        where: { id: secretId },
        data:
          type === 'PEEK'
            ? { peekCount: { increment: 1 } }
            : { peekCount: { increment: 1 }, unlockCount: { increment: 1 } },
      }),
    ]);

    // Add peek fee to pool
    if (amountPaid > 0) {
      await poolService.addPeekFeeToPool(secretId, amountPaid);
    }
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const { env } = await import('../config/env');
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as any;
      const { type, sessionId, secretId, peekType } = intent.metadata;

      if (type === 'peek_fee' || type === 'unlock_fee') {
        // Auto-confirm peek if payment succeeded via webhook
        const existingPeek = await prisma.peek.findFirst({
          where: { txId: intent.id },
        });
        if (!existingPeek && secretId && sessionId) {
          await this.confirmPeek(secretId, sessionId, intent.id, peekType as 'PEEK' | 'UNLOCK');
        }
      }
    }
  }

  async requestPayout(
    sessionId: string,
    amount: number,
    method: string,
    destination: string
  ): Promise<Payout> {
    const session = await sessionService.getSessionById(sessionId);
    if (!session) throw new Error('Session not found');

    const availableEarnings = Number(session.earnings);
    if (amount > availableEarnings) {
      throw new Error('Insufficient earnings for payout');
    }

    const validMethods = ['CRYPTO_USDC', 'PLATFORM_CREDIT'];
    if (!validMethods.includes(method)) {
      throw new Error('Invalid payout method');
    }

    const payout = await prisma.$transaction(async (tx) => {
      const p = await tx.payout.create({
        data: {
          sessionId,
          amount,
          method: method as PayoutMethod,
          destination,
          status: PayoutStatus.PENDING,
        },
      });

      await tx.anonSession.update({
        where: { id: sessionId },
        data: { earnings: { decrement: amount } },
      });

      return p;
    });

    await sessionService.invalidateCache(sessionId);
    return payout;
  }

  async getPayouts(sessionId: string): Promise<Payout[]> {
    return prisma.payout.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const paymentService = new PaymentService();
