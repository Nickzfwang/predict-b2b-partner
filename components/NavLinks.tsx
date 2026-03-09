'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: '首頁' },
  { href: '/wallet', label: '錢包' },
  { href: '/trades', label: '交易' },
  { href: '/portfolio', label: '我的投資組合' },
];

interface NavLinksProps {
  mobile?: boolean;
}

export function NavLinks({ mobile = false }: NavLinksProps) {
  const searchParams = useSearchParams();
  const user = searchParams.get('user');
  const mode = searchParams.get('mode');

  const navClassName = mobile
    ? 'flex items-center gap-1.5 overflow-x-auto px-1 py-1.5 text-sm font-medium text-slate-700 sm:hidden'
    : 'hidden items-center gap-6 text-sm font-medium text-gray-600 sm:flex';
  const linkClassName = mobile
    ? 'shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition hover:border-slate-300 hover:text-slate-900'
    : 'transition hover:text-gray-900';

  return (
    <nav className={navClassName}>
      {NAV_ITEMS.map((item) => {
        const params = new URLSearchParams();
        if (user) params.set('user', user);
        if (mode) params.set('mode', mode);
        const qs = params.toString();
        const href = qs ? `${item.href}?${qs}` : item.href;
        return (
          <Link key={item.href} href={href} className={linkClassName}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
