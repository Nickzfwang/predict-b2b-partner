/**
 * predict-markets B2B API Client
 *
 * SERVER-SIDE ONLY — 此模組使用 PM_API_SECRET，絕對不能在 Client Component import。
 * 在 Client Component 需要資料時，請透過 app/api/ 路由中轉。
 */

import { createHash, createHmac, timingSafeEqual } from 'crypto';

// ─── 型別定義 ────────────────────────────────────────────────────────────────

export interface PMMarket {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'open' | 'closed' | 'judging' | 'resolved';
  yes_price: number;
  no_price: number;
  probability: number;
  volume: number;
  participant_count: number;
  closes_at: string;
  created_at: string;
  is_trending: boolean;
  price_change_24h: number;
  embed_url: string;
  creator: {
    display_name: string;
    avatar: string;
  };
}

export interface PMUser {
  external_user_id: string;
  internal_user_id: number;
  display_name: string;
  email?: string;
  balance: number;
  total_trades: number;
  created_at: string;
}

export interface PMBalanceTransaction {
  external_user_id: string;
  amount: number;
  balance_after: number;
  reference_id?: string;
}

export interface PMEmbedToken {
  embed_token: string;
  expires_at: string;
  embed_base_url: string;
}

export interface PMTrade {
  trade_id: string;
  external_user_id: string;
  market_id: string;
  type: 'buy' | 'sell';
  outcome: 'yes' | 'no';
  shares: number;
  price_per_share: number;
  total_amount: number;
  user_balance_after: number;
  created_at: string;
  position?: {
    yes_shares: number;
    no_shares: number;
    total_invested: number;
    current_value: number;
    unrealized_profit: number;
  };
}

export interface PMPosition {
  position_id: string;
  external_user_id: string;
  market_id: string;
  market_title: string;
  market_status: 'open' | 'closed' | 'judging' | 'resolved';
  yes_shares: number;
  no_shares: number;
  total_invested: number;
  current_value: number;
  unrealized_profit: number;
  realized_profit: number;
  created_at: string;
  updated_at: string;
}

export interface PMPriceHistoryPoint {
  ts: string;
  yes_price: number;
  no_price: number;
  volume?: number;
}

export interface PMWebhook {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'disabled';
  created_at: string;
  updated_at?: string;
  secret?: string;
}

export interface PMAnalyticsOverview {
  total_users: number;
  total_trades: number;
  total_volume: number;
  today: { trades: number; volume: number };
  last_30_days: { trades: number; volume: number };
  tier: string;
  rate_limit_per_minute: number;
  revenue_share_rate: number;
}

export interface PMAnalyticsDaily {
  date: string;
  trades: number;
  volume: number;
  new_users: number;
}

export interface PMApiResponse<T> {
  success: boolean;
  data: T;
  meta: {
    request_id: string;
    timestamp: string;
    pagination?: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
    };
  };
}

export interface PMApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    request_id: string;
    timestamp: string;
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPMApiResponse<T>(value: unknown): value is PMApiResponse<T> {
  if (!isObjectRecord(value)) return false;
  return (
    value.success === true &&
    'data' in value &&
    isObjectRecord(value.meta) &&
    typeof value.meta.request_id === 'string' &&
    typeof value.meta.timestamp === 'string'
  );
}

// ─── Credentials ─────────────────────────────────────────────────────────────

export interface PMCredentials {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

// ─── HMAC 簽名工具 ───────────────────────────────────────────────────────────

function buildSignature(apiSecret: string, method: string, path: string, body: string): { timestamp: string; signature: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyHash = createHash('sha256').update(body).digest('hex');
  const signingString = `${method.toUpperCase()}\n${path}\n${timestamp}\n${bodyHash}`;
  const signature = createHmac('sha256', apiSecret).update(signingString).digest('hex');

  return { timestamp, signature };
}

// ─── HTTP Client ─────────────────────────────────────────────────────────────

async function pmFetch<T>(
  credentials: PMCredentials,
  method: string,
  endpoint: string,
  body?: Record<string, unknown>,
  queryParams?: Record<string, string>,
): Promise<PMApiResponse<T>> {
  const { apiKey, apiSecret, baseUrl } = credentials;

  if (!apiKey) throw new Error(`PM API Key is not set (received empty value). Check your .env.local credentials and restart the dev server.`);
  if (!apiSecret) throw new Error(`PM API Secret is not set (received empty value). Check your .env.local credentials and restart the dev server.`);
  if (!baseUrl) throw new Error(`PM Base URL is not set (received empty value). Check your .env.local credentials and restart the dev server.`);

  const path = `/api/v1/b2b${endpoint}`;
  const bodyString = body ? JSON.stringify(body) : '';

  const url = new URL(`${baseUrl}${path}`);
  if (queryParams) {
    Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  // PM 的 replay protection 會拒絕同秒重複簽名。
  // 這裡在碰到 "Signature already used" 時延遲 1.1 秒後重試一次。
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { timestamp, signature } = buildSignature(apiSecret, method, path, bodyString);

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'X-API-Key': apiKey,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      ...(bodyString ? { body: bodyString } : {}),
      cache: 'no-store',
    });

