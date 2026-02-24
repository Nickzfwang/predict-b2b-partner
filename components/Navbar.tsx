import Link from 'next/link';
import { Suspense } from 'react';
import { UserSwitcher } from './UserSwitcher';
import { NavLinks } from './NavLinks';
import { WebhookNotifications } from './WebhookNotifications';
import { MobileNavDrawer } from './MobileNavDrawer';

function UserSwitcherFallback() {
  return (
    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-400 sm:px-3 sm:text-sm">
      <span>👤</span>
      <span className="hidden sm:inline">載入中...</span>
    </div>
  );
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between sm:h-14">
          <Link href="/" className="flex min-w-0 items-center gap-1.5 font-semibold text-gray-900 sm:gap-2">
            <span className="text-lg sm:text-xl">📈</span>
            <span className="truncate text-sm sm:hidden">InsightHub</span>
            <span className="hidden truncate text-base sm:inline">InsightHub Markets</span>
            <span className="hidden rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 sm:inline-flex">
              財經即時
            </span>
          </Link>

          <Suspense fallback={<div className="hidden sm:block" />}>
            <NavLinks />
          </Suspense>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Suspense fallback={<div className="h-10 w-10 rounded-full border border-slate-300 bg-white" />}>
              <WebhookNotifications />
            </Suspense>

            <div className="hidden sm:block">
              <Suspense fallback={<UserSwitcherFallback />}>
                <UserSwitcher />
              </Suspense>
            </div>

            <MobileNavDrawer />
          </div>
        </div>
      </div>
    </header>
  );
}
