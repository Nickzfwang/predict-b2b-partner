'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getDictionary } from '@/lib/i18n';

interface NavLinksProps {
  mobile?: boolean;
}

export function NavLinks({ mobile = false }: NavLinksProps) {
  const searchParams = useSearchParams();
  const user = searchParams.get('user');
  const mode = searchParams.get('mode');
  const locale = searchParams.get('locale');

  const d = getDictionary(locale);

  const NAV_ITEMS = [
    { href: '/', label: d.nav.home },
    { href: '/wallet', label: d.nav.wallet },
    { href: '/trades', label: d.nav.trades },
    { href: '/portfolio', label: d.nav.portfolio },
    { href: '/deposit', label: d.nav.deposit },
    { href: '/reconciliation', label: d.nav.reconciliation },
    { href: '/branding', label: d.nav.branding },
  ];

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
        if (locale) params.set('locale', locale);
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
