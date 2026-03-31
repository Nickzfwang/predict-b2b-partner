'use client';

import { useState, useCallback } from 'react';
import type { PMReconciliationReport, PMReconciliationStatus } from '@/lib/predict-markets';
import { getDictionary, getIntlLocale, t } from '@/lib/i18n';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReconciliationReportProps {
  walletMode: string;
  initialDate: string;
  locale?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PMReconciliationStatus, { label: string; color: string; dot: string }> = {
  clean: { label: '無差異', color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  minor_discrepancy: { label: '輕微差異', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  needs_review: { label: '待審查', color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  critical: { label: '嚴重差異', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtAmount(val: string, locale: string): string {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(val: string): string {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return `${(n * 100).toFixed(1)}%`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReconciliationReport({ walletMode, initialDate, locale }: ReconciliationReportProps) {
  const dict = getDictionary(locale);
  const intlLocale = getIntlLocale(locale);
  const [date, setDate] = useState(initialDate);
  const [report, setReport] = useState<PMReconciliationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async (targetDate: string) => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const params = new URLSearchParams({ mode: walletMode });
      const res = await fetch(`/api/reconciliation/${targetDate}?${params.toString()}`);
      const json: unknown = await res.json();

      if (!res.ok) {
        const errBody = json as { error?: string; code?: string };
        if (res.status === 404) {
          setError(t(dict.reconciliation.noReport, { date: targetDate }));
        } else {
          setError(errBody.error ?? t(dict.reconciliation.queryFailed, { status: String(res.status) }));
        }
        return;
      }

      if (typeof json === 'object' && json !== null && 'data' in json) {
        setReport((json as { data: PMReconciliationReport }).data);
      }
    } catch (err) {
      console.error('[ReconciliationReport] fetch error:', err);
      setError(dict.reconciliation.serverError);
    } finally {
      setLoading(false);
    }
  }, [walletMode, dict.reconciliation.noReport, dict.reconciliation.queryFailed, dict.reconciliation.serverError]);

  const handleQuery = () => {
    if (date) fetchReport(date);
  };

  const s = report?.summary;
  const reportData = report?.data;
  const snap = report?.balance_snapshot;
  const statusLabelMap: Record<PMReconciliationStatus, string> = {
    clean: dict.reconciliation.statusClean,
    minor_discrepancy: dict.reconciliation.statusMinorDiscrepancy,
    needs_review: dict.reconciliation.statusNeedsReview,
    critical: dict.reconciliation.statusCritical,
  };
  const statusConfig = report ? (STATUS_CONFIG[report.status] ?? STATUS_CONFIG.clean) : null;

  return (
    <div className="space-y-6">
      {/* ── Date Picker ─────────────────────────────────────── */}
      <section className="table-surface flex flex-wrap items-end gap-3 p-4 shadow-sm">
        <label className="text-xs text-slate-600">
          {dict.reconciliation.reportDate}
          <input
            type="date"
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 sm:w-48"
            value={date}
            max={initialDate}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <button
          className="rounded-lg bg-slate-800 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-40"
          onClick={handleQuery}
          disabled={loading || !date}
        >
          {loading ? dict.reconciliation.querying : dict.reconciliation.query}
        </button>
      </section>

      {/* ── Error ───────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      {/* ── Report Content ──────────────────────────────────── */}
      {report && s && reportData && snap && statusConfig && (
        <>
          {/* Status + Summary */}
          <section className="table-surface p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-slate-800">{t(dict.reconciliation.reportForDate, { date: report.report_date })}</h2>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusConfig.color}`}>
                  <span className={`inline-block h-2 w-2 rounded-full ${statusConfig.dot}`} />
                  {statusLabelMap[report.status]}
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {dict.reconciliation.generatedAt}：{new Date(report.generated_at).toLocaleString(intlLocale)}
              </span>
            </div>
          </section>

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard label={dict.reconciliation.totalTradeCount} value={s.total_trades.toLocaleString(intlLocale)} />
            <SummaryCard label={dict.reconciliation.totalVolume} value={`$${fmtAmount(s.total_volume, intlLocale)}`} />
            <SummaryCard label={dict.reconciliation.platformFees} value={`$${fmtAmount(s.total_fees, intlLocale)}`} />
            <SummaryCard label={dict.reconciliation.netSettlementAmount} value={`$${fmtAmount(s.total_settlements, intlLocale)}`} negative={parseFloat(s.total_settlements) < 0} />
            <SummaryCard label={dict.reconciliation.partnerRevenueShare} value={`$${fmtAmount(s.revenue_share_amount, intlLocale)}`} highlight />
            <SummaryCard
              label={dict.reconciliation.discrepancyAmount}
              value={`$${fmtAmount(s.discrepancy_amount, intlLocale)}`}
              negative={parseFloat(s.discrepancy_amount) !== 0}
            />
          </div>

          {/* Trade Detail */}
          <section className="table-surface p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">{dict.reconciliation.tradeDetails}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label={dict.reconciliation.totalCount} value={reportData.trades.total_count.toLocaleString(intlLocale)} />
              <MiniStat label={dict.reconciliation.buySummary} value={`${reportData.trades.buy_count.toLocaleString(intlLocale)} / $${fmtAmount(reportData.trades.buy_volume, intlLocale)}`} />
              <MiniStat label={dict.reconciliation.sellSummary} value={`${reportData.trades.sell_count.toLocaleString(intlLocale)} / $${fmtAmount(reportData.trades.sell_volume, intlLocale)}`} />
            </div>

            {reportData.trades.by_market.length > 0 && (
              <>
                <h3 className="mt-4 text-xs font-medium text-slate-600">{dict.reconciliation.marketBreakdown}</h3>
                {/* Mobile cards */}
                <div className="mt-2 space-y-2 sm:hidden">
                  {reportData.trades.by_market.map((m) => (
                    <article key={m.market_id} className="mobile-data-card">
                      <p className="text-xs font-medium text-slate-800">{m.market_title}</p>
                      <div className="mt-1 flex justify-between text-xs text-slate-500">
                        <span>{m.trade_count.toLocaleString(intlLocale)}</span>
                        <span>${fmtAmount(m.volume, intlLocale)}</span>
                      </div>
                    </article>
                  ))}
                </div>
                {/* Desktop table */}
                <div className="mt-2 hidden overflow-x-auto sm:block">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="table-head-row text-left text-xs">
                        <th className="py-2 pr-3">{dict.common.market}</th>
                        <th className="py-2 pr-3">{dict.reconciliation.totalCount}</th>
                        <th className="py-2 pr-3">{dict.reconciliation.totalVolume}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.trades.by_market.map((m) => (
                        <tr key={m.market_id} className="table-body-row">
                          <td className="py-2 pr-3 text-slate-800">{m.market_title}</td>
                          <td className="py-2 pr-3">{m.trade_count.toLocaleString(intlLocale)}</td>
                          <td className="py-2 pr-3">${fmtAmount(m.volume, intlLocale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* Fees */}
          <section className="table-surface p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">{dict.reconciliation.feeSummary}</h2>
            <p className="text-lg font-bold text-slate-900">${fmtAmount(reportData.fees.total_collected, intlLocale)}</p>
            {reportData.fees.by_market.length > 0 && (
              <>
                {/* Mobile */}
                <div className="mt-3 space-y-2 sm:hidden">
                  {reportData.fees.by_market.map((m) => (
                    <div key={m.market_id} className="mobile-data-card flex justify-between">
                      <span className="text-xs text-slate-600">{dict.common.market} #{m.market_id}</span>
                      <span className="text-xs font-medium text-slate-800">${fmtAmount(m.fee_amount, intlLocale)}</span>
                    </div>
                  ))}
                </div>
                {/* Desktop */}
                <div className="mt-3 hidden overflow-x-auto sm:block">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="table-head-row text-left text-xs">
                        <th className="py-2 pr-3">{dict.reconciliation.marketId}</th>
                        <th className="py-2 pr-3">{dict.reconciliation.platformFees}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.fees.by_market.map((m) => (
                        <tr key={m.market_id} className="table-body-row">
                          <td className="py-2 pr-3">#{m.market_id}</td>
                          <td className="py-2 pr-3">${fmtAmount(m.fee_amount, intlLocale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* Settlements */}
          <section className="table-surface p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">{dict.reconciliation.settlementSummary}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label={dict.reconciliation.payout} value={`$${fmtAmount(reportData.settlements.total_payout, intlLocale)}`} />
              <MiniStat label={dict.reconciliation.collected} value={`$${fmtAmount(reportData.settlements.total_collected, intlLocale)}`} />
              <MiniStat label={dict.reconciliation.netSettlement} value={`$${fmtAmount(reportData.settlements.net_settlement, intlLocale)}`} />
            </div>
            {reportData.settlements.by_market.length > 0 && (
              <>
                {/* Mobile */}
                <div className="mt-3 space-y-2 sm:hidden">
                  {reportData.settlements.by_market.map((m) => (
                    <article key={m.market_id} className="mobile-data-card">
                      <p className="text-xs font-medium text-slate-800">{m.market_title}</p>
                      <div className="mt-1 flex justify-between text-xs text-slate-500">
                        <span>{dict.reconciliation.payout} ${fmtAmount(m.payout, intlLocale)}</span>
                        <span>{dict.reconciliation.collected} ${fmtAmount(m.collected, intlLocale)}</span>
                      </div>
                    </article>
                  ))}
                </div>
                {/* Desktop */}
                <div className="mt-3 hidden overflow-x-auto sm:block">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="table-head-row text-left text-xs">
                        <th className="py-2 pr-3">{dict.common.market}</th>
                        <th className="py-2 pr-3">{dict.reconciliation.payout}</th>
                        <th className="py-2 pr-3">{dict.reconciliation.collected}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.settlements.by_market.map((m) => (
                        <tr key={m.market_id} className="table-body-row">
                          <td className="py-2 pr-3 text-slate-800">{m.market_title}</td>
                          <td className="py-2 pr-3">${fmtAmount(m.payout, intlLocale)}</td>
                          <td className="py-2 pr-3">${fmtAmount(m.collected, intlLocale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* Revenue Share */}
          <section className="table-surface p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">{dict.reconciliation.revenueShareCalc}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label={dict.reconciliation.revenueShareRate} value={fmtPct(reportData.revenue_share.rate)} />
              <MiniStat label={dict.reconciliation.feeBaseAmount} value={`$${fmtAmount(reportData.revenue_share.base_amount, intlLocale)}`} />
              <MiniStat label={dict.reconciliation.revenueShareValue} value={`$${fmtAmount(reportData.revenue_share.share_amount, intlLocale)}`} highlight />
            </div>
          </section>

          {/* Discrepancy */}
          <section className="table-surface p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">{dict.reconciliation.discrepancyCheck}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label={dict.reconciliation.expectedBalance} value={`$${fmtAmount(reportData.discrepancy.expected_balance, intlLocale)}`} />
              <MiniStat label={dict.reconciliation.actualBalance} value={`$${fmtAmount(reportData.discrepancy.actual_balance, intlLocale)}`} />
              <MiniStat
                label={dict.reconciliation.difference}
                value={`$${fmtAmount(reportData.discrepancy.difference, intlLocale)}`}
                highlight={parseFloat(reportData.discrepancy.difference) !== 0}
              />
            </div>
            {reportData.discrepancy.details && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {reportData.discrepancy.details}
              </p>
            )}
          </section>

          {/* Balance Snapshot */}
          <section className="table-surface p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">{dict.reconciliation.balanceSnapshot}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MiniStat label={dict.deposit.totalDeposit} value={`$${fmtAmount(snap.total_deposit, intlLocale)}`} />
              <MiniStat label={dict.deposit.availableBalance} value={`$${fmtAmount(snap.available_balance, intlLocale)}`} />
              <MiniStat label={dict.deposit.frozenBalance} value={`$${fmtAmount(snap.frozen_balance, intlLocale)}`} />
              <MiniStat label={dict.reconciliation.feePayable} value={`$${fmtAmount(snap.fee_payable, intlLocale)}`} />
              <MiniStat label={dict.reconciliation.revenueReceivable} value={`$${fmtAmount(snap.revenue_receivable, intlLocale)}`} />
              <MiniStat
                label={dict.deposit.riskRatio}
                value={snap.risk_ratio ? fmtPct(snap.risk_ratio) : 'N/A'}
              />
            </div>
            <p className="mt-3 text-xs text-slate-400">
              {dict.reconciliation.snapshotAt}：{new Date(snap.snapshot_at).toLocaleString(intlLocale)}
            </p>
          </section>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SummaryCard({ label, value, highlight, negative }: {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
}) {
  let valueColor = 'text-slate-900';
  if (highlight) valueColor = 'text-emerald-700';
  if (negative) valueColor = 'text-red-600';

  return (
    <div className={`table-surface rounded-xl p-4 shadow-sm ${highlight ? 'ring-2 ring-emerald-200' : ''}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${highlight ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