    const rawText = await response.text();
    let parsed: unknown = {};

    if (rawText) {
      try {
        parsed = JSON.parse(rawText) as unknown;
      } catch {
        parsed = { message: rawText };
      }
    }

    if (isPMApiResponse<T>(parsed)) {
      return parsed;
    }

    if (response.ok && isObjectRecord(parsed) && !('success' in parsed)) {
      return {
        success: true,
        data: ('data' in parsed ? parsed.data : parsed) as T,
        meta: {
          request_id: '',
          timestamp: new Date().toISOString(),
        },
      };
    }

    let code = `HTTP_${response.status}`;
    let message = response.statusText || 'Request failed';

    if (isObjectRecord(parsed)) {
      if (isObjectRecord(parsed.error)) {
        const apiCode = parsed.error.code;
        const apiMessage = parsed.error.message;
        if (typeof apiCode === 'string' && apiCode) code = apiCode;
        if (typeof apiMessage === 'string' && apiMessage) message = apiMessage;
      } else if (typeof parsed.message === 'string' && parsed.message) {
        message = parsed.message;
      }
    }

    const isSignatureReplay =
      code === 'UNAUTHORIZED' &&
      message.toLowerCase().includes('signature already used');

    if (isSignatureReplay && attempt < 1) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
      continue;
    }

    throw new Error(`[PM API] ${code}: ${message}`);
  }

  throw new Error('[PM API] Unknown error');
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface PMWalletConfig {
  wallet_mode: string;
  seamless_callback_url: string;
  seamless_timeout_ms: number;
}

