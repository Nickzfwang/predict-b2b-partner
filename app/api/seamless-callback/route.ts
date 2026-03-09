import { NextRequest, NextResponse } from 'next/server';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import * as store from '@/lib/seamless-balance-store';

/**
 * POST /api/seamless-callback
 *
 * predict-markets 在 Seamless 模式下會呼叫此端點進行 debit/credit/rollback/getBalance。
 * 使用 Seamless Partner 的 API Secret 驗證 HMAC 簽名。
 */

interface CallbackPayload {
  action: 'getBalance' | 'debit' | 'credit' | 'rollback';
  transaction_id: string;
  round_id?: string;
  external_user_id: string;
  amount?: number;
  currency?: string;
  description?: string;
  original_transaction_id?: string;
  reason?: string;
  timestamp?: string;
  request_id?: string;
  metadata?: Record<string, unknown>;
}

function verifyCallbackSignature(request: NextRequest, rawBody: string): boolean {
  const secret = process.env.PM_SEAMLESS_API_SECRET;
  if (!secret) return false;

  const timestamp = request.headers.get('x-timestamp') ?? '';
  const signature = request.headers.get('x-signature') ?? '';
  if (!timestamp || !signature) return false;

  const urlPath = new URL(request.url).pathname;
  const bodyHash = createHash('sha256').update(rawBody).digest('hex');
  const signingString = `POST\n${urlPath}\n${timestamp}\n${bodyHash}`;
  const expected = createHmac('sha256', secret).update(signingString).digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const signatureBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // 驗證 HMAC 簽名
  if (!verifyCallbackSignature(request, rawBody)) {
    console.error('[seamless-callback] Signature verification failed');
    return NextResponse.json(
      { status: 'error', error_code: 'INVALID_SIGNATURE', message: 'Signature verification failed' },
      { status: 401 },
    );
  }

  let payload: CallbackPayload;
  try {
    payload = JSON.parse(rawBody) as CallbackPayload;
  } catch {
    return NextResponse.json(
      { status: 'error', error_code: 'INVALID_JSON', message: 'Invalid JSON payload' },
      { status: 400 },
    );
  }

  console.log(`[seamless-callback] action=${payload.action} user=${payload.external_user_id} txn=${payload.transaction_id}`);

  switch (payload.action) {
    case 'getBalance': {
      const balance = await store.logGetBalance(payload.external_user_id, payload.transaction_id);
      return NextResponse.json({
        status: 'ok',
        balance,
        currency: 'USD',
        transaction_id: payload.transaction_id,
      });
    }

    case 'debit': {
      const result = await store.debit(
        payload.external_user_id,
        payload.amount ?? 0,
        payload.transaction_id,
        payload.description,
        payload.metadata,
      );
      if (result.status === 'error') {
        return NextResponse.json({
          status: 'error',
          error_code: result.error_code,
          message: 'Insufficient balance',
          balance: result.balance,
        });
      }
      return NextResponse.json({
        status: 'ok',
        balance: result.balance,
        currency: 'USD',
        transaction_id: payload.transaction_id,
      });
    }

    case 'credit': {
      const result = await store.credit(
        payload.external_user_id,
        payload.amount ?? 0,
        payload.transaction_id,
        payload.description,
        payload.metadata,
      );
      return NextResponse.json({
        status: 'ok',
        balance: result.balance,
        currency: 'USD',
        transaction_id: payload.transaction_id,
      });
    }

    case 'rollback': {
      const result = await store.rollback(
        payload.external_user_id,
        payload.amount ?? 0,
        payload.transaction_id,
        payload.original_transaction_id ?? '',
        payload.reason,
      );
      return NextResponse.json({
        status: 'ok',
        balance: result.balance,
        currency: 'USD',
        transaction_id: payload.transaction_id,
      });
    }

    default:
      return NextResponse.json(
        { status: 'error', error_code: 'UNKNOWN_ACTION', message: `Unknown action: ${String((payload as { action?: unknown }).action)}` },
        { status: 400 },
      );
  }
}
