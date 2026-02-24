import { NextResponse } from 'next/server';

const PM_ERROR_STATUS: Record<string, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BUSINESS_ERROR: 422,
  INSUFFICIENT_BALANCE: 422,
  RATE_LIMITED: 429,
};

function extractPmErrorCode(message: string): string | null {
  const match = message.match(/\[PM API\]\s+([A-Z0-9_]+):/);
  return match?.[1] ?? null;
}

export function toApiErrorResponse(error: unknown, fallbackMessage: string) {
  const message = error instanceof Error ? error.message : fallbackMessage;
  const code = extractPmErrorCode(message);
  const status = code ? (PM_ERROR_STATUS[code] ?? 500) : 500;

  return NextResponse.json(
    {
      error: fallbackMessage,
      ...(code ? { code } : {}),
    },
    { status },
  );
}
