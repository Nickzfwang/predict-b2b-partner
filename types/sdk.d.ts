/**
 * predict-markets JavaScript SDK 型別宣告
 * SDK script: {embedBaseUrl}/sdk/predict-market-sdk.js
 */

export interface PredictMarketRenderOptions {
  height?: number;
  borderRadius?: string;
  theme?: string;
  locale?: string;
  category?: string;
  compact?: boolean;
  hide_header?: boolean;
  hide_footer?: boolean;
  primary_color?: string;
}

export interface TradeCompletedData {
  market_id: string;
  outcome: string;
  shares: number;
  amount: number;
}

export interface PriceUpdatedData {
  market_id: string;
  yes_price: number;
  no_price: number;
}

export interface PredictMarketSDKOptions {
  embedBaseUrl: string;
  token?: string;
  container?: string | Element;
  partnerId?: string;
  theme?: string | Record<string, string>;
  locale?: string;
  renderOptions?: PredictMarketRenderOptions;
  onTradeComplete?: (data: TradeCompletedData) => void;
  onPriceUpdate?: (data: PriceUpdatedData) => void;
  onReady?: (data: { iframeId: string }) => void;
  onError?: (data: { message: string; code: string }) => void;
  onEvent?: (evt: { event: string; data: unknown }) => void;
  onAuthRequired?: () => void;
}

export interface PredictMarketInstance {
  setToken(token: string): void;
  setTheme(theme: string | Record<string, string>): void;
  navigate(path: string): void;
  renderMarketList(selector: string | Element, options?: PredictMarketRenderOptions): void;
  renderMarket(selector: string | Element, marketId: string, options?: PredictMarketRenderOptions): void;
  renderTradePanel(selector: string | Element, marketId: string, options?: PredictMarketRenderOptions): void;
  renderPortfolio(selector: string | Element, options?: PredictMarketRenderOptions): void;
  renderFeed(selector: string | Element, options?: PredictMarketRenderOptions): void;
  on(eventName: string, callback: (data: unknown) => void): void;
  off(eventName: string, callback: (data: unknown) => void): void;
  destroy(): void;
}

export interface PredictMarketConstructor {
  new (options: PredictMarketSDKOptions): PredictMarketInstance;
  init(options: PredictMarketSDKOptions & { container: string | Element }): PredictMarketInstance;
}

declare global {
  interface Window {
    PredictMarket?: PredictMarketConstructor;
  }
}
