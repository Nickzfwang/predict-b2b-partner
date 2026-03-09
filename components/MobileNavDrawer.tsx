'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const MOBILE_NAV_ITEMS = [
  { href: '/', label: '首頁' },
  { href: '/wallet', label: '錢包' },
  { href: '/trades', label: '交易' },
  { href: '/portfolio', label: '我的投資組合' },
];
const DEMO_USERS = ['alice', 'bob', 'carol'];

export function MobileNavDrawer() {
  const searchParams = useSearchParams();
  const user = searchParams.get('user');
  const mode = searchParams.get('mode');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
        aria-label={open ? '關閉導覽選單' : '開啟導覽選單'}
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 top-14 z-40 bg-slate-900/20 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
          <section className="fixed inset-x-0 top-14 z-50 border-b border-slate-200 bg-white/98 shadow-lg backdrop-blur-sm">
            <div className="mx-auto max-w-7xl px-3 py-3">
              <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500">導覽選單</p>
              <nav className="grid grid-cols-2 gap-2">
                {MOBILE_NAV_ITEMS.map((item) => {
                  const navParams = new URLSearchParams();
                  if (user) navParams.set('user', user);
                  if (mode) navParams.set('mode', mode);
                  const navQs = navParams.toString();
                  const href = navQs ? `${item.href}?${navQs}` : item.href;
                  return (
                    <Link
                      key={item.href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-medium text-slate-700"
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Demo 使用者</p>
                <div className="grid grid-cols-3 gap-2">
                  {DEMO_USERS.map((item) => {
                    const href = new URLSearchParams(searchParams.toString());
                    href.set('user', item);
                    return (
                      <Link
                        key={item}
                        href={`?${href.toString()}`}
                        onClick={() => setOpen(false)}
                        className={`rounded-lg border px-2 py-1.5 text-center text-xs font-medium ${
                          item === (user ?? 'alice')
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        {item}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
