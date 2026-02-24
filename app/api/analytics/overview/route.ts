import { NextResponse } from 'next/server';
import { pmClient } from '@/lib/predict-markets';
import { toApiErrorResponse } from '@/app/api/_utils/pm-error';

export async function GET() {
  try {
    const res = await pmClient.getAnalyticsOverview();
    return NextResponse.json(res);
  } catch (error) {
    console.error('[analytics/overview] Error:', error);
    return toApiErrorResponse(error, 'Failed to fetch analytics overview');
  }
}
