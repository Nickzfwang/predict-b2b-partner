'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  PredictMarketWidget,
  PredictMarketTheme,
  TradeCompletedData,
} from '@/types/sdk';
import { getDictionary } from '@/lib/i18n';

// ─── 型別 ─────────────────────────────────────────────────────────────────────

type WidgetStatus = 'loading' | 'ready' | 'error';

export interface EmbedWidgetProps {
  /** PM embed 伺服器 base URL，例如 http://localhost:8000/embed */
  embedBaseUrl: string;
  /** 初始 embed JWT（由 Server Component 透過 /api/embed-token 取得） */
  initialToken: string;
  /** Demo 用戶 ID（例如 'alice'），用於 token 過期時自動刷新 */
  userId: string;
  /** SDK 路由，例如 '/markets', '/portfolio', '/markets/{id}' */
  route?: string;
  /** iframe 高度，例如 '600px'，預設 '600px' */
  height?: string;
  /** 精簡模式 */
  compact?: boolean;
  /** 隱藏 embed header */
  hideHeader?: boolean;
  /** 隱藏 embed footer */
  hideFooter?: boolean;
  /** 主題設定 */
  theme?: Partial<PredictMarketTheme>;
  /** 語系 */
  locale?: string;
  /** 交易完成時的回呼 */
  onTradeComplete?: (data: TradeCompletedData) => void;
  /** 錢包模式（transfer | seamless） */
  walletMode?: string;
  className?: string;
}

// 預設淺色主題（舊版 SDK 的 theme: 'light' 對應）
const DEFAULT_LIGHT_THEME: Partial<PredictMarketTheme> = {
  backgroundColor: '#FFFFFF',
  textColor: '#1E293B',
  primaryColor: '#10B981',
};

// ─── 元件 ─────────────────────────────────────────────────────────────────────

export function EmbedWidget({
  embedBaseUrl,
  initialToken,
  userId,
  route = '/markets',
  height = '600px',
  compact,
  hideHeader,
  hideFooter,
  theme,
  locale,
  onTradeComplete,
  walletMode,
  className = '',
}: EmbedWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<PredictMarketWidget | null>(null);
  const tokenRef = useRef<string>(initialToken);
  const [status, setStatus] = useState<WidgetStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const d = getDictionary(locale);

  // 優先使用 NEXT_PUBLIC_PM_EMBED_BASE_URL
  const resolvedEmbedBaseUrl =
    process.env.NEXT_PUBLIC_PM_EMBED_BASE_URL ?? embedBaseUrl;

  // SDK script URL：{origin}/sdk/predict-market-sdk.js
  const sdkUrl = `${resolvedEmbedBaseUrl.replace(/\/embed$/, '')}/sdk/predict-market-sdk.js`;

  const resolvedTheme = theme ?? DEFAULT_LIGHT_THEME;

  // ── Widget 初始化 ─────────────────────────────────────────────────────────
  const initializeWidget = useCallback(() => {
    if (!containerRef.current || !window.PredictMarket) return;

    // 清除舊實例
    widgetRef.current?.destroy();

    try {
      const widget = window.PredictMarket.init({
        container: containerRef.current,
        token: tokenRef.current,
        route,
        baseUrl: resolvedEmbedBaseUrl,
        theme: resolvedTheme,
        locale,
        compact,
        hideHeader,
        hideFooter,
        height,
        width: '100%',
        onTokenRefresh: async () => {
          const res = await fetch(`/api/embed-token?mode=${walletMode ?? 'transfer'}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          });
          if (!res.ok) throw new Error('Token refresh failed');
          const json = (await res.json()) as { embed_token: string };
          tokenRef.current = json.embed_token;
          return json.embed_token;
        },
        on: {
          'trade.completed': (data) => {
            onTradeComplete?.(data as TradeCompletedData);
          },
          'resize': () => {
            // auto-resize 由 SDK 處理
          },
          'auth_required': (data) => {
            console.warn('[EmbedWidget] Auth required:', data);
          },
          'error': (data) => {
            console.error('[EmbedWidget] SDK error:', data);
          },
        },
      });

      widgetRef.current = widget;
      setStatus('ready');
    } catch (err) {
      console.error('[EmbedWidget] Init error:', err);
      setErrorMessage('${d.embed.loadError}');
      setStatus('error');
    }
  }, [resolvedEmbedBaseUrl, route, height, compact, hideHeader, hideFooter, resolvedTheme, locale, onTradeComplete, userId, walletMode]);

  // ── 主題動態更新 ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (theme && widgetRef.current) {
      widgetRef.current.setTheme(theme);
    }
  }, [theme]);

  // ── SDK 載入與 Widget 初始化 ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const mountWidget = () => {
      if (cancelled) return;
      tokenRef.current = initialToken;
      setStatus('loading');
      setErrorMessage('');
      initializeWidget();
    };

    const handleScriptError = () => {
      if (cancelled) return;
      setErrorMessage('${d.embed.sdkError}');
      setStatus('error');
    };

    // 已載入直接初始化
    if (window.PredictMarket) {
      mountWidget();
      return;
    }

    // 避免重複加入 script 標籤
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${sdkUrl}"]`);
    if (existing) {
      existing.addEventListener('load', mountWidget);
      existing.addEventListener('error', handleScriptError);
      return () => {
        cancelled = true;
        existing.removeEventListener('load', mountWidget);
        existing.removeEventListener('error', handleScriptError);
        widgetRef.current?.destroy();
      };
    }

    const script = document.createElement('script');
    script.src = sdkUrl;
    script.async = true;
    script.onload = mountWidget;
    script.onerror = handleScriptError;
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      widgetRef.current?.destroy();
    };
  }, [sdkUrl, initializeWidget, initialToken, userId]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (status === 'error') {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-red-100 bg-red-50 text-center ${className}`}
        style={{ height }}
      >
        <span className="text-3xl">⚠️</span>
        <p className="max-w-xs text-sm text-red-600">{errorMessage}</p>
        <button
          onClick={() => {
            setStatus('loading');
            setErrorMessage('');
            initializeWidget();
          }}
          className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-200"
        >
          {d.common.retry}
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Loading 骨架 */}
      {status === 'loading' && (
        <div
          className="absolute inset-0 flex flex-col gap-3 p-4 overflow-hidden rounded-xl bg-gray-50"
          style={{ height }}
        >
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2 animate-pulse">
              <div className="w-2/3 h-4 bg-gray-200 rounded" />
              <div className="w-1/2 h-3 bg-gray-100 rounded" />
              <div className="w-full h-px mt-1 bg-gray-100" />
            </div>
          ))}
        </div>
      )}

      {/* SDK 掛載點 */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-xl"
        style={{ minHeight: height }}
      />
    </div>
  );
}
