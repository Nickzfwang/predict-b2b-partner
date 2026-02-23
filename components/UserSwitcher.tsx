'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const DEMO_USERS = ['alice', 'bob', 'carol'];

const USER_AVATARS: Record<string, string> = {
  alice: '👩',
  bob: '👨',
  carol: '👩‍💼',
};

export function UserSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const currentUser = searchParams.get('user') ?? 'alice';

  const switchUser = (user: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('user', user);
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
      >
        <span>{USER_AVATARS[currentUser] ?? '👤'}</span>
        <span className="capitalize">{currentUser}</span>
        <svg
          className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <>
          {/* 背景遮罩 */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* 下拉選單 */}
          <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg">
            <div className="border-b border-gray-100 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Demo 用戶切換
              </p>
            </div>
            {DEMO_USERS.map((user) => (
              <button
                key={user}
                onClick={() => switchUser(user)}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition hover:bg-gray-50 ${
                  currentUser === user ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-gray-700'
                }`}
              >
                <span>{USER_AVATARS[user]}</span>
                <span className="capitalize">{user}</span>
                {currentUser === user && (
                  <svg className="ml-auto h-3.5 w-3.5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
