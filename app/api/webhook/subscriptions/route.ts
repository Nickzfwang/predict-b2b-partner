import { NextResponse } from 'next/server';
import { pmClient } from '@/lib/predict-markets';
import { toApiErrorResponse } from '@/app/api/_utils/pm-error';

export async function GET() {
  try {
    const res = await pmClient.getWebhooks();
    return NextResponse.json(res);
  } catch (error) {
    console.error('[webhook/subscriptions] Error:', error);
    return toApiErrorResponse(error, 'Failed to fetch webhook subscriptions');
  }
}
