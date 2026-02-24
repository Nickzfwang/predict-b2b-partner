import { TradeForm } from '@/components/TradeForm';
import { pmClient } from '@/lib/predict-markets';

interface TradesPageProps {
  searchParams: Promise<{ user?: string }>;
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

async function getTradesData(userId: string) {
  try {
    const externalUserId = `demo_${userId}`;

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
  const { user = 'alice' } = await searchParams;
  const data = await getTradesData(user);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">交易中心</h1>
        <p className="mt-1 text-sm text-slate-500">快速下單與交易紀錄查詢</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-1">
          <TradeForm
            userId={user}
            markets={data?.marketOptions ?? []}
          />
        </section>

        <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">我的交易紀錄</h2>

          {data?.trades?.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="py-2 pr-3">時間</th>
                    <th className="py-2 pr-3">市場</th>
                    <th className="py-2 pr-3">類型</th>
                    <th className="py-2 pr-3">股數</th>
                    <th className="py-2 pr-3">單價</th>
                    <th className="py-2 pr-3">總額</th>
                    <th className="py-2 pr-3">餘額</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trades.map((trade, idx) => (
                    <tr key={typeof trade.trade_id === 'string' ? trade.trade_id : `trade-${idx}`} className="border-b border-slate-50 text-slate-700 last:border-b-0">
                      <td className="py-2 pr-3">
                        {typeof trade.created_at === 'string' ? new Date(trade.created_at).toLocaleString('zh-TW') : 'N/A'}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">{getMarketLabel(trade.market_id)}</td>
                      <td className="py-2 pr-3 uppercase">
                        {typeof trade.type === 'string' ? trade.type : 'N/A'} / {typeof trade.outcome === 'string' ? trade.outcome : 'N/A'}
                      </td>
                      <td className="py-2 pr-3">{typeof trade.shares === 'number' ? trade.shares : 0}</td>
                      <td className="py-2 pr-3">${typeof trade.price_per_share === 'number' ? trade.price_per_share.toFixed(2) : '0.00'}</td>
                      <td className="py-2 pr-3">${typeof trade.total_amount === 'number' ? trade.total_amount.toFixed(2) : '0.00'}</td>
                      <td className="py-2 pr-3">${typeof trade.user_balance_after === 'number' ? trade.user_balance_after.toFixed(2) : '0.00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">目前沒有交易紀錄。</p>
          )}
        </section>
      </div>
    </div>
  );
}
