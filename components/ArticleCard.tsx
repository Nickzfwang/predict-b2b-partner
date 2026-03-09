import Link from 'next/link';
import Image from 'next/image';
import { Article } from '@/data/articles';

interface ArticleCardProps {
  article: Article;
  user: string;
  mode?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  '加密貨幣': 'bg-orange-100 text-orange-700',
  '政治': 'bg-blue-100 text-blue-700',
  '科技': 'bg-purple-100 text-purple-700',
  '體育': 'bg-green-100 text-green-700',
  '總體經濟': 'bg-slate-100 text-slate-700',
};

export function ArticleCard({ article, user, mode }: ArticleCardProps) {
  const categoryColor = CATEGORY_COLORS[article.category] ?? 'bg-gray-100 text-gray-700';

  return (
    <Link
      href={`/articles/${article.id}?user=${user}${mode ? `&mode=${encodeURIComponent(mode)}` : ''}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* 文章圖片 */}
      <div className="relative h-44 overflow-hidden bg-gray-100">
        <Image
          src={article.imageUrl}
          alt={article.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, 50vw"
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColor}`}
        >
          {article.category}
        </span>
      </div>

      {/* 文章資訊 */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="line-clamp-2 text-base font-semibold leading-snug text-gray-900 group-hover:text-indigo-600">
          {article.title}
        </h2>
        <p className="line-clamp-2 text-sm leading-relaxed text-gray-500">
          {article.summary}
        </p>

        {/* Meta */}
        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-gray-400">
          <span>{article.author}</span>
          <span>{article.publishedAt}</span>
        </div>

        {/* 有關聯市場時顯示標籤 */}
        {article.relatedMarketId && (
          <div className="flex items-center gap-1 text-xs font-medium text-indigo-500">
            <span>📊</span>
            <span>相關預測市場</span>
          </div>
        )}
      </div>
    </Link>
  );
}
