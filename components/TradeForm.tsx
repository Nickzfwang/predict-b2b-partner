'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDictionary } from '@/lib/i18n';

interface MarketOption {
  id: string;
  title: string;
}

interface TradeFormProps {
  userId: string;
  markets: MarketOption[];
  onSuccess?: () => void;
  walletMode?: string;
  locale?: string;
}

export function TradeForm({ userId, markets, onSuccess, walletMode, locale }: TradeFormProps) {
  const router = useRouter();
  const d = getDictionary(locale);
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
      setError(d.trades.sharesIntegerError);
      return;
    }

    const normalizedMarketId = marketId.trim();
    if (!normalizedMarketId) {
      setError(d.trades.chooseMarketError);
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
        setError(json.error ?? d.trades.submitFailed);
        return;
      }

      setMessage(d.trades.submitSuccess);
      onSuccess?.();
      router.refresh();
    } catch {
      setError(d.trades.submitRetry);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card lift-hover rounded-2xl border border-slate-200 p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{d.trades.quickOrderTitle}</h2>
      <p className="mt-1 text-xs text-slate-600">{d.trades.quickOrderDesc}</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          {d.trades.market}
          <select
            value={marketId}
            onChange={(e) => setMarketId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner"
            disabled={markets.length === 0}
          >
            {markets.length === 0 ? (
              <option value="">{d.trades.noMarkets}</option>
            ) : (
              markets.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))
            )}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          {d.common.shares}
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
          {d.wallet.direction}
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'buy' | 'sell')}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner"
          >
            <option value="buy">{d.trades.buy}</option>
            <option value="sell">{d.trades.sell}</option>
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          {d.trades.outcome}
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as 'yes' | 'no')}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner"
          >
            <option value="yes">{d.common.yes}</option>
            <option value="no">{d.common.no}</option>
          </select>
        </label>
      </div>

      <button
        onClick={() => void submitTrade()}
        disabled={disabled}
        className="mt-4 w-full rounded-lg bg-gradient-to-r from-blue-700 to-indigo-700 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:from-blue-800 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? d.trades.submitting : d.trades.submit}
      </button>

      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
      {markets.length === 0 && <p className="mt-3 text-sm text-amber-700">{d.trades.noMarkets}</p>}
    </div>
  );
}
