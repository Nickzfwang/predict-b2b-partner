import { NextRequest, NextResponse } from 'next/server';
import { getPMClientFromParam } from '@/lib/get-pm-client';
import { getUserPrefix } from '@/lib/wallet-mode';
import { toApiErrorResponse } from '@/app/api/_utils/pm-error';

export async function GET(request: NextRequest) {
  try {
    const modeParam = request.nextUrl.searchParams.get('mode');
    const { client: pmClient, mode } = getPMClientFromParam(modeParam);
    const userPrefix = getUserPrefix(mode);

    const params: Record<string, string> = {};
    for (const [key, value] of request.nextUrl.searchParams.entries()) {
      if (key === 'mode') continue;
      params[key] = value;
    }

    if (params.userId && !params.external_user_id) {
      params.external_user_id = `${userPrefix}${params.userId}`;
      delete params.userId;
    }

    const res = await pmClient.getTrades(params);
    return NextResponse.json(res);
  } catch (error) {
    console.error('[trades] GET Error:', error);
    return toApiErrorResponse(error, 'Failed to fetch trades');
  }
}

export async function POST(request: NextRequest) {
  try {
    const modeParam = request.nextUrl.searchParams.get('mode');
    const { client: pmClient, mode } = getPMClientFromParam(modeParam);
    const userPrefix = getUserPrefix(mode);

    const body = (await request.json()) as {
      userId?: unknown;
      market_id?: unknown;
      type?: unknown;
      outcome?: unknown;
      shares?: unknown;
    };

    if (!body.userId || typeof body.userId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!body.market_id || typeof body.market_id !== 'string') {
      return NextResponse.json({ error: 'market_id is required' }, { status: 400 });
    }

    if (body.type !== 'buy' && body.type !== 'sell') {
      return NextResponse.json({ error: 'type must be buy or sell' }, { status: 400 });
    }

    if (body.outcome !== 'yes' && body.outcome !== 'no') {
      return NextResponse.json({ error: 'outcome must be yes or no' }, { status: 400 });
    }

    if (
      typeof body.shares !== 'number' ||
      Number.isNaN(body.shares) ||
      !Number.isInteger(body.shares) ||
      body.shares < 1
    ) {
      return NextResponse.json({ error: 'shares must be an integer >= 1' }, { status: 400 });
    }

    const res = await pmClient.placeTrade({
      external_user_id: `${userPrefix}${body.userId}`,
      market_id: body.market_id,
      type: body.type,
      outcome: body.outcome,
      shares: body.shares,
    });

    return NextResponse.json(res, { status: 201 });
  } catch (error) {
    console.error('[trades] POST Error:', error);
    return toApiErrorResponse(error, 'Failed to place trade');
  }
}
