import { NextRequest, NextResponse } from 'next/server';
import { pmClient } from '@/lib/predict-markets';
import { toApiErrorResponse } from '@/app/api/_utils/pm-error';

const USER_PREFIX = 'demo_';

export async function POST(request: NextRequest) {
  try {
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

    const res = await pmClient.deposit(`${USER_PREFIX}${body.userId}`, {
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
