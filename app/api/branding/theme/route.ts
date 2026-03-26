import { NextRequest, NextResponse } from 'next/server';
import { getPMClientFromParam } from '@/lib/get-pm-client';
import { toApiErrorResponse } from '@/app/api/_utils/pm-error';

/**
 * PUT /api/branding/theme
 *
 * Proxy theme config update to PM PUT /branding/theme.
 * 支援 partial merge — 僅更新提供的欄位。
 */
export async function PUT(request: NextRequest) {
  try {
    const modeParam = request.nextUrl.searchParams.get('mode');
    const { client } = getPMClientFromParam(modeParam);

    const body = (await request.json()) as Record<string, unknown>;

    const result = await client.updateBrandingTheme(body);

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return toApiErrorResponse(error, 'Failed to update theme');
  }
}
