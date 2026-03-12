import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';

export async function stripeWebhookHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  try {
    await paymentService.handleStripeWebhook(req.body as Buffer, signature);
    res.json({ received: true });
  } catch (err: any) {
    console.error('[StripeWebhook] Error:', err.message);
    res.status(400).json({ error: err.message });
  }
}
