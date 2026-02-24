import { NextRequest, NextResponse } from 'next/server';
import { pmClient } from '@/lib/predict-markets';
import { toApiErrorResponse } from '@/app/api/_utils/pm-error';

const DEFAULT_EVENTS = ['trade.created', 'user.balance_changed', 'position.settled'];

function toStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const arr = value.filter((v): v is string => typeof v === 'string' && v.length > 0);
  return arr.length === value.length ? arr : null;
}

function normalizeEvents(events: string[]): string[] {
  return [...new Set(events.map((e) => e.trim()).filter(Boolean))].sort();
}

function buildCallbackUrl(request: NextRequest): string {
  const envBase = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envBase) {
    return `${envBase.replace(/\/$/, '')}/api/webhook`;
  }
  const origin = request.nextUrl.origin;
  return `${origin}/api/webhook`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      url?: unknown;
      events?: unknown;
      forceCreate?: unknown;
    };

    const callbackUrl =
      typeof body.url === 'string' && body.url.trim().length > 0
        ? body.url.trim()
        : buildCallbackUrl(request);

    const requestedEvents = toStringArray(body.events) ?? DEFAULT_EVENTS;
    const events = normalizeEvents(requestedEvents);

    if (!/^https?:\/\//.test(callbackUrl)) {
      return NextResponse.json({ error: 'url must be a valid http(s) URL' }, { status: 400 });
    }

    const forceCreate = body.forceCreate === true;

    if (!forceCreate) {
      const existingRes = await pmClient.getWebhooks();
      const existing = existingRes.data.find((item) => {
        const sameUrl = item.url.replace(/\/$/, '') === callbackUrl.replace(/\/$/, '');
        const itemEvents = normalizeEvents(item.events ?? []);
        const sameEvents = JSON.stringify(itemEvents) === JSON.stringify(events);
        return sameUrl && sameEvents;
      });

      if (existing) {
        return NextResponse.json({
          success: true,
          already_exists: true,
          data: existing,
          note: 'Webhook already registered with same url/events.',
        });
      }
    }

    const createdRes = await pmClient.createWebhook({
      url: callbackUrl,
      events,
    });

    return NextResponse.json({
      success: true,
      already_exists: false,
      data: createdRes.data,
      note: 'Save `data.secret` immediately. It is only returned once.',
    }, { status: 201 });
  } catch (error) {
    console.error('[webhook/register] Error:', error);
    return toApiErrorResponse(error, 'Failed to register webhook');
  }
}
