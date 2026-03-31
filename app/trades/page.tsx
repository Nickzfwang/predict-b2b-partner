import { TradeForm } from '@/components/TradeForm';
import { getPMClient } from '@/lib/get-pm-client';
import { resolveWalletMode, getUserPrefix, type WalletMode } from '@/lib/wallet-mode';
import { getDictionary, getIntlLocale, resolveLocale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/i18n';

interface TradesPageProps {
  searchParams: Promise<{ user?: string; mode?: string; locale?: string }>;
}

function normalizeTrades(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null);
  if (typeof value === 'object' && value !== null && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: unknown[] }).data.filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null);
  }
  return [];
}

function normalizeMarkets(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null);
  if (typeof value === 'object' && value !== null && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: unknown[] }).data.filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null);
  }
  return [];
}

function getMarketLabel(marketId: unknown): string {
  if (typeof marketId === 'string') return `${marketId.slice(0, 8)}...`;
  if (typeof marketId === 'number') return String(marketId);
  if (typeof marketId === 'object' && marketId !== null) {
    const id = (marketId as { id?: unknown }).id;
    if (typeof id === 'string') return `${id.slice(0, 8)}...`;
    if (typeof id === 'number') return String(id);
  }
  return 'N/A';
}

function extractMarketId(marketId: unknown): string | null {
  if (typeof marketId === 'string' && marketId.trim()) return marketId;
  if (typeof marketId === 'number') return String(marketId);
  if (typeof marketId === 'object' && marketId !== null) {
    const id = (marketId as { id?: unknown }).id;
    if (typeof id === 'string' && id.trim()) return id;
    if (typeof id === 'number') return String(id);
  }
  return null;
}

function buildMarketOptions(
  markets: Array<Record<string, unknown>>,
  trades: Array<Record<string, unknown>>,
): Array<{ id: string; title: string }> {
  const map = new Map<string, { id: string; title: string }>();

  for (const market of markets) {
    const id = extractMarketId(market.id);
    const title = typeof market.title === 'string' ? market.title : null;
    if (id && title) map.set(id, { id, title });
  }

  for (const trade of trades) {
    const id = extractMarketId(trade.market_id);
    if (id && !map.has(id)) {
      map.set(id, { id, title: `Market ${id.slice(0, 8)}...` });
    }
  }

  return [...map.values()];
}

function getTradeText(value: unknown, d: Dictionary): string {
  if (value === 'buy') return d.trades.buy;
  if (value === 'sell') return d.trades.sell;
  if (value === 'yes') return d.common.yes;
  if (value === 'no') return d.common.no;
  return typeof value === 'string' ? value : d.common.notAvailable;
}

async function getTradesData(userId: string, walletMode: WalletMode) {
  try {
    const pmClient = getPMClient(walletMode);
    const externalUserId = `${getUserPrefix(walletMode)}${userId}`;

    await pmClient.syncUser({
      external_user_id: externalUserId,
      display_name: userId.charAt(0).toUpperCase() + userId.slice(1),
      initial_balance: 1000,
    });

    const [marketsRes, tradesRes] = await Promise.all([
      pmClient.getMarkets({ sort: 'trending', per_page: '50', page: '1' }),
      pmClient.getTrades({ external_user_id: externalUserId, per_page: '20', page: '1' }),
    ]);

    const markets = normalizeMarkets(marketsRes.data);
    const trades = normalizeTrades(tradesRes.data);

    return {
      markets,
      trades,
      marketOptions: buildMarketOptions(markets, trades),
    };
  } catch (err) {
    console.error('[TradesPage] Error:', err);
    return null;
  }
}

export default async function TradesPage({ searchParams }: TradesPageProps) {
  const { user = 'alice', mode: modeParam, locale: localeParam } = await searchParams;
  const locale = resolveLocale(localeParam);
  const d = getDictionary(locale);
  const intlLocale = getIntlLocale(locale);
  const walletMode = resolveWalletMode(modeParam);
  const data = await getTradesData(user, walletMode);

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="demo-hero mb-6 overflow-hidden rounded-2xl border border-slate-800/60 p-6 text-white shadow-lg">
        <p className="inline-flex rounded-full bg-sky-300/25 px-3 py-1 text-xs font-medium text-sky-100">{d.trades.badge}</p>
        <h1 className="mt-3 text-2xl font-bold">{d.trades.title}</h1>
        <p className="mt-1 text-sm text-slate-200">{d.trades.subtitle}</p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-1 lift-hover">
          <TradeForm
            userId={user}
            markets={data?.marketOptions ?? []}
            walletMode={walletMode}
            locale={locale}
          />
        </section>

        <section className="table-surface lg:col-span-2 p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">{d.trades.myRecords}</h2>

          {data?.trades?.length ? (
            <>
              <div className="space-y-2 sm:hidden">
                {data.trades.map((trade, idx) => (
                  <article key={typeof trade.trade_id === 'string' ? trade.trade_id : `trade-mobile-${idx}`} className="mobile-data-card">
                    <p className="text-xs text-slate-500">
                      {typeof trade.created_at === 'string' ? new Date(trade.created_at).toLocaleString(intlLocale) : d.common.notAvailable}
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-700">{getMarketLabel(trade.market_id)}</p>
                    <p className="mt-1 text-sm font-medium uppercase text-slate-800">
                      {getTradeText(trade.type, d)} / {getTradeText(trade.outcome, d)}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <p>{d.common.shares}：{typeof trade.shares === 'number' ? trade.shares : 0}</p>
                      <p>{d.trades.unitPrice}：${typeof trade.price_per_share === 'number' ? trade.price_per_share.toFixed(2) : '0.00'}</p>
                      <p className="font-semibold text-slate-900">
                        {d.trades.total}：${typeof trade.total_amount === 'number' ? trade.total_amount.toFixed(2) : '0.00'}
                      </p>
                      <p className="text-right font-semibold text-slate-900">
                        {d.common.balance}：${typeof trade.user_balance_after === 'number' ? trade.user_balance_after.toFixed(2) : '0.00'}
                      </p>
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
                      <th className="py-2 pr-3">{d.trades.type}</th>
                      <th className="py-2 pr-3">{d.common.shares}</th>
                      <th className="py-2 pr-3">{d.trades.unitPrice}</th>
                      <th className="py-2 pr-3">{d.trades.total}</th>
                      <th className="py-2 pr-3">{d.common.balance}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trades.map((trade, idx) => (
                      <tr key={typeof trade.trade_id === 'string' ? trade.trade_id : `trade-${idx}`} className="table-body-row">
                        <td className="py-2 pr-3">
                          {typeof trade.created_at === 'string' ? new Date(trade.created_at).toLocaleString(intlLocale) : d.common.notAvailable}
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs">{getMarketLabel(trade.market_id)}</td>
                        <td className="py-2 pr-3 uppercase">
                          {getTradeText(trade.type, d)} / {getTradeText(trade.outcome, d)}
                        </td>
                        <td className="py-2 pr-3">{typeof trade.shares === 'number' ? trade.shares : 0}</td>
                        <td className="py-2 pr-3">${typeof trade.price_per_share === 'number' ? trade.price_per_share.toFixed(2) : '0.00'}</td>
                        <td className="py-2 pr-3 font-medium text-slate-900">${typeof trade.total_amount === 'number' ? trade.total_amount.toFixed(2) : '0.00'}</td>
                        <td className="py-2 pr-3 font-medium text-slate-900">${typeof trade.user_balance_after === 'number' ? trade.user_balance_after.toFixed(2) : '0.00'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">{d.trades.noRecords}</p>
          )}
        </section>
      </div>
    </div>
  );
}
