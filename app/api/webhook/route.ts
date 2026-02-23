import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/predict-markets';

/** predict-markets webhook 事件型別 */
type WebhookEvent =
  | { event: 'trade.created'; data: { market_id: string; outcome: string; shares: number; amount: number } }
  | { event: 'market.resolved'; data: { market_id: string; outcome: string } }
  | { event: 'position.settled'; data: { market_id: string; user_id: string; payout: number } }
  | { event: string; data: Record<string, unknown> };

/**
 * POST /api/webhook
 *
 * 接收來自 predict-markets 的 webhook 推送。
 * 驗簽通過後根據事件類型執行對應邏輯。
 *
 * 目前實作：
 * - trade.created → console.log（Demo 用）
 * - market.resolved → console.log
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.PM_WEBHOOK_SECRET;

  // 取得原始 body（驗簽需要原始字串）
  const rawBody = await request.text();
  const signature = request.headers.get('x-webhook-signature') ?? '';

  // 驗簽（有設定 secret 時才驗）
  if (webhookSecret) {
    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.warn('[webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let payload: WebhookEvent;
  try {
    payload = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log(`[webhook] Received event: ${payload.event}`, payload.data);

  // 根據事件類型處理
  switch (payload.event) {
    case 'trade.created':
      // TODO: 可在此推送 Server-Sent Events 給前端，顯示即時通知
      console.log('[webhook] Trade created:', payload.data);
      break;

    case 'market.resolved':
      console.log('[webhook] Market resolved:', payload.data);
      break;

    case 'position.settled':
      console.log('[webhook] Position settled:', payload.data);
      break;

    default:
      console.log(`[webhook] Unhandled event: ${payload.event}`);
  }

  return NextResponse.json({ received: true });
}
