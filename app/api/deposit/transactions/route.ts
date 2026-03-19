import { NextRequest, NextResponse } from 'next/server';
import { getPMClientFromParam } from '@/lib/get-pm-client';
import { toApiErrorResponse } from '@/app/api/_utils/pm-error';

export async function GET(request: NextRequest) {
  try {
    const modeParam = request.nextUrl.searchParams.get('mode');
    const { client: pmClient } = getPMClientFromParam(modeParam);

    const params: Record<string, string> = {};
    const type = request.nextUrl.searchParams.get('type');
    const from = request.nextUrl.searchParams.get('from');
    const to = request.nextUrl.searchParams.get('to');
    const page = request.nextUrl.searchParams.get('page');
    const perPage = request.nextUrl.searchParams.get('per_page');

    if (type) params.type = type;
    if (from) params.from = from;
    if (to) params.to = to;
    if (page) params.page = page;
    if (perPage) params.per_page = perPage;

    const res = await pmClient.getDepositTransactions(params);
    return NextResponse.json(res);
  } catch (error) {
    console.error('[deposit/transactions] Error:', error);
    return toApiErrorResponse(error, 'Failed to fetch deposit transactions');
  }
}
