import en from './en.json';
import th from './th.json';

export const locales = ['en', 'th'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

const dictionaries = { en, th } as const;
export type Dictionary = typeof en;

export function getDict(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function getLocaleFromUrl(url: URL): Locale {
  const [, first] = url.pathname.split('/');
  if (first === 'th') return 'th';
  return 'en';
}

export function localizePath(path: string, locale: Locale): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === 'en') return clean === '/' ? '/' : clean;
  return clean === '/' ? '/th/' : `/th${clean}`;
}

export function altLocale(locale: Locale): Locale {
  return locale === 'en' ? 'th' : 'en';
}

export function altLocalePath(currentPath: string, currentLocale: Locale): string {
  const target = altLocale(currentLocale);
  let pathWithoutLocale = currentPath;
  if (currentLocale === 'th') {
    pathWithoutLocale = currentPath.replace(/^\/th(\/|$)/, '/');
  }
  if (!pathWithoutLocale.startsWith('/')) pathWithoutLocale = `/${pathWithoutLocale}`;
  return localizePath(pathWithoutLocale, target);
}
