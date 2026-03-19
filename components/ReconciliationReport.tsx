'use client';

import { useState, useCallback } from 'react';
import type { PMReconciliationReport, PMReconciliationStatus } from '@/lib/predict-markets';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReconciliationReportProps {
  walletMode: string;
  initialDate: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PMReconciliationStatus, { label: string; color: string; dot: string }> = {
  clean: { label: '無差異', color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  minor_discrepancy: { label: '輕微差異', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  needs_review: { label: '待審查', color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  critical: { label: '嚴重差異', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtAmount(val: string): string {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function fmtPct(val: string): string {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return `${(n * 100).toFixed(1)}%`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReconciliationReport({ walletMode, initialDate }: ReconciliationReportProps) {
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
          setError(`${targetDate} 尚無對帳報告（報告於每日凌晨自動產生前一日資料）。`);
        } else {
          setError(errBody.error ?? `查詢失敗 (${res.status})`);
        }
        return;
      }

      if (typeof json === 'object' && json !== null && 'data' in json) {
        setReport((json as { data: PMReconciliationReport }).data);
      }
    } catch (err) {
      console.error('[ReconciliationReport] fetch error:', err);
      setError('無法連線至伺服器');
    } finally {
      setLoading(false);
    }
  }, [walletMode]);

  const handleQuery = () => {
    if (date) fetchReport(date);
  };

  const s = report?.summary;
  const d = report?.data;
  const snap = report?.balance_snapshot;
  const statusConfig = report ? (STATUS_CONFIG[report.status] ?? STATUS_CONFIG.clean) : null;

  return (
    <div className="space-y-6">
      {/* ── Date Picker ─────────────────────────────────────── */}
      <section className="table-surface flex flex-wrap items-end gap-3 p-4 shadow-sm">
        <label className="text-xs text-slate-600">
          報告日期
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
          {loading ? '查詢中...' : '查詢報告'}
        </button>
      </section>

      {/* ── Error ───────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      {/* ── Report Content ──────────────────────────────────── */}
      {report && s && d && snap && statusConfig && (
        <>
          {/* Status + Summary */}
          <section className="table-surface p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-slate-800">{report.report_date} 對帳報告</h2>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusConfig.color}`}>
                  <span className={`inline-block h-2 w-2 rounded-full ${statusConfig.dot}`} />
                  {statusConfig.label}
                </span>
              </div>
              <span className="text-xs text-slate-400">
                產生時間：{new Date(report.generated_at).toLocaleString('zh-TW')}
              </span>
            </div>
          </section>

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard label="交易總筆數" value={s.total_trades.toLocaleString()} />
            <SummaryCard label="總成交量" value={`$${fmtAmount(s.total_volume)}`} />
            <SummaryCard label="平台手續費" value={`$${fmtAmount(s.total_fees)}`} />
            <SummaryCard label="淨結算金額" value={`$${fmtAmount(s.total_settlements)}`} negative={parseFloat(s.total_settlements) < 0} />
            <SummaryCard label="合作方分潤" value={`$${fmtAmount(s.revenue_share_amount)}`} highlight />
            <SummaryCard
              label="差異金額"
              value={`$${fmtAmount(s.discrepancy_amount)}`}
              negative={parseFloat(s.discrepancy_amount) !== 0}
            />
          </div>

          {/* Trade Detail */}
          <section className="table-surface p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">撮合明細</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label="總筆數" value={d.trades.total_count.toLocaleString()} />
              <MiniStat label="買入" value={`${d.trades.buy_count} 筆 / $${fmtAmount(d.trades.buy_volume)}`} />
              <MiniStat label="賣出" value={`${d.trades.sell_count} 筆 / $${fmtAmount(d.trades.sell_volume)}`} />
            </div>

            {d.trades.by_market.length > 0 && (
              <>
                <h3 className="mt-4 text-xs font-medium text-slate-600">各市場明細</h3>
                {/* Mobile cards */}
                <div className="mt-2 space-y-2 sm:hidden">
                  {d.trades.by_market.map((m) => (
                    <article key={m.market_id} className="mobile-data-card">
                      <p className="text-xs font-medium text-slate-800">{m.market_title}</p>
                      <div className="mt-1 flex justify-between text-xs text-slate-500">
                        <span>{m.trade_count} 筆</span>
                        <span>${fmtAmount(m.volume)}</span>
                      </div>
                    </article>
                  ))}
                </div>
                {/* Desktop table */}
                <div className="mt-2 hidden overflow-x-auto sm:block">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="table-head-row text-left text-xs">
                        <th className="py-2 pr-3">市場</th>
                        <th className="py-2 pr-3">筆數</th>
                        <th className="py-2 pr-3">成交量</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.trades.by_market.map((m) => (
                        <tr key={m.market_id} className="table-body-row">
                          <td className="py-2 pr-3 text-slate-800">{m.market_title}</td>
                          <td className="py-2 pr-3">{m.trade_count}</td>
                          <td className="py-2 pr-3">${fmtAmount(m.volume)}</td>
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
            <h2 className="mb-3 text-sm font-semibold text-slate-800">手續費彙總</h2>
            <p className="text-lg font-bold text-slate-900">${fmtAmount(d.fees.total_collected)}</p>
            {d.fees.by_market.length > 0 && (
              <>
                {/* Mobile */}
                <div className="mt-3 space-y-2 sm:hidden">
                  {d.fees.by_market.map((m) => (
                    <div key={m.market_id} className="mobile-data-card flex justify-between">
                      <span className="text-xs text-slate-600">市場 #{m.market_id}</span>
                      <span className="text-xs font-medium text-slate-800">${fmtAmount(m.fee_amount)}</span>
                    </div>
                  ))}
                </div>
                {/* Desktop */}
                <div className="mt-3 hidden overflow-x-auto sm:block">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="table-head-row text-left text-xs">
                        <th className="py-2 pr-3">市場 ID</th>
                        <th className="py-2 pr-3">手續費</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.fees.by_market.map((m) => (
                        <tr key={m.market_id} className="table-body-row">
                          <td className="py-2 pr-3">#{m.market_id}</td>
                          <td className="py-2 pr-3">${fmtAmount(m.fee_amount)}</td>
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
            <h2 className="mb-3 text-sm font-semibold text-slate-800">結算彙總</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label="結算入帳 (用戶贏)" value={`$${fmtAmount(d.settlements.total_payout)}`} />
              <MiniStat label="結算扣款 (用戶輸)" value={`$${fmtAmount(d.settlements.total_collected)}`} />
              <MiniStat label="淨結算" value={`$${fmtAmount(d.settlements.net_settlement)}`} />
            </div>
            {d.settlements.by_market.length > 0 && (
              <>
                {/* Mobile */}
                <div className="mt-3 space-y-2 sm:hidden">
                  {d.settlements.by_market.map((m) => (
                    <article key={m.market_id} className="mobile-data-card">
                      <p className="text-xs font-medium text-slate-800">{m.market_title}</p>
                      <div className="mt-1 flex justify-between text-xs text-slate-500">
                        <span>入帳 ${fmtAmount(m.payout)}</span>
                        <span>扣款 ${fmtAmount(m.collected)}</span>
                      </div>
                    </article>
                  ))}
                </div>
                {/* Desktop */}
                <div className="mt-3 hidden overflow-x-auto sm:block">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="table-head-row text-left text-xs">
                        <th className="py-2 pr-3">市場</th>
                        <th className="py-2 pr-3">入帳</th>
                        <th className="py-2 pr-3">扣款</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.settlements.by_market.map((m) => (
                        <tr key={m.market_id} className="table-body-row">
                          <td className="py-2 pr-3 text-slate-800">{m.market_title}</td>
                          <td className="py-2 pr-3">${fmtAmount(m.payout)}</td>
                          <td className="py-2 pr-3">${fmtAmount(m.collected)}</td>
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
            <h2 className="mb-3 text-sm font-semibold text-slate-800">分潤計算</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label="分潤比例" value={fmtPct(d.revenue_share.rate)} />
              <MiniStat label="計算基礎 (手續費)" value={`$${fmtAmount(d.revenue_share.base_amount)}`} />
              <MiniStat label="分潤金額" value={`$${fmtAmount(d.revenue_share.share_amount)}`} highlight />
            </div>
          </section>

          {/* Discrepancy */}
          <section className="table-surface p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">差異檢查</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label="預期餘額" value={`$${fmtAmount(d.discrepancy.expected_balance)}`} />
              <MiniStat label="實際餘額" value={`$${fmtAmount(d.discrepancy.actual_balance)}`} />
              <MiniStat
                label="差異"
                value={`$${fmtAmount(d.discrepancy.difference)}`}
                highlight={parseFloat(d.discrepancy.difference) !== 0}
              />
            </div>
            {d.discrepancy.details && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {d.discrepancy.details}
              </p>
            )}
          </section>

          {/* Balance Snapshot */}
          <section className="table-surface p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">餘額快照</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MiniStat label="累計存入" value={`$${fmtAmount(snap.total_deposit)}`} />
              <MiniStat label="可用餘額" value={`$${fmtAmount(snap.available_balance)}`} />
              <MiniStat label="凍結金額" value={`$${fmtAmount(snap.frozen_balance)}`} />
              <MiniStat label="待付手續費" value={`$${fmtAmount(snap.fee_payable)}`} />
              <MiniStat label="待收分潤" value={`$${fmtAmount(snap.revenue_receivable)}`} />
              <MiniStat
                label="風險比率"
                value={snap.risk_ratio ? fmtPct(snap.risk_ratio) : 'N/A'}
              />
            </div>
            <p className="mt-3 text-xs text-slate-400">
              快照時間：{new Date(snap.snapshot_at).toLocaleString('zh-TW')}
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
