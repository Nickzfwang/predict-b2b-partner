import { Suspense } from 'react';
import { pmClient } from '@/lib/predict-markets';
import { ARTICLES } from '@/data/articles';
import { ArticleCard } from '@/components/ArticleCard';
import { EmbedWidget } from '@/components/EmbedWidget';

interface HomePageProps {
  searchParams: Promise<{ user?: string }>;
}

const MARKET_SNAPSHOT = [
  { symbol: 'S&P 500', value: '5,188.24', change: '+0.82%', positive: true },
  { symbol: 'NASDAQ 100', value: '18,036.60', change: '+1.14%', positive: true },
  { symbol: 'US 10Y', value: '4.18%', change: '-0.06%', positive: false },
  { symbol: 'DXY', value: '103.42', change: '-0.25%', positive: false },
  { symbol: 'WTI', value: '$76.30', change: '+0.41%', positive: true },
  { symbol: 'Gold', value: '$2,038', change: '+0.19%', positive: true },
  { symbol: 'BTC', value: '$98,420', change: '+2.38%', positive: true },
  { symbol: 'ETH', value: '$5,120', change: '-1.07%', positive: false },
];

const FOCUS_BRIEFS = [
  '聯準會官員最新發言偏向謹慎，市場下修年內降息次數預期。',
  'AI 供應鏈資本支出續強，先進封裝與高速互連仍是資金主軸。',
  '美元指數回落帶動亞洲股市風險偏好回升，新興市場資金流入擴大。',
  '原油供給干擾風險未解，航運與航空族群短線波動可能加劇。',
];

const MACRO_SIGNALS = [
  {
    label: 'Fed Funds 路徑',
    value: 'Higher-for-longer',
    comment: '短端利率仍高，成長股估值彈性受壓。',
  },
  {
    label: '就業市場',
    value: '穩健偏熱',
    comment: '薪資黏性存在，核心通膨回落速度受限。',
  },
  {
    label: '美元流動性',
    value: '中性偏緊',
    comment: '跨資產輪動加快，風險資產分化明顯。',
  },
  {
    label: '企業獲利修正',
    value: '上修中',
    comment: '科技與半導體獲利動能領先，傳產復甦較慢。',
  },
];

const SECTOR_HEAT = [
  { sector: '半導體', tone: '強勢', note: 'AI 伺服器訂單能見度延長至 2027。' },
  { sector: '金融', tone: '中性', note: '殖利率曲線修復仍慢，利差回升有限。' },
  { sector: '能源', tone: '偏多', note: '地緣風險與庫存下降支撐油價。' },
  { sector: '消費', tone: '分化', note: '高端與必需消費穩健，可選消費壓力較大。' },
];

const WEEKLY_CALENDAR = [
  { day: 'Mon', event: '美國製造業 PMI 初值', impact: '高' },
  { day: 'Tue', event: 'NVIDIA 財報電話會議', impact: '高' },
  { day: 'Wed', event: '美國原油庫存', impact: '中' },
  { day: 'Thu', event: 'FOMC 會議紀要', impact: '高' },
  { day: 'Fri', event: '美國核心 PCE 物價指數', impact: '高' },
];

const EMBED_HIGHLIGHTS = ['可嵌入媒體內容頁', '可嵌入社群導流頁', '可嵌入合作平台會員中心'];

