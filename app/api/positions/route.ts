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

    const res = await pmClient.getPositions(params);
    return NextResponse.json(res);
  } catch (error) {
    console.error('[positions] Error:', error);
    return toApiErrorResponse(error, 'Failed to fetch positions');
  }
}
