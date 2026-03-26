/**
 * predict-markets Widget SDK 型別宣告
 * SDK script: {baseUrl}/sdk/embed.js
 *
 * 新版 API 使用 PredictMarket.init() 取代舊的 constructor + render 方法。
 */

// ─── Event Types ─────────────────────────────────────────────────────────────

export type PredictMarketEventName =
  | 'trade.completed'
  | 'navigation'
  | 'resize'
  | 'auth_required'
  | 'error';

export type PredictMarketEventCallback = (data: unknown) => void;

// ─── Event Data ──────────────────────────────────────────────────────────────

export interface TradeCompletedData {
  marketId: string;
  outcome: string;
  amount: number;
}

export interface NavigationData {
  path: string;
}

export interface ResizeData {
  height: number;
}

export interface AuthRequiredData {
  reason: string;
}

export interface ErrorData {
  message: string;
  code: string;
}

// ─── Theme ───────────────────────────────────────────────────────────────────

export interface PredictMarketTheme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  fontFamily?: string;
}

// ─── Init Config ─────────────────────────────────────────────────────────────

export interface PredictMarketInitConfig {
  /** 掛載容器（CSS selector 或 HTMLElement） */
  container: string | HTMLElement;
  /** embed JWT token */
  token: string;
  /** 初始路由，例如 '/markets', '/portfolio', '/markets/{id}' */
  route?: string;
  /** PM embed base URL（可省略，SDK 會從 script src 推斷） */
  baseUrl?: string;
  /** 主題設定 */
  theme?: Partial<PredictMarketTheme>;
  /** 語系，例如 'zh-TW' */
  locale?: string;
  /** 精簡模式：縮小 padding、隱藏 nav、字體較小 */
  compact?: boolean;
  /** 隱藏 embed header */
  hideHeader?: boolean;
  /** 隱藏 embed footer */
  hideFooter?: boolean;
  /** iframe 寬度，預設 '100%' */
  width?: string;
  /** iframe 高度，預設 '600px' */
  height?: string;
  /** Token 即將過期時的刷新回呼，回傳新 token */
  onTokenRefresh?: () => Promise<string>;
  /** 事件監聽 */
  on?: Partial<Record<PredictMarketEventName, PredictMarketEventCallback>>;
}

// ─── Widget Instance ─────────────────────────────────────────────────────────

export interface PredictMarketWidget {
  /** 導航到指定路由 */
  navigate(path: string): void;
  /** 動態更新主題 */
  setTheme(theme: Partial<PredictMarketTheme>): void;
  /** 銷毀 widget，移除 iframe 並清理事件 */
  destroy(): void;
  /** 註冊事件監聽 */
  on(event: PredictMarketEventName, callback: PredictMarketEventCallback): void;
  /** 移除事件監聽 */
  off(event: PredictMarketEventName, callback: PredictMarketEventCallback): void;
}

// ─── Static Constructor ──────────────────────────────────────────────────────

export interface PredictMarketStatic {
  init(config: PredictMarketInitConfig): PredictMarketWidget;
}

declare global {
  interface Window {
    PredictMarket?: PredictMarketStatic;
  }
}
