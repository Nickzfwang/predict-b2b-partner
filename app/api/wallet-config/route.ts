import { NextRequest, NextResponse } from 'next/server';
import { getPMClient } from '@/lib/get-pm-client';
import { getUserPrefix } from '@/lib/wallet-mode';

/**
 * POST /api/wallet-config
 *
 * 設定 Seamless Wallet 的 callback URL（呼叫 PM PUT /wallet/config）。
 *
 * Body: { callback_url?: string; timeout_ms?: number }
 * 若未提供 callback_url，自動產生 http://localhost:3000/api/seamless-callback
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      callback_url?: unknown;
      timeout_ms?: unknown;
    };

    const pmClient = getPMClient('seamless');

    // 自動推導 callback URL
    const envBase = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    const defaultCallbackUrl = envBase
      ? `${envBase.replace(/\/$/, '')}/api/seamless-callback`
      : `${request.nextUrl.origin}/api/seamless-callback`;

    const callbackUrl = typeof body.callback_url === 'string' && body.callback_url.trim()
      ? body.callback_url.trim()
      : defaultCallbackUrl;

    const timeoutMs = typeof body.timeout_ms === 'number' && body.timeout_ms >= 1000 && body.timeout_ms <= 30000
      ? body.timeout_ms
      : 5000;

    const res = await pmClient.configWallet({
      seamless_callback_url: callbackUrl,
      seamless_timeout_ms: timeoutMs,
    });

    return NextResponse.json({
      success: true,
      data: res.data,
      configured_url: callbackUrl,
    });
  } catch (error) {
    console.error('[wallet-config] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to configure wallet';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/wallet-config/test
 * 或 POST /api/wallet-config?action=test
 *
 * 測試 Seamless Wallet callback 連通性。
 */
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      external_user_id?: unknown;
      userId?: unknown;
    };

    const pmClient = getPMClient('seamless');
    const prefix = getUserPrefix('seamless');

    const userId = typeof body.userId === 'string' ? body.userId : 'alice';
    const externalUserId = typeof body.external_user_id === 'string'
      ? body.external_user_id
      : `${prefix}${userId}`;

    const res = await pmClient.testCallback({ external_user_id: externalUserId });

    return NextResponse.json({
      success: true,
      data: res.data,
    });
  } catch (error) {
    console.error('[wallet-config/test] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to test callback';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
