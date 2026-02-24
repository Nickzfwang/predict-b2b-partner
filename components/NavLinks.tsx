'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: '首頁' },
  { href: '/wallet', label: '錢包' },
  { href: '/trades', label: '交易' },
  { href: '/portfolio', label: '我的投資組合' },
];

export function NavLinks() {
  const searchParams = useSearchParams();
  const user = searchParams.get('user');

  return (
    <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 sm:flex">
      {NAV_ITEMS.map((item) => {
        const href = user ? `${item.href}?user=${encodeURIComponent(user)}` : item.href;
        return (
          <Link key={item.href} href={href} className="transition hover:text-gray-900">
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
