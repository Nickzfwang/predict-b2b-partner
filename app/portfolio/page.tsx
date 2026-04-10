import Link from 'next/link';
import { getPMClient } from '@/lib/get-pm-client';
import { resolveWalletMode, getUserPrefix, type WalletMode } from '@/lib/wallet-mode';
import { getDictionary, getIntlLocale, resolveLocale, t } from '@/lib/i18n';
import type { Dictionary } from '@/lib/i18n';

interface PortfolioPageProps {
  searchParams: Promise<{ user?: string; mode?: string; locale?: string }>;
}

interface PositionView {
  id: string;
  marketTitle: string;
  marketStatus: string;
  yesShares: number;
  noShares: number;
  invested: number;
  currentValue: number;
  unrealized: number;
}

interface TradeView {
  id: string;
  createdAt: string;
  marketLabel: string;
  side: string;
  shares: number;
  totalAmount: number;
  balanceAfter: number;
}

function asArrayOfObjects(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null);
  }
  if (typeof value === 'object' && value !== null && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: unknown[] }).data.filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null);
  }
  return [];
}

function parseMarketId(input: unknown): string {
  if (typeof input === 'string') return input;
  if (typeof input === 'number') return String(input);
  if (typeof input === 'object' && input !== null) {
    const id = (input as { id?: unknown }).id;
    if (typeof id === 'string') return id;
    if (typeof id === 'number') return String(id);
  }
  return 'unknown-market';
}

function normalizePositions(value: unknown): PositionView[] {
  return asArrayOfObjects(value).map((p, idx) => ({
    id: typeof p.position_id === 'string' ? p.position_id : `position-${idx}`,
    marketTitle: typeof p.market_title === 'string' ? p.market_title : `Market ${parseMarketId(p.market_id).slice(0, 8)}`,
    marketStatus: typeof p.market_status === 'string' ? p.market_status : 'unknown',
    yesShares: typeof p.yes_shares === 'number' ? p.yes_shares : 0,
    noShares: typeof p.no_shares === 'number' ? p.no_shares : 0,
    invested: typeof p.total_invested === 'number' ? p.total_invested : 0,
    currentValue: typeof p.current_value === 'number' ? p.current_value : 0,
    unrealized: typeof p.unrealized_profit === 'number' ? p.unrealized_profit : 0,
  }));
}

function buildPositionsFromTrades(value: unknown): PositionView[] {
  const trades = asArrayOfObjects(value);
  const grouped = new Map<string, PositionView>();

  for (const trade of trades) {
    const marketId = parseMarketId(trade.market_id);
    const shares = typeof trade.shares === 'number' ? trade.shares : 0;
    const amount = typeof trade.total_amount === 'number' ? trade.total_amount : 0;
    const outcome = trade.outcome === 'yes' ? 'yes' : trade.outcome === 'no' ? 'no' : 'yes';

    if (!grouped.has(marketId)) {
      grouped.set(marketId, {
        id: `from-trades-${marketId}`,
        marketTitle: `Market ${marketId.slice(0, 8)}`,
        marketStatus: 'open',
        yesShares: 0,
        noShares: 0,
        invested: 0,
        currentValue: 0,
        unrealized: 0,
      });
    }

    const current = grouped.get(marketId)!;
    if (outcome === 'yes') current.yesShares += shares;
    if (outcome === 'no') current.noShares += shares;
    current.invested += amount;
    current.currentValue += amount;
    current.unrealized = current.currentValue - current.invested;
  }

  return [...grouped.values()];
}

function normalizeTrades(value: unknown): TradeView[] {
  return asArrayOfObjects(value).map((trade, idx) => {
    const marketId = parseMarketId(trade.market_id);
    const createdAt = typeof trade.created_at === 'string' ? trade.created_at : '';
    const side = `${typeof trade.type === 'string' ? trade.type : 'N/A'} / ${typeof trade.outcome === 'string' ? trade.outcome : 'N/A'}`;

    return {
      id: typeof trade.trade_id === 'string' ? trade.trade_id : `trade-${idx}`,
      createdAt,
      marketLabel: `${marketId.slice(0, 8)}...`,
      side,
      shares: typeof trade.shares === 'number' ? trade.shares : 0,
      totalAmount: typeof trade.total_amount === 'number' ? trade.total_amount : 0,
      balanceAfter: typeof trade.user_balance_after === 'number' ? trade.user_balance_after : 0,
    };
  });
}

