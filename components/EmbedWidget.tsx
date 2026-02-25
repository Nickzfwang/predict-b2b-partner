'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { PredictMarketInstance, TradeCompletedData } from '@/types/sdk';

// ─── 型別 ─────────────────────────────────────────────────────────────────────

export type EmbedMode = 'markets' | 'trade' | 'portfolio' | 'feed';

type WidgetStatus = 'loading' | 'ready' | 'error';

export interface EmbedWidgetProps {
  /** PM embed 伺服器 base URL，例如 http://localhost:8000/embed */
  embedBaseUrl: string;
  /** 初始 embed JWT（由 Server Component 透過 /api/embed-token 取得） */
  initialToken: string;
  /** Demo 用戶 ID（例如 'alice'），用於 token 過期時自動刷新 */
  userId: string;
  /** 渲染模式 */
  mode: EmbedMode;
  /** 指定市場 ID（mode='trade' 時必填；未填則降級為 markets 模式） */
  marketId?: string;
  /** iframe 高度（px），預設 600 */
  height?: number;
  /** 市場分類過濾（mode='markets' 時有效） */
  category?: string;
  /** 交易完成時的回呼 */
  onTradeComplete?: (data: TradeCompletedData) => void;
  className?: string;
}

// ─── 元件 ─────────────────────────────────────────────────────────────────────

export function EmbedWidget({
  embedBaseUrl,
  initialToken,
  userId,
  mode,
  marketId,
  height = 600,
  category,
  onTradeComplete,
  className = '',
}: EmbedWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pmRef = useRef<PredictMarketInstance | null>(null);
  const tokenRef = useRef<string>(initialToken);
  const [sdkReady, setSdkReady] = useState<boolean>(typeof window !== 'undefined' && !!window.PredictMarket);
  const [status, setStatus] = useState<WidgetStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // 確定實際渲染模式（marketId 缺失時降級）
  const effectiveMode: EmbedMode = mode === 'trade' && !marketId ? 'markets' : mode;

  // 優先使用 NEXT_PUBLIC_PM_EMBED_BASE_URL（dev: :5173/embed，prod: CDN/embed）
  // 這讓 embed 頁面（React route）與 API server（Laravel）可以在不同 port 執行
  const resolvedEmbedBaseUrl =
    process.env.NEXT_PUBLIC_PM_EMBED_BASE_URL ?? embedBaseUrl;

  // SDK script 放在 embed base 的上一層：{origin}/sdk/predict-market-sdk.js
  const sdkUrl = `${resolvedEmbedBaseUrl.replace(/\/embed$/, '')}/sdk/predict-market-sdk.js`;

  // ── Token 刷新 ────────────────────────────────────────────────────────────
  const refreshToken = useCallback(async () => {
    try {
      const res = await fetch('/api/embed-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) throw new Error('Token refresh failed');

      const json = (await res.json()) as { embed_token: string };
      tokenRef.current = json.embed_token;
      pmRef.current?.setToken(json.embed_token);
    } catch (err) {
      console.error('[EmbedWidget] Token refresh error:', err);
    }
  }, [userId]);

  // ── Widget 初始化 ─────────────────────────────────────────────────────────
  const initializeWidget = useCallback(() => {
    if (!containerRef.current || !window.PredictMarket) return;

    // 清除舊實例
    pmRef.current?.destroy();
    containerRef.current.innerHTML = '';

    try {
      const pm = new window.PredictMarket({
        embedBaseUrl: resolvedEmbedBaseUrl,
        token: tokenRef.current,
        locale: 'zh-TW',
        theme: 'light',
        onAuthRequired: () => {
          void refreshToken();
        },
        onTradeComplete: (data) => {
          onTradeComplete?.(data);
        },
        onError: (data) => {
          console.error('[EmbedWidget] SDK error:', data);
        },
      });

      pmRef.current = pm;

      const renderOptions = {
        height,
        hide_footer: false,
        ...(category ? { category } : {}),
      };

      switch (effectiveMode) {
        case 'markets':
          pm.renderMarketList(containerRef.current, renderOptions);
          break;
        case 'trade':
          if (marketId) {
            pm.renderTradePanel(containerRef.current, marketId, renderOptions);
          }
          break;
        case 'portfolio':
          pm.renderPortfolio(containerRef.current, renderOptions);
          break;
        case 'feed':
          pm.renderFeed(containerRef.current, renderOptions);
          break;
      }

      setStatus('ready');
    } catch (err) {
      console.error('[EmbedWidget] Init error:', err);
      setErrorMessage('載入市場元件時發生錯誤');
      setStatus('error');
    }
  }, [resolvedEmbedBaseUrl, effectiveMode, marketId, height, category, onTradeComplete, refreshToken]);

  // ── SDK 載入（只做一次）────────────────────────────────────────────────────
  useEffect(() => {
    // 已載入直接標記 ready
    if (window.PredictMarket) {
      setSdkReady(true);
      return;
    }

    // 避免重複加入 script 標籤
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${sdkUrl}"]`);
    if (existing) {
      const handleLoad = () => setSdkReady(true);
      existing.addEventListener('load', handleLoad);
      return () => {
        existing.removeEventListener('load', handleLoad);
      };
    }

    const script = document.createElement('script');
    script.src = sdkUrl;
    script.async = true;
    script.onload = () => setSdkReady(true);
    script.onerror = () => {
      setErrorMessage('無法載入預測市場 SDK，請確認 predict-markets 服務正在執行');
      setStatus('error');
    };
    document.head.appendChild(script);

    return () => {
      pmRef.current?.destroy();
    };
  }, [sdkUrl]);

  // ── SDK ready 後，依目前使用者/模式重新初始化 ─────────────────────────────
  useEffect(() => {
    if (!sdkReady) return;
    setStatus('loading');
    setErrorMessage('');
    initializeWidget();
  }, [sdkReady, initializeWidget, userId, initialToken]);

  // ── Token 更新時通知 SDK ──────────────────────────────────────────────────
  useEffect(() => {
    tokenRef.current = initialToken;
    pmRef.current?.setToken(initialToken);
  }, [initialToken]);

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
          重試
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
