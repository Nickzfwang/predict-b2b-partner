import { NextRequest, NextResponse } from 'next/server';
import { getPMClientFromParam } from '@/lib/get-pm-client';
import { toApiErrorResponse } from '@/app/api/_utils/pm-error';

export async function GET(request: NextRequest) {
  try {
    const modeParam = request.nextUrl.searchParams.get('mode');
    const { client: pmClient } = getPMClientFromParam(modeParam);

    const res = await pmClient.getDepositRisk();
    return NextResponse.json(res);
  } catch (error) {
    console.error('[deposit/risk] Error:', error);
    return toApiErrorResponse(error, 'Failed to fetch deposit risk status');
  }
}