function formatTradeValue(value: string, d: Dictionary): string {
  if (value === 'buy') return d.trades.buy;
  if (value === 'sell') return d.trades.sell;
  if (value === 'yes') return d.common.yes;
  if (value === 'no') return d.common.no;
  return value;
}

interface StatusBadgeInfo {
  label: string;
  bg: string;
  text: string;
}

function getStatusBadge(status: string, d: Dictionary): StatusBadgeInfo {
  const map: Record<string, StatusBadgeInfo> = {
    open: { label: d.portfolio.statusOpen, bg: 'bg-emerald-100', text: 'text-emerald-700' },
    closed: { label: d.portfolio.statusClosed, bg: 'bg-amber-100', text: 'text-amber-700' },
    judging: { label: d.portfolio.statusJudging, bg: 'bg-blue-100', text: 'text-blue-700' },
    resolved: { label: d.portfolio.statusResolved, bg: 'bg-slate-100', text: 'text-slate-600' },
    voided: { label: d.portfolio.statusVoided, bg: 'bg-gray-200', text: 'text-gray-600' },
  };
  return map[status] ?? { label: status, bg: 'bg-slate-100', text: 'text-slate-600' };
}

async function getPortfolioData(userId: string, walletMode: WalletMode) {
  try {
    const pmClient = getPMClient(walletMode);
    const prefix = getUserPrefix(walletMode);
    const demoExternalUserId = `${prefix}${userId}`;
    const candidateUserIds = [demoExternalUserId, userId];

    const syncUserRes = await pmClient.syncUser({
      external_user_id: demoExternalUserId,
      display_name: userId.charAt(0).toUpperCase() + userId.slice(1),
      initial_balance: 1000,
    });

    const userProfileResults = await Promise.all(
      candidateUserIds.map(async (externalUserId) => {
        try {
          const res = await pmClient.getUser(externalUserId);
          return res.data;
        } catch {
          return null;
        }
      }),
    );

    const userProfile =
      userProfileResults.find((u) => u && typeof u.created_at === 'string') ??
      userProfileResults.find((u) => u !== null) ??
      syncUserRes.data;

    const [positionsRawList, tradesRawList] = await Promise.all([
      Promise.all(
        candidateUserIds.map(async (externalUserId) => {
          try {
            const res = await pmClient.getPositions({
              external_user_id: externalUserId,
              per_page: '100',
              page: '1',
            });
            return res.data;
          } catch {
            return [];
          }
        }),
      ),
      Promise.all(
        candidateUserIds.map(async (externalUserId) => {
          try {
            const res = await pmClient.getTrades({
              external_user_id: externalUserId,
              per_page: '30',
              page: '1',
            });
            return res.data;
          } catch {
            return [];
          }
        }),
      ),
    ]);

    const positions = positionsRawList.flatMap((raw) => normalizePositions(raw));
    const dedupedPositions = new Map<string, PositionView>();
    for (const item of positions) dedupedPositions.set(item.id, item);

    const trades = tradesRawList.flatMap((raw) => normalizeTrades(raw));
    const dedupedTrades = new Map<string, TradeView>();
    for (const item of trades) dedupedTrades.set(item.id, item);

    const finalPositions = dedupedPositions.size > 0
      ? [...dedupedPositions.values()]
      : (() => {
          const fallback = tradesRawList.flatMap((raw) => buildPositionsFromTrades(raw));
          const dedupedFallback = new Map<string, PositionView>();
          for (const item of fallback) dedupedFallback.set(item.id, item);
          return [...dedupedFallback.values()];
        })();

    return {
      user: userProfile,
      positions: finalPositions,
      trades: [...dedupedTrades.values()],
    };
  } catch (err) {
    console.error('[PortfolioPage] Error:', err);
    return null;
  }
}

