'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  PMDepositAccount,
  PMDepositRisk,
  PMDepositTransaction,
  PMDepositTransactionType,
} from '@/lib/predict-markets';
import { getDictionary, getIntlLocale, t } from '@/lib/i18n';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DepositDashboardProps {
  account: PMDepositAccount;
  risk: PMDepositRisk;
  walletMode: string;
  locale?: string;
}

interface TransactionFilters {
  type: PMDepositTransactionType | '';
  from: string;
  to: string;
  page: number;
}

interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const RISK_LEVEL_CONFIG = {
  normal: { label: '正常', color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  yellow: { label: '警告', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  orange: { label: '危險', color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  red: { label: '嚴重', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
} as const;

const TXN_TYPE_BADGE: Record<PMDepositTransactionType, string> = {
  deposit: 'bg-emerald-100 text-emerald-700',
  withdrawal: 'bg-red-100 text-red-700',
  freeze: 'bg-blue-100 text-blue-700',
  unfreeze: 'bg-cyan-100 text-cyan-700',
  settlement_debit: 'bg-orange-100 text-orange-700',
  settlement_credit: 'bg-green-100 text-green-700',
  fee_debit: 'bg-rose-100 text-rose-700',
  revenue_credit: 'bg-teal-100 text-teal-700',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatAmount(val: string, locale: string): string {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DepositDashboard({ account, risk, walletMode, locale }: DepositDashboardProps) {
  const d = getDictionary(locale);
  const intlLocale = getIntlLocale(locale);
  const [transactions, setTransactions] = useState<PMDepositTransaction[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>({
    type: '',
    from: '',
    to: '',
    page: 1,
  });

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('mode', walletMode);
      if (filters.type) params.set('type', filters.type);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      params.set('page', String(filters.page));
      params.set('per_page', '10');

      const res = await fetch(`/api/deposit/transactions?${params.toString()}`);
      const json: unknown = await res.json();

      if (typeof json === 'object' && json !== null && 'data' in json) {
        const body = json as { data: PMDepositTransaction[]; meta?: { pagination?: PaginationMeta } };
        setTransactions(Array.isArray(body.data) ? body.data : []);
        setPagination(body.meta?.pagination ?? null);
      }
    } catch (err) {
      console.error('[DepositDashboard] fetch transactions error:', err);
    } finally {
      setLoading(false);
    }
  }, [walletMode, filters]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const riskLabelMap = {
    normal: d.deposit.riskNormal,
    yellow: d.deposit.riskWarning,
    orange: d.deposit.riskDanger,
    red: d.deposit.riskCritical,
  } as const;
  const riskConfig = RISK_LEVEL_CONFIG[risk.risk_alert_level] ?? RISK_LEVEL_CONFIG.normal;
  const transactionTypeLabels: Record<PMDepositTransactionType, string> = {
    deposit: d.deposit.typeDeposit,
    withdrawal: d.deposit.typeWithdrawal,
    freeze: d.deposit.typeFreeze,
    unfreeze: d.deposit.typeUnfreeze,
    settlement_debit: d.deposit.typeSettlementDebit,
    settlement_credit: d.deposit.typeSettlementCredit,
    fee_debit: d.deposit.typeFeeDebit,
    revenue_credit: d.deposit.typeRevenueCredit,
  };
  const transactionTypes: { value: PMDepositTransactionType; label: string }[] = [
    { value: 'deposit', label: d.deposit.typeDeposit },
    { value: 'withdrawal', label: d.deposit.typeWithdrawal },
    { value: 'freeze', label: d.deposit.typeFreeze },
    { value: 'unfreeze', label: d.deposit.typeUnfreeze },
    { value: 'settlement_debit', label: d.deposit.typeSettlementDebit },
    { value: 'settlement_credit', label: d.deposit.typeSettlementCredit },
    { value: 'fee_debit', label: d.deposit.typeFeeDebit },
    { value: 'revenue_credit', label: d.deposit.typeRevenueCredit },
  ];

  return (
    <div className="space-y-6">
      {/* ── Account Summary ─────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label={d.deposit.totalDeposit} value={`$${formatAmount(account.total_deposit, intlLocale)}`} />
        <SummaryCard label={d.deposit.availableBalance} value={`$${formatAmount(account.available_balance, intlLocale)}`} highlight />
        <SummaryCard label={d.deposit.frozenBalance} value={`$${formatAmount(account.frozen_balance, intlLocale)}`} />
        <SummaryCard label={d.deposit.feePayableRevenueReceivable} value={`$${formatAmount(account.fee_payable, intlLocale)} / $${formatAmount(account.revenue_receivable, intlLocale)}`} />
      </div>

      {/* ── Risk Status ─────────────────────────────────────── */}
      <section className="table-surface p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">{d.deposit.riskStatus}</h2>
        <div className="flex flex-wrap items-center gap-4">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${riskConfig.color}`}>
            <span className={`inline-block h-2 w-2 rounded-full ${riskConfig.dot}`} />
            {riskLabelMap[risk.risk_alert_level] ?? d.deposit.riskNormal}
          </span>

          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>
              {d.deposit.riskRatio}：
              <strong className="text-slate-900">
                {risk.risk_ratio !== null ? `${(risk.risk_ratio * 100).toFixed(1)}%` : 'N/A'}
              </strong>
            </span>
            <span>
              {d.deposit.exposure}：<strong className="text-slate-900">${formatAmount(risk.current_exposure, intlLocale)}</strong>
            </span>
          </div>

          {risk.trading_restricted && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
              {d.deposit.tradingRestricted}
            </span>
          )}
        </div>

        {risk.active_alert && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">
              {d.deposit.activeAlert} - {riskLabelMap[risk.active_alert.alert_level] ?? risk.active_alert.alert_level}
            </p>
            <p className="mt-1 text-xs text-amber-600">
              {d.deposit.triggeredAt}：{new Date(risk.active_alert.triggered_at).toLocaleString(intlLocale)}
              {' | '}
              {d.deposit.actionTaken}：{risk.active_alert.action_taken}
            </p>
          </div>
        )}

        {risk.last_check_at && (
          <p className="mt-2 text-xs text-slate-400">
            {d.deposit.lastCheckAt}：{new Date(risk.last_check_at).toLocaleString(intlLocale)}
          </p>
        )}
      </section>

      {/* ── Transaction Filters ─────────────────────────────── */}
      <section className="table-surface p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">{d.deposit.transactionRecords}</h2>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-600">
            {d.deposit.filterType}
            <select
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 sm:w-40"
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as PMDepositTransactionType | '', page: 1 }))}
            >
              <option value="">{d.deposit.allTypes}</option>
              {transactionTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-600">
            {d.deposit.fromDate}
            <input
              type="date"
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 sm:w-40"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))}
            />
          </label>

          <label className="text-xs text-slate-600">
            {d.deposit.toDate}
            <input
              type="date"
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 sm:w-40"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))}
            />
          </label>
        </div>

        {/* ── Mobile Cards ─────────────────────────────────── */}
        <div className="space-y-2 sm:hidden">
          {loading && <p className="py-4 text-center text-sm text-slate-400">{d.common.loading}</p>}
          {!loading && transactions.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-500">{d.deposit.noTransactions}</p>
          )}
          {!loading &&
            transactions.map((txn) => (
              <article key={txn.id} className="mobile-data-card">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TXN_TYPE_BADGE[txn.type]}`}>
                    {transactionTypeLabels[txn.type]}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(txn.created_at).toLocaleString(intlLocale)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">${formatAmount(txn.amount, intlLocale)}</p>
                <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-slate-500">
                  <span>{d.deposit.beforeBalance}：${formatAmount(txn.balance_before, intlLocale)}</span>
                  <span className="text-right">{d.deposit.afterBalance}：${formatAmount(txn.balance_after, intlLocale)}</span>
                  <span>{d.deposit.beforeFrozen}：${formatAmount(txn.frozen_before, intlLocale)}</span>
                  <span className="text-right">{d.deposit.afterFrozen}：${formatAmount(txn.frozen_after, intlLocale)}</span>
                </div>
                {txn.note && <p className="mt-1 text-xs text-slate-400">{txn.note}</p>}
              </article>
            ))}
        </div>

        {/* ── Desktop Table ────────────────────────────────── */}
        <div className="hidden overflow-x-auto sm:block">
          {loading && <p className="py-4 text-center text-sm text-slate-400">{d.common.loading}</p>}
          {!loading && transactions.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-500">{d.deposit.noTransactions}</p>
          )}
          {!loading && transactions.length > 0 && (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="table-head-row text-left text-xs">
                  <th className="py-2 pr-3">{d.common.time}</th>
                  <th className="py-2 pr-3">{d.deposit.filterType}</th>
                  <th className="py-2 pr-3">{d.common.amount}</th>
                  <th className="py-2 pr-3">{d.deposit.beforeBalance}</th>
                  <th className="py-2 pr-3">{d.deposit.afterBalance}</th>
                  <th className="py-2 pr-3">{d.deposit.beforeFrozen}</th>
                  <th className="py-2 pr-3">{d.deposit.afterFrozen}</th>
                  <th className="py-2 pr-3">{d.deposit.note}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id} className="table-body-row">
                    <td className="whitespace-nowrap py-2 pr-3">{new Date(txn.created_at).toLocaleString(intlLocale)}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TXN_TYPE_BADGE[txn.type]}`}>
                        {transactionTypeLabels[txn.type]}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-medium text-slate-900">${formatAmount(txn.amount, intlLocale)}</td>
                    <td className="py-2 pr-3">${formatAmount(txn.balance_before, intlLocale)}</td>
                    <td className="py-2 pr-3">${formatAmount(txn.balance_after, intlLocale)}</td>
                    <td className="py-2 pr-3">${formatAmount(txn.frozen_before, intlLocale)}</td>
                    <td className="py-2 pr-3">${formatAmount(txn.frozen_after, intlLocale)}</td>
                    <td className="py-2 pr-3 text-xs text-slate-500">{txn.note ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ───────────────────────────────────── */}
        {pagination && pagination.last_page > 1 && (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>
              {t(d.deposit.pageStatus, {
                current: String(pagination.current_page),
                last: String(pagination.last_page),
                total: String(pagination.total),
              })}
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.current_page <= 1}
                className="rounded border border-slate-300 px-3 py-1 text-xs disabled:opacity-40"
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              >
                {d.deposit.previousPage}
              </button>
              <button
                disabled={pagination.current_page >= pagination.last_page}
                className="rounded border border-slate-300 px-3 py-1 text-xs disabled:opacity-40"
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              >
                {d.deposit.nextPage}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`table-surface rounded-xl p-4 shadow-sm ${highlight ? 'ring-2 ring-emerald-200' : ''}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${highlight ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
