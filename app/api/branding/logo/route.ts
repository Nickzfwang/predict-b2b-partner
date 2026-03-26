import { NextRequest, NextResponse } from 'next/server';
import { getPMClientFromParam } from '@/lib/get-pm-client';
import { toApiErrorResponse } from '@/app/api/_utils/pm-error';

/**
 * POST /api/branding/logo
 *
 * Proxy logo upload to PM POST /branding/logo (multipart/form-data).
 * HMAC body hash 使用 SHA256('') — multipart 請求的特殊處理。
 */
export async function POST(request: NextRequest) {
  try {
    const modeParam = request.nextUrl.searchParams.get('mode');
    const { client } = getPMClientFromParam(modeParam);

    const formData = await request.formData();
    const logoFile = formData.get('logo');

    if (!logoFile || !(logoFile instanceof Blob)) {
      return NextResponse.json(
        { error: 'logo file is required', code: 'VALIDATION_ERROR' },
        { status: 422 },
      );
    }

    // 轉發到 PM API
    const pmFormData = new FormData();
    pmFormData.append('logo', logoFile);

    const result = await client.uploadBrandingLogo(pmFormData);

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return toApiErrorResponse(error, 'Failed to upload logo');
  }
}