export default async function PortfolioPage({ searchParams }: PortfolioPageProps) {
  const { user = 'alice', mode: modeParam, locale: localeParam } = await searchParams;
  const locale = resolveLocale(localeParam);
  const d = getDictionary(locale);
  const intlLocale = getIntlLocale(locale);
  const walletMode = resolveWalletMode(modeParam);
  const data = await getPortfolioData(user, walletMode);
  const trades = (data?.trades ?? []).map((trade) => {
    const [type, outcome] = trade.side.split(' / ');
    return {
      ...trade,
      side: `${formatTradeValue(type, d)} / ${formatTradeValue(outcome, d)}`,
    };
  });

  const displayName = user.charAt(0).toUpperCase() + user.slice(1);
  const balance = typeof data?.user?.balance === 'number' ? data.user.balance : 0;
  const totalTrades = typeof data?.user?.total_trades === 'number' ? data.user.total_trades : trades.length;
  const joinedDate = data?.user?.created_at
    ? new Date(data.user.created_at).toLocaleDateString(intlLocale)
    : d.common.notAvailable;

  const totals = (data?.positions ?? []).reduce(
    (acc, p) => {
      acc.invested += p.invested;
      if (p.marketStatus === 'voided') {
        acc.currentValue += p.invested;
        // voided positions: no unrealized PnL
      } else {
        acc.currentValue += p.currentValue;
        acc.unrealized += p.unrealized;
      }
      return acc;
    },
    { invested: 0, currentValue: 0, unrealized: 0 },
  );

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="demo-hero mb-8 overflow-hidden rounded-2xl border border-slate-800/60 p-6 text-white shadow-lg">
        <p className="inline-flex rounded-full bg-indigo-300/25 px-3 py-1 text-xs font-medium text-indigo-100">{d.portfolio.badge}</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t(d.portfolio.title, { name: displayName })}</h1>
            <p className="mt-1 text-sm text-slate-200">{d.portfolio.subtitle}</p>
          </div>

          <div className="hero-summary-card w-full rounded-xl px-5 py-3 text-left sm:w-auto sm:text-right">
            <p className="text-xs text-slate-200">{d.portfolio.availableBalance}</p>
            <p className="mt-0.5 text-xl font-bold text-white">
              ${balance.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </section>

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={d.portfolio.totalTrades} value={String(totalTrades)} icon="🔄" />
        <StatCard label={d.portfolio.joinDate} value={joinedDate} icon="📅" />
        <StatCard label={d.portfolio.accountId} value={`${getUserPrefix(walletMode)}${user}`} icon="🪪" mono />
        <StatCard label={d.portfolio.totalInvested} value={`$${totals.invested.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon="💵" />
        <StatCard label={d.portfolio.positionValue} value={`$${totals.currentValue.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon="📈" />
        <StatCard
          label={d.portfolio.unrealizedPnl}
          value={`$${totals.unrealized.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon="📊"
          tone={totals.unrealized >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <section className="table-surface mb-6 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">📋 {d.portfolio.holdingsApi}</h2>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{d.portfolio.realtimeQuery}</span>
        </div>

        {data?.positions?.length ? (
          <>
            <div className="space-y-2 sm:hidden">
              {data.positions.map((p) => {
                const isVoided = p.marketStatus === 'voided';
                return (
                  <article key={`position-mobile-${p.id}`} className={`mobile-data-card ${isVoided ? 'opacity-80' : ''}`}>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{p.marketTitle}</p>
                      {(() => { const badge = getStatusBadge(p.marketStatus, d); return (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.bg} ${badge.text}`}>{badge.label}</span>
                      ); })()}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <p>{d.portfolio.yesLabel}：{p.yesShares}</p>
                      <p>{d.portfolio.noLabel}：{p.noShares}</p>
                      <p className="font-semibold text-slate-900">{d.portfolio.invested}：${p.invested.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      {!isVoided && (
                        <p className="font-semibold text-slate-900">{d.portfolio.value}：${p.currentValue.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      )}
                    </div>
                    {isVoided ? (
                      <p className="mt-2 text-sm font-semibold text-emerald-600">
                        {d.portfolio.refunded}：+${p.invested.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    ) : (
                      <p className={`mt-2 text-sm ${p.unrealized >= 0 ? 'value-positive' : 'value-negative'}`}>
                        {d.portfolio.unrealized}：${p.unrealized.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="table-head-row text-left text-xs">
                    <th className="py-2 pr-3">{d.common.market}</th>
                    <th className="py-2 pr-3">{d.portfolio.status}</th>
                    <th className="py-2 pr-3">{d.portfolio.yesLabel}</th>
                    <th className="py-2 pr-3">{d.portfolio.noLabel}</th>
                    <th className="py-2 pr-3">{d.portfolio.invested}</th>
                    <th className="py-2 pr-3">{d.portfolio.value}</th>
                    <th className="py-2 pr-3">{d.portfolio.unrealized}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.positions.map((p) => {
                    const isVoided = p.marketStatus === 'voided';
                    return (
                      <tr key={p.id} className={`table-body-row ${isVoided ? 'opacity-80' : ''}`}>
                        <td className="py-2 pr-3">{p.marketTitle}</td>
                        <td className="py-2 pr-3">
                          {(() => { const badge = getStatusBadge(p.marketStatus, d); return (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.bg} ${badge.text}`}>{badge.label}</span>
                          ); })()}
                        </td>
                        <td className="py-2 pr-3">{p.yesShares}</td>
                        <td className="py-2 pr-3">{p.noShares}</td>
                        <td className="py-2 pr-3 font-medium text-slate-900">${p.invested.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-2 pr-3 font-medium text-slate-900">
                          {isVoided ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            `$${p.currentValue.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          {isVoided ? (
                            <span className="font-semibold text-emerald-600">
                              {d.portfolio.refunded} +${p.invested.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className={p.unrealized >= 0 ? 'value-positive' : 'value-negative'}>
                              ${p.unrealized.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">{d.portfolio.noPositions}</p>
        )}
      </section>

      <section className="table-surface p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">🧾 {d.portfolio.recentTradesApi}</h2>
          <Link href={`/trades?user=${user}&mode=${walletMode}&locale=${locale}`} className="text-xs text-blue-700 hover:underline">{d.portfolio.goToTrading}</Link>
        </div>

        {trades.length ? (
          <>
            <div className="space-y-2 sm:hidden">
              {trades.slice(0, 20).map((trade) => (
                <article key={`trade-mobile-${trade.id}`} className="mobile-data-card">
                  <p className="text-xs text-slate-500">{trade.createdAt ? new Date(trade.createdAt).toLocaleString(intlLocale) : d.common.notAvailable}</p>
                  <p className="mt-1 font-mono text-xs text-slate-700">{trade.marketLabel}</p>
                  <p className="mt-1 text-sm font-medium uppercase text-slate-800">{trade.side}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <p>{d.common.shares}：{trade.shares}</p>
                    <p className="text-right font-semibold text-slate-900">{d.common.amount}：${trade.totalAmount.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="col-span-2 font-semibold text-slate-900">{d.common.balance}：${trade.balanceAfter.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="table-head-row text-left text-xs">
                    <th className="py-2 pr-3">{d.common.time}</th>
                    <th className="py-2 pr-3">{d.common.market}</th>
                    <th className="py-2 pr-3">{d.portfolio.direction}</th>
                    <th className="py-2 pr-3">{d.common.shares}</th>
                    <th className="py-2 pr-3">{d.common.amount}</th>
                    <th className="py-2 pr-3">{d.common.balance}</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 20).map((trade) => (
                    <tr key={trade.id} className="table-body-row">
                      <td className="py-2 pr-3">{trade.createdAt ? new Date(trade.createdAt).toLocaleString(intlLocale) : d.common.notAvailable}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{trade.marketLabel}</td>
                      <td className="py-2 pr-3 uppercase">{trade.side}</td>
                      <td className="py-2 pr-3">{trade.shares}</td>
                      <td className="py-2 pr-3 font-medium text-slate-900">${trade.totalAmount.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2 pr-3 font-medium text-slate-900">${trade.balanceAfter.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">{d.portfolio.noTrades}</p>
        )}
      </section>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  mono?: boolean;
  tone?: 'neutral' | 'positive' | 'negative';
}

function StatCard({ label, value, icon, mono = false, tone = 'neutral' }: StatCardProps) {
  const toneClass = tone === 'positive' ? 'value-positive' : tone === 'negative' ? 'value-negative' : 'text-slate-900';
  return (
    <div className="stats-card lift-hover rounded-xl p-4">
      <p className="text-xs text-slate-500">{icon} {label}</p>
      <p className={`mt-1 text-base font-semibold ${toneClass} ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}
