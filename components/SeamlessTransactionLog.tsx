'use client';

import { useCallback, useEffect, useState } from 'react';
import { getDictionary, getIntlLocale } from '@/lib/i18n';

interface SeamlessTransaction {
  transaction_id: string;
  action: 'getBalance' | 'debit' | 'credit' | 'rollback';
  external_user_id: string;
  amount: number;
  balance_after: number;
  timestamp: string;
  description?: string;
}

interface SeamlessTransactionLogProps {
  userId: string;
  locale?: string;
}

export function SeamlessTransactionLog({ userId, locale }: SeamlessTransactionLogProps) {
  const d = getDictionary(locale);
  const intlLocale = getIntlLocale(locale);
  const [transactions, setTransactions] = useState<SeamlessTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const actionLabels: Record<string, { label: string; color: string }> = {
    getBalance: { label: d.common.balance, color: 'bg-gray-100 text-gray-700' },
    debit: { label: d.deposit.typeSettlementDebit, color: 'bg-rose-100 text-rose-700' },
    credit: { label: d.deposit.typeSettlementCredit, color: 'bg-emerald-100 text-emerald-700' },
    rollback: { label: d.deposit.typeRevenueCredit, color: 'bg-amber-100 text-amber-700' },
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/seamless-transactions?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) return;
      const json = (await res.json()) as { transactions: SeamlessTransaction[] };
      setTransactions(json.transactions);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => void fetchData(), 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  const filtered = transactions.filter((t) => t.action !== 'getBalance');

  return (
    <div className="glass-card rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{d.wallet.seamlessLogTitle}</h2>
          <p className="mt-1 text-xs text-slate-600">{d.wallet.seamlessLogDesc}</p>
        </div>
        <button
          onClick={() => void fetchData()}
          className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
        >
          {d.common.refresh}
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">{d.wallet.noCallbackLogs} {d.wallet.callbackLogsHint}</p>
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-2 sm:hidden">
            {filtered.slice(-20).reverse().map((txn) => {
              const actionMeta = actionLabels[txn.action] ?? { label: txn.action, color: 'bg-gray-100 text-gray-700' };
              return (
                <article key={txn.transaction_id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionMeta.color}`}>
                      {actionMeta.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(txn.timestamp).toLocaleString(intlLocale)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <p>{d.common.amount}：${txn.amount.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-right font-semibold text-slate-900">
                      {d.common.balance}：${txn.balance_after.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  {txn.description && (
                    <p className="mt-1 text-xs text-slate-500">{txn.description}</p>
                  )}
                </article>
              );
            })}
          </div>

          {/* Desktop */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="py-2 pr-3">{d.common.time}</th>
                  <th className="py-2 pr-3">{d.wallet.callbackAction}</th>
                  <th className="py-2 pr-3">{d.common.amount}</th>
                  <th className="py-2 pr-3">{d.common.balance}</th>
                  <th className="py-2 pr-3">{d.deposit.note}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(-20).reverse().map((txn) => {
                  const actionMeta = actionLabels[txn.action] ?? { label: txn.action, color: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={txn.transaction_id} className="border-b border-slate-50 text-slate-700 last:border-b-0">
                      <td className="py-2 pr-3 text-xs">
                        {new Date(txn.timestamp).toLocaleString(intlLocale)}
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionMeta.color}`}>
                          {actionMeta.label}
                        </span>
                      </td>
                      <td className="py-2 pr-3">${txn.amount.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2 pr-3 font-medium text-slate-900">${txn.balance_after.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2 pr-3 text-xs text-slate-500">{txn.description ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
