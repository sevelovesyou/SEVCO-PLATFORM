import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    await WebhookHandlers.processSparksWebhook(payload, signature);
  }

  static async processSparksWebhook(payload: Buffer, signature: string): Promise<void> {
    const stripe = await getUncachableStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: import('stripe').Stripe.Event;
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      event = JSON.parse(payload.toString()) as import('stripe').Stripe.Event;
    }

    if (event.type !== 'checkout.session.completed') return;

    const session = event.data.object as import('stripe').Stripe.Checkout.Session;
    const sparkPackId = session.metadata?.spark_pack_id;
    if (!sparkPackId) return;

    const userId = session.metadata?.sevco_user_id;
    const sparks = parseInt(session.metadata?.sparks ?? '0', 10);
    const stripeSessionId = session.id;

    if (!userId || !sparks) {
      throw new Error(`[sparks webhook] Missing required metadata on session ${stripeSessionId}`);
    }

    const alreadyProcessed = await storage.isSparkSessionProcessed(stripeSessionId);
    if (alreadyProcessed) return;

    const pack = await storage.getSparkPack(parseInt(sparkPackId, 10));
    const packName = pack?.name ?? 'Spark Pack';

    try {
      await storage.creditSparks(userId, sparks, 'purchase', `Spark pack purchase — ${packName}`, { stripeSessionId });
    } catch (creditErr: any) {
      const isDuplicateSession = creditErr?.code === '23505' ||
        creditErr?.message?.includes('spark_txn_stripe_session_idx') ||
        creditErr?.message?.includes('unique');
      if (isDuplicateSession) {
        console.warn(`[sparks webhook] Duplicate session ${stripeSessionId} — skipping (already credited)`);
        return;
      }
      throw creditErr;
    }
  }
}
