import { NextRequest, NextResponse } from 'next/server';
import { getPMClientFromParam } from '@/lib/get-pm-client';
import { toApiErrorResponse } from '@/app/api/_utils/pm-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  try {
    const { date } = await params;

    // 驗證日期格式 YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 },
      );
    }

    const modeParam = request.nextUrl.searchParams.get('mode');
    const { client: pmClient } = getPMClientFromParam(modeParam);

    const res = await pmClient.getReconciliationReport(date);
    return NextResponse.json(res);
  } catch (error) {
    console.error('[reconciliation] Error:', error);
    return toApiErrorResponse(error, 'Failed to fetch reconciliation report');
  }
}
