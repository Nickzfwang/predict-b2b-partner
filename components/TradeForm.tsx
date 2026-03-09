'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface MarketOption {
  id: string;
  title: string;
}

interface TradeFormProps {
  userId: string;
  markets: MarketOption[];
  onSuccess?: () => void;
  walletMode?: string;
}

export function TradeForm({ userId, markets, onSuccess, walletMode }: TradeFormProps) {
  const router = useRouter();
  const initialMarketId = markets[0]?.id ?? '';
  const [marketId, setMarketId] = useState(initialMarketId);
  const [type, setType] = useState<'buy' | 'sell'>('buy');
  const [outcome, setOutcome] = useState<'yes' | 'no'>('yes');
  const [shares, setShares] = useState('10');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const disabled = useMemo(() => loading || markets.length === 0 || marketId.trim().length === 0, [loading, markets.length, marketId]);

  async function submitTrade() {
    setMessage('');
    setError('');

    const parsedShares = Number(shares);
    if (!Number.isInteger(parsedShares) || parsedShares < 1) {
      setError('股數需為大於等於 1 的整數');
      return;
    }

    const normalizedMarketId = marketId.trim();
    if (!normalizedMarketId) {
      setError('請先選擇市場');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/trades?mode=${walletMode ?? 'transfer'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, market_id: normalizedMarketId, type, outcome, shares: parsedShares }),
      });

      const json = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) {
        setError(json.error ?? '下單失敗');
        return;
      }

      setMessage('下單成功');
      onSuccess?.();
      router.refresh();
    } catch {
      setError('下單失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card lift-hover rounded-2xl border border-slate-200 p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">快速下單</h2>
      <p className="mt-1 text-xs text-slate-600">透過 `/api/trades` 代表用戶下單，展示交易執行路徑。</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          市場
          <select
            value={marketId}
            onChange={(e) => setMarketId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner"
            disabled={markets.length === 0}
          >
            {markets.length === 0 ? (
              <option value="">目前無可交易市場</option>
            ) : (
              markets.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))
            )}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          股數
          <input
            type="number"
            min="1"
            step="1"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          方向
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'buy' | 'sell')}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner"
          >
            <option value="buy">買入</option>
            <option value="sell">賣出</option>
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          結果
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as 'yes' | 'no')}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner"
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      </div>

      <button
        onClick={() => void submitTrade()}
        disabled={disabled}
        className="mt-4 w-full rounded-lg bg-gradient-to-r from-blue-700 to-indigo-700 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:from-blue-800 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? '送出中...' : '送出交易'}
      </button>

      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
      {markets.length === 0 && <p className="mt-3 text-sm text-amber-700">目前沒有可選市場，請稍後重整或先確認市場已開放交易。</p>}
    </div>
  );
}
