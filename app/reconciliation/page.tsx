import { resolveWalletMode } from '@/lib/wallet-mode';
import { ReconciliationReport } from '@/components/ReconciliationReport';

interface ReconciliationPageProps {
  searchParams: Promise<{ mode?: string }>;
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default async function ReconciliationPage({ searchParams }: ReconciliationPageProps) {
  const { mode: modeParam } = await searchParams;
  const walletMode = resolveWalletMode(modeParam);
  const yesterday = getYesterday();

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="demo-hero mb-6 overflow-hidden rounded-2xl border border-slate-800/60 p-6 text-white shadow-lg">
        <p className="inline-flex rounded-full bg-amber-300/25 px-3 py-1 text-xs font-medium text-amber-100">
          Reconciliation
        </p>
        <div className="mt-3">
          <h1 className="text-2xl font-bold">T+1 對帳報告</h1>
          <p className="mt-1 text-sm text-slate-200">
            每日凌晨自動產生前一日的對帳報告，含撮合彙總、手續費、結算、分潤及差異檢查
          </p>
        </div>
      </section>

      <ReconciliationReport walletMode={walletMode} initialDate={yesterday} />
    </div>
  );
}
