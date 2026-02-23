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

export interface PMEmbedToken {
  embed_token: string;
  expires_at: string;
  embed_base_url: string;
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

// ─── HMAC 簽名工具 ───────────────────────────────────────────────────────────

function buildSignature(method: string, path: string, body: string): { timestamp: string; signature: string } {
  const apiSecret = process.env.PM_API_SECRET;
  if (!apiSecret) throw new Error('PM_API_SECRET is not set');

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyHash = createHash('sha256').update(body).digest('hex');
  const signingString = `${method.toUpperCase()}\n${path}\n${timestamp}\n${bodyHash}`;
  const signature = createHmac('sha256', apiSecret).update(signingString).digest('hex');

  return { timestamp, signature };
}

// ─── HTTP Client ─────────────────────────────────────────────────────────────

async function pmFetch<T>(
  method: string,
  endpoint: string,
  body?: Record<string, unknown>,
  queryParams?: Record<string, string>,
): Promise<PMApiResponse<T>> {
  const apiKey = process.env.PM_API_KEY;
  const baseUrl = process.env.PM_BASE_URL;

  if (!apiKey) throw new Error('PM_API_KEY is not set');
  if (!baseUrl) throw new Error('PM_BASE_URL is not set');

  const path = `/api/v1/b2b${endpoint}`;
  const bodyString = body ? JSON.stringify(body) : '';
  const { timestamp, signature } = buildSignature(method, path, bodyString);

  const url = new URL(`${baseUrl}${path}`);
  if (queryParams) {
    Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v));
  }

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

  const json = (await response.json()) as PMApiResponse<T> | PMApiError;

  if (!json.success) {
    const err = json as PMApiError;
    throw new Error(`[PM API] ${err.error.code}: ${err.error.message}`);
  }

  return json as PMApiResponse<T>;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const pmClient = {
  /** 取得市場列表 */
  getMarkets(params?: Record<string, string>) {
    return pmFetch<PMMarket[]>('GET', '/markets', undefined, params);
  },

  /** 取得單一市場 */
  getMarket(id: string) {
    return pmFetch<PMMarket>('GET', `/markets/${id}`);
  },

  /** 同步 / 建立 Demo 用戶 */
  syncUser(payload: {
    external_user_id: string;
    display_name: string;
    email?: string;
    initial_balance?: number;
  }) {
    return pmFetch<PMUser>('POST', '/users/sync', payload);
  },

  /** 取得用戶資訊 */
  getUser(externalUserId: string) {
    return pmFetch<PMUser>('GET', `/users/${externalUserId}`);
  },

  /** 產生 embed token（供 iframe SDK 使用） */
  getEmbedToken(payload: {
    external_user_id?: string;
    permissions?: Array<'view_markets' | 'place_trades' | 'view_portfolio'>;
    ttl?: number;
  }) {
    return pmFetch<PMEmbedToken>('POST', '/auth/embed-token', payload);
  },
};

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
