import Link from 'next/link';
import { getPMClient } from '@/lib/get-pm-client';
import { resolveWalletMode, getUserPrefix, type WalletMode } from '@/lib/wallet-mode';
import { WalletActions } from '@/components/WalletActions';
import { SeamlessTransactionLog } from '@/components/SeamlessTransactionLog';
import { getBalance as getSeamlessBalance } from '@/lib/seamless-balance-store';
import { getDictionary, getIntlLocale, resolveLocale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/i18n';

interface WalletPageProps {
  searchParams: Promise<{ user?: string; mode?: string; locale?: string }>;
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

function getTradeText(value: unknown, d: Dictionary): string {
  if (value === 'buy') return d.trades.buy;
  if (value === 'sell') return d.trades.sell;
  if (value === 'yes') return d.common.yes;
  if (value === 'no') return d.common.no;
  return typeof value === 'string' ? value : d.common.notAvailable;
}

async function getWalletData(userId: string, walletMode: WalletMode) {
  try {
    const pmClient = getPMClient(walletMode);
    const externalUserId = `${getUserPrefix(walletMode)}${userId}`;

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
  const { user = 'alice', mode: modeParam, locale: localeParam } = await searchParams;
  const locale = resolveLocale(localeParam);
  const d = getDictionary(locale);
  const intlLocale = getIntlLocale(locale);
  const walletMode = resolveWalletMode(modeParam);
  const data = await getWalletData(user, walletMode);

  // Seamless 模式：餘額由商戶端 balance store 管理，非 PM 內部
  const externalUserId = `${getUserPrefix(walletMode)}${user}`;
  const balance = walletMode === 'seamless'
    ? await getSeamlessBalance(externalUserId)
    : (typeof data?.user?.balance === 'number' ? data.user.balance : 0);

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="demo-hero mb-6 overflow-hidden rounded-2xl border border-slate-800/60 p-6 text-white shadow-lg">
        <p className="inline-flex rounded-full bg-emerald-300/25 px-3 py-1 text-xs font-medium text-emerald-100">{d.wallet.badge}</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{d.wallet.title}</h1>
            <p className="mt-1 text-sm text-slate-200">{d.wallet.subtitle}</p>
          </div>
          <div className="hero-summary-card w-full rounded-xl px-4 py-3 text-left sm:w-auto sm:text-right">
            <p className="text-xs text-slate-200">{d.wallet.availableBalance}</p>
            <p className="text-xl font-bold text-white">
              ${balance.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </section>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{d.wallet.fundOps}</h2>
          <p className="mt-1 text-sm text-slate-500">{d.wallet.fundOpsDesc}</p>
        </div>
      </div>

      {walletMode === 'seamless' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-800">{d.wallet.seamlessMode}</p>
            <p className="mt-1 text-xs text-blue-600">
              {d.wallet.seamlessModeDesc}
            </p>
          </div>
          <SeamlessTransactionLog userId={user} locale={locale} />
        </div>
      ) : (
        <WalletActions userId={user} walletMode={walletMode} locale={locale} />
      )}

      <section className="table-surface mt-6 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">{d.wallet.recentTrades}</h2>
          <Link href={`/trades?user=${user}&mode=${walletMode}&locale=${locale}`} className="text-xs text-blue-700 hover:underline">
            {d.common.viewAll}
          </Link>
        </div>

        {data?.recentTrades?.length ? (
          <>
            <div className="space-y-2 sm:hidden">
              {data.recentTrades.map((trade, idx) => (
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
                    <p className="text-right font-semibold text-slate-900">
                      ${typeof trade.total_amount === 'number' ? trade.total_amount.toFixed(2) : '0.00'}
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
                    <th className="py-2 pr-3">{d.wallet.direction}</th>
                    <th className="py-2 pr-3">{d.common.shares}</th>
                    <th className="py-2 pr-3">{d.common.amount}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentTrades.map((trade, idx) => (
                    <tr key={typeof trade.trade_id === 'string' ? trade.trade_id : `trade-${idx}`} className="table-body-row">
                      <td className="py-2 pr-3">
                        {typeof trade.created_at === 'string' ? new Date(trade.created_at).toLocaleString(intlLocale) : d.common.notAvailable}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">{getMarketLabel(trade.market_id)}</td>
                      <td className="py-2 pr-3 uppercase">
                        {getTradeText(trade.type, d)} / {getTradeText(trade.outcome, d)}
                      </td>
                      <td className="py-2 pr-3">{typeof trade.shares === 'number' ? trade.shares : 0}</td>
                      <td className="py-2 pr-3 font-medium text-slate-900">${typeof trade.total_amount === 'number' ? trade.total_amount.toFixed(2) : '0.00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">{d.wallet.noTrades}</p>
        )}
      </section>
    </div>
  );
}
