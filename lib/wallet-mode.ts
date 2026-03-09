/**
 * 錢包模式解析與 credentials 對應
 *
 * SERVER-SIDE ONLY — 讀取 process.env，不可在 Client Component 使用。
 */

import type { PMCredentials } from './predict-markets';

// ─── Types ───────────────────────────────────────────────────────────────────

export type WalletMode = 'transfer' | 'seamless';

export const DEFAULT_WALLET_MODE: WalletMode = 'transfer';

// ─── Mode Resolution ─────────────────────────────────────────────────────────

/** 從 query param 解析錢包模式，無效值降級為 transfer */
export function resolveWalletMode(modeParam?: string | null): WalletMode {
  if (modeParam === 'seamless') return 'seamless';
  return 'transfer';
}

// ─── Credentials ─────────────────────────────────────────────────────────────

/** 依模式回傳對應的 PM API credentials */
export function getCredentialsForMode(mode: WalletMode): PMCredentials {
  if (mode === 'seamless') {
    return {
      apiKey: process.env.PM_SEAMLESS_API_KEY ?? '',
      apiSecret: process.env.PM_SEAMLESS_API_SECRET ?? '',
      baseUrl: process.env.PM_SEAMLESS_BASE_URL ?? process.env.PM_BASE_URL ?? '',
    };
  }
  return {
    apiKey: process.env.PM_API_KEY ?? '',
    apiSecret: process.env.PM_API_SECRET ?? '',
    baseUrl: process.env.PM_BASE_URL ?? '',
  };
}

// ─── User Prefix ─────────────────────────────────────────────────────────────

/** 依模式回傳 external_user_id 的前綴 */
export function getUserPrefix(mode: WalletMode): string {
  return mode === 'seamless' ? 'demo_seamless_' : 'demo_';
}

// ─── Webhook Secret ──────────────────────────────────────────────────────────

/** 依模式回傳 webhook secret */
export function getWebhookSecretForMode(mode: WalletMode): string {
  if (mode === 'seamless') {
    return process.env.PM_SEAMLESS_WEBHOOK_SECRET ?? '';
  }
  return process.env.PM_WEBHOOK_SECRET ?? '';
}
