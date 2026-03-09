import { NextRequest, NextResponse } from 'next/server';
import { getPMClientFromParam } from '@/lib/get-pm-client';
import { toApiErrorResponse } from '@/app/api/_utils/pm-error';

export async function GET(request: NextRequest) {
  try {
    const modeParam = request.nextUrl.searchParams.get('mode');
    const { client: pmClient } = getPMClientFromParam(modeParam);

    const params: Record<string, string> = {};
    for (const [key, value] of request.nextUrl.searchParams.entries()) {
      if (key === 'mode') continue;
      params[key] = value;
    }

    const res = await pmClient.getAnalyticsDaily(params);
    return NextResponse.json(res);
  } catch (error) {
    console.error('[analytics/daily] Error:', error);
    return toApiErrorResponse(error, 'Failed to fetch analytics daily');
  }
}
