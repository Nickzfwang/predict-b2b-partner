import { NextRequest, NextResponse } from 'next/server';
import { getPMClientFromParam } from '@/lib/get-pm-client';
import { getUserPrefix } from '@/lib/wallet-mode';
import { toApiErrorResponse } from '@/app/api/_utils/pm-error';

export async function POST(request: NextRequest) {
  try {
    const modeParam = request.nextUrl.searchParams.get('mode');
    const { client: pmClient, mode } = getPMClientFromParam(modeParam);
    const userPrefix = getUserPrefix(mode);

    const body = (await request.json()) as {
      userId?: unknown;
      amount?: unknown;
      reference_id?: unknown;
      note?: unknown;
    };

    if (!body.userId || typeof body.userId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (typeof body.amount !== 'number' || Number.isNaN(body.amount) || body.amount < 0.01) {
      return NextResponse.json({ error: 'amount must be a number >= 0.01' }, { status: 400 });
    }

    const res = await pmClient.deposit(`${userPrefix}${body.userId}`, {
      amount: body.amount,
      ...(typeof body.reference_id === 'string' ? { reference_id: body.reference_id } : {}),
      ...(typeof body.note === 'string' ? { note: body.note } : {}),
    });

    return NextResponse.json(res);
  } catch (error) {
    console.error('[wallet/deposit] Error:', error);
    return toApiErrorResponse(error, 'Failed to deposit');
  }
}
