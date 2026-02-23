import Link from 'next/link';
import { pmClient } from '@/lib/predict-markets';
import { EmbedWidget } from '@/components/EmbedWidget';

interface PortfolioPageProps {
  searchParams: Promise<{ user?: string }>;
}

async function getUserAndToken(userId: string) {
  try {
    // 同步用戶（確保存在）
    const userRes = await pmClient.syncUser({
      external_user_id: `demo_${userId}`,
      display_name: userId.charAt(0).toUpperCase() + userId.slice(1),
      initial_balance: 1000,
    });

    const tokenRes = await pmClient.getEmbedToken({
      external_user_id: `demo_${userId}`,
      permissions: ['view_markets', 'place_trades', 'view_portfolio'],
    });

    return {
      user: userRes.data,
      token: tokenRes.data.embed_token,
      embedBaseUrl: tokenRes.data.embed_base_url,
    };
  } catch (err) {
    console.error('[PortfolioPage] Error:', err);
    return null;
  }
}

export default async function PortfolioPage({ searchParams }: PortfolioPageProps) {
  const { user = 'alice' } = await searchParams;
  const data = await getUserAndToken(user);

  const embedBaseUrl =
    data?.embedBaseUrl ?? process.env.NEXT_PUBLIC_PM_EMBED_BASE_URL ?? 'http://localhost:8000/embed';

  const displayName = user.charAt(0).toUpperCase() + user.slice(1);
  const balance = typeof data?.user?.balance === 'number' ? data.user.balance : 0;
  const totalTrades = typeof data?.user?.total_trades === 'number' ? data.user.total_trades : 0;
  const joinedDate = data?.user?.created_at
    ? new Date(data.user.created_at).toLocaleDateString('zh-TW')
    : 'N/A';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {displayName} 的投資組合
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            查看你在各預測市場的持倉與損益
          </p>
        </div>

        {/* 餘額 badge */}
        {data?.user && (
          <div className="rounded-xl border border-gray-100 bg-white px-5 py-3 text-right shadow-sm">
            <p className="text-xs text-gray-400">可用餘額</p>
            <p className="mt-0.5 text-xl font-bold text-gray-900">
              ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>

      {/* 統計卡片 */}
      {data?.user && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="總交易次數" value={String(totalTrades)} icon="🔄" />
          <StatCard
            label="加入時間"
            value={joinedDate}
            icon="📅"
          />
          <StatCard label="帳號 ID" value={`demo_${user}`} icon="🪪" mono />
        </div>
      )}

      {/* 投資組合 Widget */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">📋 持倉明細</h2>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-600">
            即時更新
          </span>
        </div>

        {data ? (
          <EmbedWidget
            embedBaseUrl={embedBaseUrl}
            initialToken={data.token}
            userId={user}
            mode="portfolio"
            height={550}
          />
        ) : (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl bg-gray-50">
            <span className="text-3xl">🔌</span>
            <p className="text-sm text-gray-500">
              無法連線至 PredictMarkets，請確認服務正在執行
            </p>
            <Link
              href={`/?user=${user}`}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              前往市場交易
            </Link>
          </div>
        )}
      </div>

      {/* 前往市場 */}
      <div className="mt-6 text-center">
        <Link
          href={`/?user=${user}`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <span>🔍</span>
          瀏覽更多市場
        </Link>
      </div>
    </div>
  );
}

// ── 統計卡片子元件 ─────────────────────────────────────────────────────────────

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
      <p className={`mt-1 text-base font-semibold text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </p>
    </div>
  );
}