/** 建立一組綁定特定 credentials 的 pmClient */
export function createPMClient(credentials: PMCredentials) {
  const c = credentials;

  return {
    /** 取得市場列表 */
    getMarkets(params?: Record<string, string>) {
      return pmFetch<PMMarket[]>(c, 'GET', '/markets', undefined, params);
    },

    /** 取得單一市場 */
    getMarket(id: string) {
      return pmFetch<PMMarket>(c, 'GET', `/markets/${id}`);
    },

    /** 同步 / 建立 Demo 用戶 */
    syncUser(payload: {
      external_user_id: string;
      display_name: string;
      email?: string;
      initial_balance?: number;
    }) {
      return pmFetch<PMUser>(c, 'POST', '/users/sync', payload);
    },

    /** 取得用戶資訊 */
    getUser(externalUserId: string) {
      return pmFetch<PMUser>(c, 'GET', `/users/${externalUserId}`);
    },

    /** 入金 */
    deposit(externalUserId: string, payload: {
      amount: number;
      reference_id?: string;
      note?: string;
    }) {
      return pmFetch<PMBalanceTransaction>(c, 'POST', `/users/${externalUserId}/deposit`, payload);
    },

    /** 出金 */
    withdraw(externalUserId: string, payload: {
      amount: number;
      reference_id?: string;
      note?: string;
    }) {
      return pmFetch<PMBalanceTransaction>(c, 'POST', `/users/${externalUserId}/withdraw`, payload);
    },

    /** 產生 embed token（供 iframe SDK 使用） */
    getEmbedToken(payload: {
      external_user_id?: string;
      permissions?: Array<'view_markets' | 'place_trades' | 'view_portfolio'>;
      ttl?: number;
    }) {
      return pmFetch<PMEmbedToken>(c, 'POST', '/auth/embed-token', payload);
    },

    /** 下單 */
    placeTrade(payload: {
      external_user_id: string;
      market_id: string;
      type: 'buy' | 'sell';
      outcome: 'yes' | 'no';
      shares: number;
    }) {
      return pmFetch<PMTrade>(c, 'POST', '/trades', payload);
    },

    /** 交易列表 */
    getTrades(params?: Record<string, string>) {
      return pmFetch<PMTrade[]>(c, 'GET', '/trades', undefined, params);
    },

    /** 持倉列表 */
    getPositions(params?: Record<string, string>) {
      return pmFetch<PMPosition[]>(c, 'GET', '/positions', undefined, params);
    },

    /** 單一市場交易列表 */
    getMarketTrades(marketId: string, params?: Record<string, string>) {
      return pmFetch<PMTrade[]>(c, 'GET', `/markets/${marketId}/trades`, undefined, params);
    },

    /** 單一市場價格歷史 */
    getMarketPriceHistory(marketId: string, params?: Record<string, string>) {
      return pmFetch<PMPriceHistoryPoint[]>(c, 'GET', `/markets/${marketId}/price-history`, undefined, params);
    },

    /** 建立 webhook */
    createWebhook(payload: { url: string; events: string[] }) {
      return pmFetch<PMWebhook>(c, 'POST', '/webhooks', payload);
    },

    /** 取得 webhook 列表 */
    getWebhooks() {
      return pmFetch<PMWebhook[]>(c, 'GET', '/webhooks');
    },

    /** 更新 webhook */
    updateWebhook(webhookId: string, payload: { url?: string; events?: string[]; status?: 'active' | 'disabled' }) {
      return pmFetch<PMWebhook>(c, 'PUT', `/webhooks/${webhookId}`, payload);
    },

    /** 刪除 webhook */
    deleteWebhook(webhookId: string) {
      return pmFetch<{ id: string }>(c, 'DELETE', `/webhooks/${webhookId}`);
    },

    /** 總覽分析 */
    getAnalyticsOverview() {
      return pmFetch<PMAnalyticsOverview>(c, 'GET', '/analytics/overview');
    },

    /** 每日分析 */
    getAnalyticsDaily(params?: Record<string, string>) {
      return pmFetch<PMAnalyticsDaily[]>(c, 'GET', '/analytics/daily', undefined, params);
    },

    /** 設定 Seamless Wallet callback URL */
    configWallet(payload: { seamless_callback_url: string; seamless_timeout_ms?: number }) {
      return pmFetch<PMWalletConfig>(c, 'PUT', '/wallet/config', payload);
    },

    /** 測試 Seamless Wallet callback 連通性 */
    testCallback(payload: { external_user_id: string }) {
      return pmFetch<{ status: string; balance?: number; currency?: string; message?: string }>(c, 'POST', '/wallet/test-callback', payload);
    },
  };
}

export type PMClient = ReturnType<typeof createPMClient>;

/** 預設 client（向下相容，使用 process.env 的 Transfer 模式 credentials） */
export const pmClient = createPMClient({
  apiKey: process.env.PM_API_KEY ?? '',
  apiSecret: process.env.PM_API_SECRET ?? '',
  baseUrl: process.env.PM_BASE_URL ?? '',
});

// ─── Webhook 驗簽 ────────────────────────────────────────────────────────────

/**
 * 驗證來自 predict-markets 的 webhook 簽名
 * @param rawBody  原始 request body（string）
 * @param signature  X-Webhook-Signature header 值
 * @param secret  建立 webhook 時取得的 secret
 */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const signatureBuf = Buffer.from(signature, 'utf8');

  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

/**
 * 驗證新版 webhook delivery 簽名
 * sign_string = "{webhook_id}.{timestamp}.{json_payload}"
 */
export function verifyWebhookDeliverySignature(params: {
  webhookId: string;
  timestamp: string;
  rawBody: string;
  signature: string;
  secret: string;
}): boolean {
  const { webhookId, timestamp, rawBody, signature, secret } = params;
  const normalizedSignature = signature.replace(/^sha256=/, '');
  const signingString = `${webhookId}.${timestamp}.${rawBody}`;
  const expected = createHmac('sha256', secret).update(signingString).digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const signatureBuf = Buffer.from(normalizedSignature, 'utf8');

  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}
