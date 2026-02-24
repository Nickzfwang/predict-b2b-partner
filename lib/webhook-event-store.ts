import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import path from 'path';

interface StoredTradeCreatedEvent {
  event_id: string;
  created_at: string;
  trade_id: string;
  external_user_id: string;
  market_id: string;
  market_title?: string;
  type: string;
  outcome: string;
  shares: number;
  price_per_share: number;
  total_amount: number;
  user_balance_after: number;
}

interface StoredUserBalanceChangedEvent {
  event_id: string;
  created_at: string;
  external_user_id: string;
  change: number;
  balance_after: number;
  old_balance?: number;
  new_balance?: number;
  reference_id?: string;
  note?: string | null;
  reason: string;
}

interface StoredPositionSettledEvent {
  event_id: string;
  created_at: string;
  position_id: string;
  external_user_id: string;
  market_id: string;
  payout: number;
}

interface WebhookState {
  processed_event_ids: string[];
  trade_created: StoredTradeCreatedEvent[];
  user_balance_changed: StoredUserBalanceChangedEvent[];
  position_settled: StoredPositionSettledEvent[];
  updated_at: string;
}

const STORE_DIR = path.join(process.cwd(), '.runtime');
const STORE_PATH = path.join(STORE_DIR, 'webhook-events.json');
const TMP_PATH = `${STORE_PATH}.tmp`;

const MAX_PROCESSED_IDS = 5000;
const MAX_EVENT_ROWS = 1000;

function defaultState(): WebhookState {
  return {
    processed_event_ids: [],
    trade_created: [],
    user_balance_changed: [],
    position_settled: [],
    updated_at: new Date().toISOString(),
  };
}

async function readState(): Promise<WebhookState> {
  try {
    const content = await readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(content) as Partial<WebhookState>;

    return {
      processed_event_ids: Array.isArray(parsed.processed_event_ids)
        ? parsed.processed_event_ids.filter((v): v is string => typeof v === 'string')
        : [],
      trade_created: Array.isArray(parsed.trade_created)
        ? (parsed.trade_created as StoredTradeCreatedEvent[])
        : [],
      user_balance_changed: Array.isArray(parsed.user_balance_changed)
        ? (parsed.user_balance_changed as StoredUserBalanceChangedEvent[])
        : [],
      position_settled: Array.isArray(parsed.position_settled)
        ? (parsed.position_settled as StoredPositionSettledEvent[])
        : [],
      updated_at: typeof parsed.updated_at === 'string' ? parsed.updated_at : new Date().toISOString(),
    };
  } catch {
    return defaultState();
  }
}

async function writeState(state: WebhookState): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(TMP_PATH, JSON.stringify(state, null, 2), 'utf8');
  await rename(TMP_PATH, STORE_PATH);
}

function pushWithCap<T>(list: T[], item: T, maxRows: number): T[] {
  const next = [...list, item];
  return next.length > maxRows ? next.slice(next.length - maxRows) : next;
}

function capProcessedIds(ids: string[]): string[] {
  if (ids.length <= MAX_PROCESSED_IDS) return ids;
  return ids.slice(ids.length - MAX_PROCESSED_IDS);
}

function toNumberOrUndefined(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

export async function isWebhookEventProcessed(eventId: string): Promise<boolean> {
  const state = await readState();
  return state.processed_event_ids.includes(eventId);
}

export async function persistWebhookEvent(payload: {
  id: string;
  event: string;
  created_at?: string;
  data: Record<string, unknown>;
}): Promise<void> {
  const state = await readState();

  if (state.processed_event_ids.includes(payload.id)) {
    return;
  }

  const eventCreatedAt = typeof payload.created_at === 'string'
    ? payload.created_at
    : new Date().toISOString();

  const nextState: WebhookState = {
    ...state,
    processed_event_ids: capProcessedIds([...state.processed_event_ids, payload.id]),
    updated_at: new Date().toISOString(),
  };

  switch (payload.event) {
    case 'trade.created': {
      nextState.trade_created = pushWithCap(nextState.trade_created, {
        event_id: payload.id,
        created_at: eventCreatedAt,
        trade_id: String(payload.data.trade_id ?? ''),
        external_user_id: String(payload.data.external_user_id ?? ''),
        market_id: String(payload.data.market_id ?? ''),
        market_title: typeof payload.data.market_title === 'string' ? payload.data.market_title : undefined,
        type: String(payload.data.type ?? ''),
        outcome: String(payload.data.outcome ?? ''),
        shares: Number(payload.data.shares ?? 0),
        price_per_share: Number(payload.data.price_per_share ?? 0),
        total_amount: Number(payload.data.total_amount ?? 0),
        user_balance_after: Number(payload.data.user_balance_after ?? 0),
      }, MAX_EVENT_ROWS);
      break;
    }

    case 'user.balance_changed': {
      const change =
        toNumberOrUndefined(payload.data.change) ??
        toNumberOrUndefined(payload.data.change_amount) ??
        0;
      const balanceAfter =
        toNumberOrUndefined(payload.data.balance_after) ??
        toNumberOrUndefined(payload.data.new_balance) ??
        0;
      const oldBalance = toNumberOrUndefined(payload.data.old_balance);
      const newBalance = toNumberOrUndefined(payload.data.new_balance);

      nextState.user_balance_changed = pushWithCap(nextState.user_balance_changed, {
        event_id: payload.id,
        created_at: eventCreatedAt,
        external_user_id: String(payload.data.external_user_id ?? ''),
        change,
        balance_after: balanceAfter,
        old_balance: oldBalance,
        new_balance: newBalance,
        reference_id: typeof payload.data.reference_id === 'string' ? payload.data.reference_id : undefined,
        note:
          payload.data.note === null || typeof payload.data.note === 'string'
            ? payload.data.note
            : undefined,
        reason: String(payload.data.reason ?? ''),
      }, MAX_EVENT_ROWS);
      break;
    }

    case 'position.settled': {
      nextState.position_settled = pushWithCap(nextState.position_settled, {
        event_id: payload.id,
        created_at: eventCreatedAt,
        position_id: String(payload.data.position_id ?? ''),
        external_user_id: String(payload.data.external_user_id ?? ''),
        market_id: String(payload.data.market_id ?? ''),
        payout: Number(payload.data.payout ?? 0),
      }, MAX_EVENT_ROWS);
      break;
    }

    default:
      break;
  }

  await writeState(nextState);
}
