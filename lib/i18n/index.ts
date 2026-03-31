import type { Dictionary, SupportedLocale } from './types';
import zhTW from './zh-TW';
import zhCN from './zh-CN';
import en from './en';
import ja from './ja';
import ko from './ko';

export type { Dictionary, SupportedLocale };

const dictionaries: Record<SupportedLocale, Dictionary> = {
  'zh-TW': zhTW,
  'zh-CN': zhCN,
  en,
  ja,
  ko,
};

const SUPPORTED_LOCALES: SupportedLocale[] = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko'];

export function isSupportedLocale(value: string | undefined | null): value is SupportedLocale {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

export function resolveLocale(value: string | undefined | null): SupportedLocale {
  return isSupportedLocale(value) ? value : 'zh-TW';
}

export function getDictionary(locale: string | undefined | null): Dictionary {
  return dictionaries[resolveLocale(locale)];
}

export function getIntlLocale(locale: string | undefined | null): SupportedLocale {
  return resolveLocale(locale);
}

/** 簡易模板替換：將 {name} 替換為 params.name */
export function t(template: string, params?: Record<string, string>): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    template,
  );
}
