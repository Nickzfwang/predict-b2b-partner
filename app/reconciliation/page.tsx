import { resolveWalletMode } from '@/lib/wallet-mode';
import { ReconciliationReport } from '@/components/ReconciliationReport';
import { getDictionary, resolveLocale } from '@/lib/i18n';

interface ReconciliationPageProps {
  searchParams: Promise<{ mode?: string; locale?: string }>;
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default async function ReconciliationPage({ searchParams }: ReconciliationPageProps) {
  const { mode: modeParam, locale: localeParam } = await searchParams;
  const locale = resolveLocale(localeParam);
  const d = getDictionary(locale);
  const walletMode = resolveWalletMode(modeParam);
  const yesterday = getYesterday();

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="demo-hero mb-6 overflow-hidden rounded-2xl border border-slate-800/60 p-6 text-white shadow-lg">
        <p className="inline-flex rounded-full bg-amber-300/25 px-3 py-1 text-xs font-medium text-amber-100">
          {d.reconciliation.badge}
        </p>
        <div className="mt-3">
          <h1 className="text-2xl font-bold">{d.reconciliation.title}</h1>
          <p className="mt-1 text-sm text-slate-200">{d.reconciliation.subtitle}</p>
        </div>
      </section>

      <ReconciliationReport walletMode={walletMode} initialDate={yesterday} locale={locale} />
    </div>
  );
}
