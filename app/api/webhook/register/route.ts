import { NextRequest, NextResponse } from 'next/server';
import { getPMClientFromParam } from '@/lib/get-pm-client';
import { toApiErrorResponse } from '@/app/api/_utils/pm-error';

const DEFAULT_EVENTS = ['trade.created', 'user.balance_changed', 'position.settled', 'market.voided'];

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
    const modeParam = request.nextUrl.searchParams.get('mode');
    const { client: pmClient } = getPMClientFromParam(modeParam);

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
      const sameUrlWebhook = existingRes.data.find((item) => {
        return item.url.replace(/\/$/, '') === callbackUrl.replace(/\/$/, '');
      });

      if (sameUrlWebhook) {
        const existingEvents = normalizeEvents(sameUrlWebhook.events ?? []);
        const sameEvents = JSON.stringify(existingEvents) === JSON.stringify(events);
        const isActive = sameUrlWebhook.status === 'active';

        if (sameEvents && isActive) {
          return NextResponse.json({
            success: true,
            already_exists: true,
            data: sameUrlWebhook,
            note: 'Webhook already registered with same url/events.',
          });
        }

        // Events differ or webhook is disabled → update subscription
        const updatePayload: { events?: string[]; status?: 'active' | 'disabled' } = {};
        if (!sameEvents) updatePayload.events = events;
        if (!isActive) updatePayload.status = 'active';

        const updatedRes = await pmClient.updateWebhook(sameUrlWebhook.id, updatePayload);
        return NextResponse.json({
          success: true,
          already_exists: true,
          updated: true,
          reactivated: !isActive,
          data: updatedRes.data,
          previous_events: existingEvents,
          current_events: events,
          note: !isActive
            ? 'Webhook updated and reactivated (was disabled due to consecutive failures).'
            : 'Webhook events updated to include new event types.',
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
