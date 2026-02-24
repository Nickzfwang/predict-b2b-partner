import { NextRequest, NextResponse } from 'next/server';
import { pmClient } from '@/lib/predict-markets';
import { toApiErrorResponse } from '@/app/api/_utils/pm-error';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const params: Record<string, string> = {};
    for (const [key, value] of request.nextUrl.searchParams.entries()) {
      params[key] = value;
    }

    const res = await pmClient.getMarketPriceHistory(id, params);
    return NextResponse.json(res);
  } catch (error) {
    console.error('[markets/:id/price-history] Error:', error);
    return toApiErrorResponse(error, 'Failed to fetch market price history');
  }
}
