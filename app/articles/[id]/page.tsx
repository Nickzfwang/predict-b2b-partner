import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getPMClient } from '@/lib/get-pm-client';
import { resolveWalletMode, getUserPrefix, type WalletMode } from '@/lib/wallet-mode';
import { getArticleById } from '@/data/articles';
import { EmbedWidget } from '@/components/EmbedWidget';
import { getDictionary, resolveLocale } from '@/lib/i18n';

interface ArticlePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ user?: string; mode?: string; locale?: string }>;
}

async function getEmbedToken(userId: string, walletMode: WalletMode) {
  try {
    const pmClient = getPMClient(walletMode);
    const externalUserId = `${getUserPrefix(walletMode)}${userId}`;

    const res = await pmClient.getEmbedToken({
      external_user_id: externalUserId,
      permissions: ['view_markets', 'place_trades', 'view_portfolio'],
    });
    return {
      token: res.data.embed_token,
      embedBaseUrl: res.data.embed_base_url,
    };
  } catch {
    return null;
  }
}

export default async function ArticlePage({ params, searchParams }: ArticlePageProps) {
  const { id } = await params;
  const { user = 'alice', mode: modeParam, locale: localeParam } = await searchParams;
  const locale = resolveLocale(localeParam);
  const d = getDictionary(locale);
  const walletMode = resolveWalletMode(modeParam);

  const article = getArticleById(id);
  if (!article) notFound();

  const embedData = await getEmbedToken(user, walletMode);
  const embedBaseUrl =
    embedData?.embedBaseUrl ?? process.env.NEXT_PUBLIC_PM_EMBED_BASE_URL ?? 'http://localhost:8000/embed';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 返回首頁 */}
      <Link
        href={`/?user=${user}&mode=${walletMode}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-gray-900"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
            clipRule="evenodd"
          />
        </svg>
        {d.article.backToHome}
      </Link>

      {/* 文章 Header */}
      <article>
        <header className="mb-6">
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
            {article.category}
          </span>
          <h1 className="mt-3 text-2xl font-bold leading-snug text-gray-900 sm:text-3xl">
            {article.title}
          </h1>
          <div className="mt-3 flex items-center gap-3 text-sm text-gray-400">
            <span>✍️ {article.author}</span>
            <span>·</span>
            <span>{article.publishedAt}</span>
          </div>
        </header>

        {/* 文章圖片 */}
        <div className="relative mb-8 h-64 overflow-hidden rounded-xl bg-gray-100 sm:h-80">
          <Image
            src={article.imageUrl}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </div>

        {/* 文章摘要 */}
        <p className="mb-6 text-lg font-medium leading-relaxed text-gray-600">
          {article.summary}
        </p>

        {/* 文章內容 */}
        <div className="prose prose-gray max-w-none">
          {article.content.split('\n\n').map((paragraph, i) => (
            <p key={i} className="mb-4 leading-relaxed text-gray-700">
              {paragraph}
            </p>
          ))}
        </div>
      </article>

      {/* 分隔線 */}
      <hr className="my-10 border-gray-200" />

      {/* 相關預測市場 */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              📊 {article.relatedMarketId ? d.article.relatedMarkets : d.article.popularMarkets}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {article.relatedMarketId
                ? d.article.relatedMarketsDesc
                : d.article.popularMarketsDesc}
            </p>
          </div>
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            🟢 {d.article.livePricing}
          </span>
        </div>

        {embedData ? (
          <EmbedWidget
            embedBaseUrl={embedBaseUrl}
            initialToken={embedData.token}
            userId={user}
            route={article.relatedMarketId ? `/markets/${article.relatedMarketId}` : '/markets'}
            height="520px"
            locale={locale}
            walletMode={walletMode}
          />
        ) : (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white text-center">
            <span className="text-3xl">🔌</span>
            <p className="text-sm text-gray-500">
              {d.common.connectError}
              <br />
              {d.common.confirmService}
            </p>
          </div>
        )}

        <p className="mt-3 text-center text-xs text-gray-400">
          {d.article.pricingNote}
        </p>
      </section>
    </div>
  );
}
