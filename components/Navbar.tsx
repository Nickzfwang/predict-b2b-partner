import Link from 'next/link';
import { Suspense } from 'react';
import { UserSwitcher } from './UserSwitcher';
import { NavLinks } from './NavLinks';
import { WebhookNotifications } from './WebhookNotifications';

function UserSwitcherFallback() {
  return (
    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-400">
      <span>👤</span>
      <span>載入中...</span>
    </div>
  );
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
          <span className="text-xl">📈</span>
          <span>InsightHub Markets</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            財經即時
          </span>
        </Link>

        {/* Nav Links */}
        <Suspense fallback={<div className="hidden sm:block" />}>
          <NavLinks />
        </Suspense>

        <div className="flex items-center gap-2">
          <Suspense fallback={<div className="h-10 w-10 rounded-full border border-slate-300 bg-white" />}>
            <WebhookNotifications />
          </Suspense>

          {/* User Switcher（client，需包 Suspense） */}
          <Suspense fallback={<UserSwitcherFallback />}>
            <UserSwitcher />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
