'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDictionary } from '@/lib/i18n';

interface WalletActionsProps {
  userId: string;
  onSuccess?: () => void;
  walletMode?: string;
  locale?: string;
}

export function WalletActions({ userId, onSuccess, walletMode, locale }: WalletActionsProps) {
  const router = useRouter();
  const d = getDictionary(locale);
  const [depositAmount, setDepositAmount] = useState('100');
  const [withdrawAmount, setWithdrawAmount] = useState('50');
  const [loadingAction, setLoadingAction] = useState<'deposit' | 'withdraw' | null>(null);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  async function submitAction(type: 'deposit' | 'withdraw', amountText: string) {
    setLoadingAction(type);
    setMessage('');
    setError('');

    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount < 0.01) {
      setError(d.wallet.amountMinError);
      setLoadingAction(null);
      return;
    }

    try {
      const res = await fetch(`/api/wallet/${type}?mode=${walletMode ?? 'transfer'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount,
          reference_id: `${type}_${Date.now()}`,
        }),
      });

      const json = (await res.json()) as { error?: string; code?: string };

      if (!res.ok) {
        setError(json.error ?? (type === 'deposit' ? d.wallet.depositFailed : d.wallet.withdrawFailed));
        return;
      }

      setMessage(type === 'deposit' ? d.wallet.depositSuccess : d.wallet.withdrawSuccess);
      onSuccess?.();
      router.refresh();
    } catch {
      setError(type === 'deposit' ? d.wallet.depositFailed : d.wallet.withdrawFailed);
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="glass-card lift-hover rounded-2xl border border-slate-200 p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{d.wallet.actionTitle}</h2>
      <p className="mt-1 text-xs text-slate-600">{d.wallet.actionDesc}</p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-3">
          <label className="text-xs font-medium text-emerald-700">{d.wallet.depositAmount}</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-emerald-300 focus:ring"
          />
          <button
            onClick={() => void submitAction('deposit', depositAmount)}
            disabled={loadingAction !== null}
            className="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === 'deposit' ? d.wallet.processing : d.wallet.confirmDeposit}
          </button>
        </div>

        <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50 p-3">
          <label className="text-xs font-medium text-rose-700">{d.wallet.withdrawAmount}</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-rose-300 focus:ring"
          />
          <button
            onClick={() => void submitAction('withdraw', withdrawAmount)}
            disabled={loadingAction !== null}
            className="mt-2 w-full rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === 'withdraw' ? d.wallet.processing : d.wallet.confirmWithdraw}
          </button>
        </div>
      </div>

      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
    </div>
  );
}
