import { getPMClient } from '@/lib/get-pm-client';
import { resolveWalletMode } from '@/lib/wallet-mode';
import { DepositDashboard } from '@/components/DepositDashboard';
import type { PMDepositAccount, PMDepositRisk } from '@/lib/predict-markets';

interface DepositPageProps {
  searchParams: Promise<{ mode?: string }>;
}

async function getDepositData(mode: 'transfer' | 'seamless') {
  try {
    const pmClient = getPMClient(mode);
    const [accountRes, riskRes] = await Promise.all([
      pmClient.getDepositAccount(),
      pmClient.getDepositRisk(),
    ]);
    return {
      account: accountRes.data,
      risk: riskRes.data,
    };
  } catch (err) {
    console.error('[DepositPage] Error:', err);
    return null;
  }
}

export default async function DepositPage({ searchParams }: DepositPageProps) {
  const { mode: modeParam } = await searchParams;
  const walletMode = resolveWalletMode(modeParam);
  const data = await getDepositData(walletMode);

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="demo-hero mb-6 overflow-hidden rounded-2xl border border-slate-800/60 p-6 text-white shadow-lg">
        <p className="inline-flex rounded-full bg-amber-300/25 px-3 py-1 text-xs font-medium text-amber-100">
          Deposit Account
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">保證金管理</h1>
            <p className="mt-1 text-sm text-slate-200">查看帳戶餘額、風控狀態與交易記錄</p>
          </div>
          {data?.account && (
            <div className="hero-summary-card w-full rounded-xl px-4 py-3 text-left sm:w-auto sm:text-right">
              <p className="text-xs text-slate-200">可用餘額</p>
              <p className="text-xl font-bold text-white">
                ${parseFloat(data.account.available_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
      </section>

      {data ? (
        <DepositDashboard
          account={data.account as PMDepositAccount}
          risk={data.risk as PMDepositRisk}
          walletMode={walletMode}
        />
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">無法載入保證金資料</p>
          <p className="mt-1 text-xs text-red-600">請確認 predict-markets 服務已啟動且 API 憑證正確。</p>
        </div>
      )}
    </div>
  );
}
