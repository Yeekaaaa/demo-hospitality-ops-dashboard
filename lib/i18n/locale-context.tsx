"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { getMessage } from "@/lib/i18n/get-message";
import type { MessageParams } from "@/lib/i18n/types";
import { getDefaultLocaleFromEnv, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/types";

const LOCALE_STORAGE_KEY = "fengtin-locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: MessageParams) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function readStoredLocale(): Locale {
  const envDefault = getDefaultLocaleFromEnv();
  if (typeof window === "undefined") return envDefault;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isLocale(stored)) return stored;
  } catch {
    /* ignore */
  }
  return envDefault;
}

export function LocaleProvider({
  children,
  initialLocale = getDefaultLocaleFromEnv()
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => getMessage(locale, key, params)
    }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** 读取持久化语言（供后续 layout  hydration 使用） */
export function getPersistedLocale(): Locale {
  return readStoredLocale();
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    const fallback = getDefaultLocaleFromEnv();
    return {
      locale: fallback,
      setLocale: () => {},
      t: (key, params) => getMessage(fallback, key, params)
    };
  }
  return ctx;
}
