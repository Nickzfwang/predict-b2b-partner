import { getPMClient } from '@/lib/get-pm-client';
import { resolveWalletMode, getUserPrefix, type WalletMode } from '@/lib/wallet-mode';
import { BrandingSettings } from '@/components/BrandingSettings';

interface BrandingPageProps {
  searchParams: Promise<{ user?: string; mode?: string }>;
}

async function getEmbedData(userId: string, walletMode: WalletMode) {
  try {
    const pmClient = getPMClient(walletMode);
    const externalUserId = `${getUserPrefix(walletMode)}${userId}`;

    await pmClient.syncUser({
      external_user_id: externalUserId,
      display_name: userId.charAt(0).toUpperCase() + userId.slice(1),
      initial_balance: 1000,
    });

    const tokenRes = await pmClient.getEmbedToken({
      external_user_id: externalUserId,
      permissions: ['view_markets', 'place_trades', 'view_portfolio'],
    });

    return {
      token: tokenRes.data.embed_token,
      embedBaseUrl: tokenRes.data.embed_base_url,
    };
  } catch (err) {
    console.error('[BrandingPage] Failed to get embed data:', err);
    return null;
  }
}

export default async function BrandingPage({ searchParams }: BrandingPageProps) {
  const { user = 'alice', mode: modeParam } = await searchParams;
  const walletMode = resolveWalletMode(modeParam);
  const embedData = await getEmbedData(user, walletMode);

  const embedBaseUrl =
    embedData?.embedBaseUrl ?? process.env.NEXT_PUBLIC_PM_EMBED_BASE_URL ?? 'http://localhost:8000/embed';

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">品牌設定</h1>
        <p className="mt-1 text-sm text-slate-500">
          自訂嵌入元件的品牌外觀，包含 Logo、主題色彩與排版設定
        </p>
      </div>

      {embedData ? (
        <BrandingSettings
          embedBaseUrl={embedBaseUrl}
          initialToken={embedData.token}
          userId={user}
          walletMode={walletMode}
        />
      ) : (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white text-center">
          <span className="text-3xl">🔌</span>
          <p className="text-sm text-gray-500">
            無法連線至 PredictMarkets
            <br />
            請確認服務正在執行
          </p>
        </div>
      )}
    </div>
  );
}
