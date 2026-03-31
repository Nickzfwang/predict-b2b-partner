import { getPMClient } from '@/lib/get-pm-client';
import { resolveWalletMode, getUserPrefix, type WalletMode } from '@/lib/wallet-mode';
import { getDictionary, getIntlLocale, resolveLocale } from '@/lib/i18n';

interface PositionsPageProps {
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

function asArrayOfObjects(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null);
  if (typeof value === 'object' && value !== null && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: unknown[] }).data.filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null);
  }
  return [];
}

function normalizePositions(value: unknown): PositionView[] {
  return asArrayOfObjects(value).map((p, idx) => ({
    id: typeof p.position_id === 'string' ? p.position_id : `position-${idx}`,
    marketTitle: typeof p.market_title === 'string' ? p.market_title : 'Unknown Market',
    marketStatus: typeof p.market_status === 'string' ? p.market_status : 'unknown',
    yesShares: typeof p.yes_shares === 'number' ? p.yes_shares : 0,
    noShares: typeof p.no_shares === 'number' ? p.no_shares : 0,
    invested: typeof p.total_invested === 'number' ? p.total_invested : 0,
    currentValue: typeof p.current_value === 'number' ? p.current_value : 0,
    unrealized: typeof p.unrealized_profit === 'number' ? p.unrealized_profit : 0,
  }));
}

function buildPositionsFromTrades(tradesRaw: unknown): PositionView[] {
  const trades = asArrayOfObjects(tradesRaw);
  const grouped = new Map<string, PositionView>();

  for (const trade of trades) {
    const marketId =
      typeof trade.market_id === 'string'
        ? trade.market_id
        : typeof trade.market_id === 'number'
          ? String(trade.market_id)
          : typeof trade.market_id === 'object' && trade.market_id !== null && typeof (trade.market_id as { id?: unknown }).id === 'string'
            ? (trade.market_id as { id: string }).id
            : 'unknown-market';

    const key = marketId;
    const shares = typeof trade.shares === 'number' ? trade.shares : 0;
    const amount = typeof trade.total_amount === 'number' ? trade.total_amount : 0;
    const outcome = trade.outcome === 'yes' ? 'yes' : trade.outcome === 'no' ? 'no' : 'yes';

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: `from-trades-${key}`,
        marketTitle: `Market ${marketId.slice(0, 8)}`,
        marketStatus: 'open',
        yesShares: 0,
        noShares: 0,
        invested: 0,
        currentValue: 0,
        unrealized: 0,
      });
    }

    const current = grouped.get(key)!;
    if (outcome === 'yes') current.yesShares += shares;
    if (outcome === 'no') current.noShares += shares;
    current.invested += amount;
    current.currentValue += amount;
    current.unrealized = current.currentValue - current.invested;
  }

  return [...grouped.values()];
}

async function getPositionsData(userId: string, walletMode: WalletMode) {
  try {
    const pmClient = getPMClient(walletMode);
    const prefix = getUserPrefix(walletMode);
    const demoExternalUserId = `${prefix}${userId}`;
    const candidateUserIds = [demoExternalUserId, userId];

    await pmClient.syncUser({
      external_user_id: demoExternalUserId,
      display_name: userId.charAt(0).toUpperCase() + userId.slice(1),
      initial_balance: 1000,
    });

    const [positionsResultList, tradesResultList] = await Promise.all([
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
              per_page: '200',
              page: '1',
            });
            return res.data;
          } catch {
            return [];
          }
        }),
      ),
    ]);

    const normalizedPositions = positionsResultList.flatMap((result) => normalizePositions(result));
    if (normalizedPositions.length > 0) {
      const deduped = new Map<string, PositionView>();
      for (const item of normalizedPositions) {
        deduped.set(item.id, item);
      }
      return [...deduped.values()];
    }

    const fallbackPositions = tradesResultList.flatMap((result) => buildPositionsFromTrades(result));
    const dedupedFallback = new Map<string, PositionView>();
    for (const item of fallbackPositions) {
      dedupedFallback.set(item.id, item);
    }
    return [...dedupedFallback.values()];
  } catch (err) {
    console.error('[PositionsPage] Error:', err);
    return [];
  }
}

export default async function PositionsPage({ searchParams }: PositionsPageProps) {
  const { user = 'alice', mode: modeParam, locale: localeParam } = await searchParams;
  const locale = resolveLocale(localeParam);
  const d = getDictionary(locale);
  const intlLocale = getIntlLocale(locale);
  const walletMode = resolveWalletMode(modeParam);
  const positions = await getPositionsData(user, walletMode);

  const totals = positions.reduce(
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{d.portfolio.holdingsApi}</h1>
          <p className="mt-1 text-sm text-slate-500">{d.portfolio.subtitle}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right text-xs sm:text-sm">
          <Metric label={d.portfolio.invested} value={totals.invested} highlight={false} locale={intlLocale} />
          <Metric label={d.portfolio.value} value={totals.currentValue} highlight={false} locale={intlLocale} />
          <Metric label={d.portfolio.unrealized} value={totals.unrealized} highlight locale={intlLocale} />
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {positions.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
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
                {positions.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 text-slate-700 last:border-b-0">
                    <td className="py-2 pr-3">{p.marketTitle}</td>
                    <td className="py-2 pr-3 capitalize">{p.marketStatus}</td>
                    <td className="py-2 pr-3">{p.yesShares}</td>
                    <td className="py-2 pr-3">{p.noShares}</td>
                    <td className="py-2 pr-3">${p.invested.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 pr-3">${p.currentValue.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className={`py-2 pr-3 ${p.unrealized >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      ${p.unrealized.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{d.portfolio.noPositions}</p>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, highlight = false, locale }: { label: string; value: number; highlight?: boolean; locale: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className={`font-semibold ${highlight ? (value >= 0 ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-800'}`}>
        ${value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}
