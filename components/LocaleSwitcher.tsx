'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getDictionary } from '@/lib/i18n';

const LOCALES = [
  { value: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
  { value: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
  { value: 'ko', label: '한국어', flag: '🇰🇷' },
] as const;

export type SupportedLocale = (typeof LOCALES)[number]['value'];

export function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const currentLocale = searchParams.get('locale') ?? 'zh-TW';
  const d = getDictionary(currentLocale);

  const switchLocale = (locale: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (locale === 'zh-TW') {
      params.delete('locale');
    } else {
      params.set('locale', locale);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
  };

  const current = LOCALES.find((l) => l.value === currentLocale) ?? LOCALES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-medium shadow-sm transition hover:bg-gray-50 sm:gap-2 sm:px-3"
      >
        <span className="text-xs">{current.flag}</span>
        <span className="hidden text-xs text-gray-700 sm:inline">{current.label}</span>
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
          <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg">
            <div className="border-b border-gray-100 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {d.locale.label}
              </p>
            </div>
            {LOCALES.map((locale) => (
              <button
                key={locale.value}
                onClick={() => switchLocale(locale.value)}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-gray-50 ${
                  currentLocale === locale.value ? 'bg-indigo-50' : ''
                }`}
              >
                <span>{locale.flag}</span>
                <span className={`text-sm font-medium ${currentLocale === locale.value ? 'text-indigo-700' : 'text-gray-700'}`}>
                  {locale.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
