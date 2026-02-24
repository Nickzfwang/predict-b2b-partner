import { NextRequest, NextResponse } from 'next/server';
import { pmClient } from '@/lib/predict-markets';
import { toApiErrorResponse } from '@/app/api/_utils/pm-error';

const USER_PREFIX = 'demo_';

export async function GET(request: NextRequest) {
  try {
    const params: Record<string, string> = {};
    for (const [key, value] of request.nextUrl.searchParams.entries()) {
      params[key] = value;
    }

    if (params.userId && !params.external_user_id) {
      params.external_user_id = `${USER_PREFIX}${params.userId}`;
      delete params.userId;
    }

    const res = await pmClient.getPositions(params);
    return NextResponse.json(res);
  } catch (error) {
    console.error('[positions] Error:', error);
    return toApiErrorResponse(error, 'Failed to fetch positions');
  }
}
