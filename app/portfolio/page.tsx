import Link from 'next/link';
import { pmClient } from '@/lib/predict-markets';

interface PortfolioPageProps {
  searchParams: Promise<{ user?: string }>;
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

async function getPortfolioData(userId: string) {
  try {
    const demoExternalUserId = `demo_${userId}`;
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
  const { user = 'alice' } = await searchParams;
  const data = await getPortfolioData(user);

  const displayName = user.charAt(0).toUpperCase() + user.slice(1);
  const balance = typeof data?.user?.balance === 'number' ? data.user.balance : 0;
  const totalTrades = typeof data?.user?.total_trades === 'number' ? data.user.total_trades : data?.trades.length ?? 0;
  const joinedDate = data?.user?.created_at
    ? new Date(data.user.created_at).toLocaleDateString('zh-TW')
    : 'N/A';

  const totals = (data?.positions ?? []).reduce(
    (acc, p) => {
      acc.invested += p.invested;
      acc.currentValue += p.currentValue;
      acc.unrealized += p.unrealized;
      return acc;
    },
    { invested: 0, currentValue: 0, unrealized: 0 },
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{displayName} 的投資組合</h1>
          <p className="mt-1 text-sm text-gray-500">以 API 直接查詢持倉、交易與資產摘要</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white px-5 py-3 text-right shadow-sm">
          <p className="text-xs text-gray-400">可用餘額</p>
          <p className="mt-0.5 text-xl font-bold text-gray-900">
            ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="總交易次數" value={String(totalTrades)} icon="🔄" />
        <StatCard label="加入時間" value={joinedDate} icon="📅" />
        <StatCard label="帳號 ID" value={`demo_${user}`} icon="🪪" mono />
        <StatCard label="總投入" value={`$${totals.invested.toFixed(2)}`} icon="💵" />
        <StatCard label="持倉市值" value={`$${totals.currentValue.toFixed(2)}`} icon="📈" />
        <StatCard label="未實現損益" value={`$${totals.unrealized.toFixed(2)}`} icon="📊" />
      </div>

      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">📋 持倉明細（API）</h2>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">即時查詢</span>
        </div>

        {data?.positions?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="py-2 pr-3">市場</th>
                  <th className="py-2 pr-3">狀態</th>
                  <th className="py-2 pr-3">Yes</th>
                  <th className="py-2 pr-3">No</th>
                  <th className="py-2 pr-3">投入</th>
                  <th className="py-2 pr-3">市值</th>
                  <th className="py-2 pr-3">未實現</th>
                </tr>
              </thead>
              <tbody>
                {data.positions.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 text-slate-700 last:border-b-0">
                    <td className="py-2 pr-3">{p.marketTitle}</td>
                    <td className="py-2 pr-3 capitalize">{p.marketStatus}</td>
                    <td className="py-2 pr-3">{p.yesShares}</td>
                    <td className="py-2 pr-3">{p.noShares}</td>
                    <td className="py-2 pr-3">${p.invested.toFixed(2)}</td>
                    <td className="py-2 pr-3">${p.currentValue.toFixed(2)}</td>
                    <td className={`py-2 pr-3 ${p.unrealized >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      ${p.unrealized.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">目前沒有持倉資料。</p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">🧾 最近交易（API）</h2>
          <Link href={`/trades?user=${user}`} className="text-xs text-blue-700 hover:underline">前往交易中心</Link>
        </div>

        {data?.trades?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="py-2 pr-3">時間</th>
                  <th className="py-2 pr-3">市場</th>
                  <th className="py-2 pr-3">方向</th>
                  <th className="py-2 pr-3">股數</th>
                  <th className="py-2 pr-3">金額</th>
                  <th className="py-2 pr-3">餘額</th>
                </tr>
              </thead>
              <tbody>
                {data.trades.slice(0, 20).map((trade) => (
                  <tr key={trade.id} className="border-b border-slate-50 text-slate-700 last:border-b-0">
                    <td className="py-2 pr-3">{trade.createdAt ? new Date(trade.createdAt).toLocaleString('zh-TW') : 'N/A'}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{trade.marketLabel}</td>
                    <td className="py-2 pr-3 uppercase">{trade.side}</td>
                    <td className="py-2 pr-3">{trade.shares}</td>
                    <td className="py-2 pr-3">${trade.totalAmount.toFixed(2)}</td>
                    <td className="py-2 pr-3">${trade.balanceAfter.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">目前沒有交易資料。</p>
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
}

function StatCard({ label, value, icon, mono = false }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-400">{icon} {label}</p>
      <p className={`mt-1 text-base font-semibold text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}