async function getEmbedData(userId: string) {
  try {
    await pmClient.syncUser({
      external_user_id: `demo_${userId}`,
      display_name: userId.charAt(0).toUpperCase() + userId.slice(1),
      initial_balance: 1000,
    });

    const tokenRes = await pmClient.getEmbedToken({
      external_user_id: `demo_${userId}`,
      permissions: ['view_markets', 'place_trades', 'view_portfolio'],
    });

    return {
      token: tokenRes.data.embed_token,
      embedBaseUrl: tokenRes.data.embed_base_url,
    };
  } catch (err) {
    console.error('[HomePage] Failed to get embed data:', err);
    return null;
  }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { user = 'alice' } = await searchParams;
  const displayName = user.charAt(0).toUpperCase() + user.slice(1);
  const articleCount = ARTICLES.length;

  const embedData = await getEmbedData(user);

  const embedBaseUrl =
    embedData?.embedBaseUrl ?? process.env.NEXT_PUBLIC_PM_EMBED_BASE_URL ?? 'http://localhost:8000/embed';

  return (
    <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
      <section className="p-6 mb-8 overflow-hidden text-white border shadow-lg rounded-2xl border-slate-200 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 sm:p-8">
        <p className="inline-flex px-3 py-1 mb-3 text-xs font-medium tracking-wide rounded-full bg-emerald-300/20 text-emerald-100">
          Global Macro Desk
        </p>
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
          財經快訊與市場觀點
          <br />
          聚焦資產輪動、估值修正與政策風向
        </h1>
        <p className="max-w-3xl mt-3 text-sm text-slate-200 sm:text-base">
          你好，{displayName}。這裡整理當前跨市場關鍵訊號，包含股債匯商品與加密資產，
          搭配深度報導與即時預測市場，協助快速判讀風險與機會。
        </p>

        <div className="grid grid-cols-2 gap-3 mt-5 sm:grid-cols-4">
          <MetricCard label="追蹤資產" value={MARKET_SNAPSHOT.length.toString()} />
          <MetricCard label="專題文章" value={articleCount.toString()} />
          <MetricCard label="熱門產業" value={SECTOR_HEAT.length.toString()} />
          <MetricCard label="本週高影響事件" value="4" />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-6 sm:grid-cols-4">
          {MARKET_SNAPSHOT.map((item) => (
            <div key={item.symbol} className="px-3 py-2 border rounded-lg border-white/15 bg-white/10">
              <p className="text-[11px] text-slate-300">{item.symbol}</p>
              <p className="text-sm font-semibold text-white">{item.value}</p>
              <p className={`text-xs ${item.positive ? 'text-emerald-300' : 'text-rose-300'}`}>
                {item.change}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="p-5 mb-8 bg-white border shadow-md rounded-2xl border-emerald-200 sm:p-6">
        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
              Featured Embed
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">熱門預測市場</h2>
            <p className="mt-1 text-sm text-slate-600">此區塊可直接嵌到其他內容平台，完整保留即時市場瀏覽與互動體驗。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {EMBED_HIGHLIGHTS.map((item) => (
              <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                {item}
              </span>
            ))}
          </div>
        </div>

        {embedData ? (
          <Suspense fallback={<div className="h-[680px] animate-pulse rounded-xl bg-gray-100" />}>
            <EmbedWidget
              embedBaseUrl={embedBaseUrl}
              initialToken={embedData.token}
              userId={user}
              mode="markets"
              height={680}
            />
          </Suspense>
        ) : (
          <div className="flex h-[680px] flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white text-center">
            <span className="text-3xl">🔌</span>
            <p className="text-sm text-gray-500">
              無法連線至 PredictMarkets
              <br />
              請確認服務正在執行
            </p>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-8 mb-8 lg:grid-cols-3">
        <div className="p-5 bg-white border shadow-sm lg:col-span-2 rounded-2xl border-slate-200 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">今日焦點快訊</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">編輯精選</span>
          </div>
          <div className="space-y-3">
            {FOCUS_BRIEFS.map((brief) => (
              <div key={brief} className="px-4 py-3 border rounded-xl border-slate-100 bg-slate-50">
                <p className="text-sm leading-relaxed text-slate-700">{brief}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900">產業熱度追蹤</h3>
            <div className="grid grid-cols-1 gap-3 mt-3 sm:grid-cols-2">
              {SECTOR_HEAT.map((item) => (
                <div key={item.sector} className="p-4 bg-white border rounded-xl border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{item.sector}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{item.tone}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="p-5 bg-white border shadow-sm rounded-2xl border-slate-200 sm:p-6">
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">宏觀訊號儀表板</h2>
            <p className="mt-1 text-sm text-slate-500">用政策與流動性框架看市場</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {MACRO_SIGNALS.map((item) => (
                <li key={item.label} className="p-3 border rounded-xl border-slate-100 bg-slate-50">
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-800">{item.value}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.comment}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 bg-white border rounded-2xl border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800">本週財經行事曆</h3>
            <div className="mt-3 space-y-2">
              {WEEKLY_CALENDAR.map((item) => (
                <div key={`${item.day}-${item.event}`} className="flex items-start justify-between gap-2 text-xs">
                  <div>
                    <p className="font-semibold text-slate-700">{item.day}</p>
                    <p className="text-slate-500">{item.event}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      item.impact === '高' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {item.impact}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">深度閱讀</h2>
          <p className="mt-0.5 text-sm text-slate-500">從財經報導建立觀點，持續追蹤市場關鍵變化。</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">Editor Picks</span>
      </div>

      <section>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ARTICLES.map((article) => (
            <ArticleCard key={article.id} article={article} user={user} />
          ))}
        </div>
      </section>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  mono?: boolean;
}

function MetricCard({ label, value, mono = false }: MetricCardProps) {
  return (
    <div className="px-3 py-2 border rounded-xl border-white/15 bg-white/10">
      <p className="text-xs text-slate-300">{label}</p>
      <p className={`mt-1 text-lg font-semibold text-white ${mono ? 'font-mono text-sm' : ''}`}>{value}</p>
    </div>
  );
}
