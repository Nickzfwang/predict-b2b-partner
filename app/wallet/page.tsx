import Link from 'next/link';
import { pmClient } from '@/lib/predict-markets';
import { WalletActions } from '@/components/WalletActions';

interface WalletPageProps {
  searchParams: Promise<{ user?: string }>;
}

function normalizeTrades(value: unknown): Array<Record<string, unknown>> {
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

async function getWalletData(userId: string) {
  try {
    const externalUserId = `demo_${userId}`;

    const [userRes, tradesRes] = await Promise.all([
      pmClient.syncUser({
        external_user_id: externalUserId,
        display_name: userId.charAt(0).toUpperCase() + userId.slice(1),
        initial_balance: 1000,
      }),
      pmClient.getTrades({ external_user_id: externalUserId, per_page: '5', page: '1' }),
    ]);

    return {
      user: userRes.data,
      recentTrades: normalizeTrades(tradesRes.data),
    };
  } catch (err) {
    console.error('[WalletPage] Error:', err);
    return null;
  }
}

export default async function WalletPage({ searchParams }: WalletPageProps) {
  const { user = 'alice' } = await searchParams;
  const data = await getWalletData(user);

  const balance = typeof data?.user?.balance === 'number' ? data.user.balance : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">錢包中心</h1>
          <p className="mt-1 text-sm text-slate-500">入金、出金與近期資金使用概況</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
          <p className="text-xs text-slate-400">可用餘額</p>
          <p className="text-lg font-bold text-slate-900">
            ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <WalletActions userId={user} />

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">近期交易（可作為資金變動參考）</h2>
          <Link href={`/trades?user=${user}`} className="text-xs text-blue-700 hover:underline">
            查看全部
          </Link>
        </div>

        {data?.recentTrades?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="py-2 pr-3">時間</th>
                  <th className="py-2 pr-3">市場</th>
                  <th className="py-2 pr-3">方向</th>
                  <th className="py-2 pr-3">股數</th>
                  <th className="py-2 pr-3">金額</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTrades.map((trade, idx) => (
                  <tr key={typeof trade.trade_id === 'string' ? trade.trade_id : `trade-${idx}`} className="border-b border-slate-50 text-slate-700 last:border-b-0">
                    <td className="py-2 pr-3">
                      {typeof trade.created_at === 'string' ? new Date(trade.created_at).toLocaleString('zh-TW') : 'N/A'}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">{getMarketLabel(trade.market_id)}</td>
                    <td className="py-2 pr-3 uppercase">
                      {typeof trade.type === 'string' ? trade.type : 'N/A'} / {typeof trade.outcome === 'string' ? trade.outcome : 'N/A'}
                    </td>
                    <td className="py-2 pr-3">{typeof trade.shares === 'number' ? trade.shares : 0}</td>
                    <td className="py-2 pr-3">${typeof trade.total_amount === 'number' ? trade.total_amount.toFixed(2) : '0.00'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">目前尚無交易紀錄。</p>
        )}
      </section>
    </div>
  );
}
