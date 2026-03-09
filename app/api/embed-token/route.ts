import { NextRequest, NextResponse } from 'next/server';
import { getPMClientFromParam } from '@/lib/get-pm-client';
import { getUserPrefix } from '@/lib/wallet-mode';

const DEFAULT_BALANCE = 1000;

/**
 * POST /api/embed-token
 *
 * 1. 同步 Demo 用戶到 predict-markets
 * 2. 產生 embed token 回傳給前端
 *
 * Body: { userId: string; permissions?: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const modeParam = request.nextUrl.searchParams.get('mode');
    const { client: pmClient, mode } = getPMClientFromParam(modeParam);
    const userPrefix = getUserPrefix(mode);

    const body = (await request.json()) as {
      userId?: unknown;
      permissions?: unknown;
    };

    if (!body.userId || typeof body.userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 },
      );
    }

    const externalUserId = `${userPrefix}${body.userId}`;

    // 同步用戶（已存在則更新，不存在則建立）
    await pmClient.syncUser({
      external_user_id: externalUserId,
      display_name: body.userId.charAt(0).toUpperCase() + body.userId.slice(1),
      initial_balance: DEFAULT_BALANCE,
    });

    // 產生 embed token
    const permissions = Array.isArray(body.permissions)
      ? (body.permissions as Array<'view_markets' | 'place_trades' | 'view_portfolio'>)
      : ['view_markets', 'place_trades', 'view_portfolio'] as const;

    const tokenResponse = await pmClient.getEmbedToken({
      external_user_id: externalUserId,
      permissions: [...permissions],
    });

    return NextResponse.json({
      embed_token: tokenResponse.data.embed_token,
      expires_at: tokenResponse.data.expires_at,
      embed_base_url: tokenResponse.data.embed_base_url,
    });
  } catch (error) {
    console.error('[embed-token] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate embed token' },
      { status: 500 },
    );
  }
}
