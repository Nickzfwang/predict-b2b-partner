import { NextRequest, NextResponse } from 'next/server';
import { getPMClientFromParam } from '@/lib/get-pm-client';

/**
 * GET /api/markets
 *
 * Proxy predict-markets 市場列表 API，供 Client Component 使用。
 * 支援的 query params: status, category, sort, page, per_page
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const modeParam = searchParams.get('mode');
    const { client: pmClient } = getPMClientFromParam(modeParam);

    const params: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key === 'mode') continue;
      params[key] = value;
    }

    const response = await pmClient.getMarkets(params);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[markets] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 },
    );
  }
}
