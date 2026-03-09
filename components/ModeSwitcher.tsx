'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const MODES = [
  { value: 'transfer', label: 'Transfer', desc: 'PM 管理餘額' },
  { value: 'seamless', label: 'Seamless', desc: '商戶管理餘額' },
] as const;

export function ModeSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const currentMode = searchParams.get('mode') ?? 'transfer';

  const switchMode = (mode: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === 'transfer') {
      params.delete('mode');
    } else {
      params.set('mode', mode);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
  };

  const current = MODES.find((m) => m.value === currentMode) ?? MODES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm font-medium shadow-sm transition sm:gap-2 sm:px-3 ${
          currentMode === 'seamless'
            ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            : 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100'
        }`}
      >
        <span className="text-xs">{current.label}</span>
        <svg
          className={`h-3.5 w-3.5 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`}
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
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg">
            <div className="border-b border-gray-100 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                錢包模式
              </p>
            </div>
            {MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => switchMode(mode.value)}
                className={`flex w-full flex-col px-3 py-2.5 text-left transition hover:bg-gray-50 ${
                  currentMode === mode.value ? 'bg-indigo-50' : ''
                }`}
              >
                <span className={`text-sm font-medium ${currentMode === mode.value ? 'text-indigo-700' : 'text-gray-700'}`}>
                  {mode.label}
                </span>
                <span className="text-xs text-gray-500">{mode.desc}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
