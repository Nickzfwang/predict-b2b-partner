/**
 * 便利函式：依 WalletMode 取得對應的 pmClient
 *
 * SERVER-SIDE ONLY — 讀取 process.env，不可在 Client Component 使用。
 */

import { createPMClient, type PMClient } from './predict-markets';
import { resolveWalletMode, getCredentialsForMode, type WalletMode } from './wallet-mode';

/** 依指定模式建立 pmClient */
export function getPMClient(mode: WalletMode): PMClient {
  return createPMClient(getCredentialsForMode(mode));
}

/** 從 query param 解析模式並建立 pmClient */
export function getPMClientFromParam(modeParam?: string | null): { client: PMClient; mode: WalletMode } {
  const mode = resolveWalletMode(modeParam);
  return { client: getPMClient(mode), mode };
}
