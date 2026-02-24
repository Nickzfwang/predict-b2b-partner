import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookDeliverySignature } from '@/lib/predict-markets';
import { isWebhookEventProcessed, persistWebhookEvent } from '@/lib/webhook-event-store';

type SupportedWebhookEvent = 'trade.created' | 'user.balance_changed' | 'position.settled';

interface IncomingWebhookPayload {
  id: string;
  event: string;
  created_at?: string;
  data: Record<string, unknown>;
}

const SUPPORTED_EVENTS = new Set<SupportedWebhookEvent>([
  'trade.created',
  'user.balance_changed',
  'position.settled',
]);

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parsePayload(rawBody: string): IncomingWebhookPayload | null {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!isObjectRecord(parsed)) return null;
    if (typeof parsed.id !== 'string' || !parsed.id) return null;
    if (typeof parsed.event !== 'string' || !parsed.event) return null;
    if (!isObjectRecord(parsed.data)) return null;

    return {
      id: parsed.id,
      event: parsed.event,
      created_at: typeof parsed.created_at === 'string' ? parsed.created_at : undefined,
      data: parsed.data,
    };
  } catch {
    return null;
  }
}

function validateTimestamp(webhookTimestamp: string): boolean {
  const ts = Number(webhookTimestamp);
  if (!Number.isFinite(ts) || ts <= 0) return false;

  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - ts) <= 300;
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.PM_WEBHOOK_SECRET;
  const rawBody = await request.text();

  const webhookId = request.headers.get('x-webhook-id') ?? '';
  const webhookTimestamp = request.headers.get('x-webhook-timestamp') ?? '';
  const webhookSignature = request.headers.get('x-webhook-signature') ?? '';

  const payload = parsePayload(rawBody);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  // 優先使用 header 的 webhook id，缺失時 fallback payload.id
  const effectiveWebhookId = webhookId || payload.id;

  if (!validateTimestamp(webhookTimestamp)) {
    return NextResponse.json({ error: 'Webhook timestamp invalid or expired' }, { status: 401 });
  }

  if (webhookSecret) {
    const isValid = verifyWebhookDeliverySignature({
      webhookId: effectiveWebhookId,
      timestamp: webhookTimestamp,
      rawBody,
      signature: webhookSignature,
      secret: webhookSecret,
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  const alreadyProcessed = await isWebhookEventProcessed(payload.id);
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (SUPPORTED_EVENTS.has(payload.event as SupportedWebhookEvent)) {
    await persistWebhookEvent(payload);
  }

  return NextResponse.json({ received: true });
}
