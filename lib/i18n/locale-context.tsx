"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { getMessage } from "@/lib/i18n/get-message";
import type { MessageParams } from "@/lib/i18n/types";
import {
  getDefaultLocaleFromEnv,
  LOCALE_DEFAULT_SNAPSHOT_KEY,
  LOCALE_STORAGE_KEY,
  resolvePersistedLocale,
  SUPPORTED_LOCALES,
  type Locale
} from "@/lib/i18n/types";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: MessageParams) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function readAndSyncStoredLocale(envDefaultOverride?: Locale): Locale {
  const envDefault = envDefaultOverride ?? getDefaultLocaleFromEnv();
  if (typeof window === "undefined") return envDefault;

  try {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const storedSnapshot = window.localStorage.getItem(LOCALE_DEFAULT_SNAPSHOT_KEY);
    const resolved = resolvePersistedLocale({
      envDefault,
      storedLocale,
      storedSnapshot,
      isValidLocale: isLocale
    });

    if (storedSnapshot !== envDefault) {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, resolved);
      window.localStorage.setItem(LOCALE_DEFAULT_SNAPSHOT_KEY, envDefault);
    } else if (!storedLocale || !isLocale(storedLocale)) {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, resolved);
      if (storedSnapshot == null) {
        window.localStorage.setItem(LOCALE_DEFAULT_SNAPSHOT_KEY, envDefault);
      }
    }

    return resolved;
  } catch {
    return envDefault;
  }
}

function persistUserLocaleChoice(next: Locale): void {
  const envDefault = getDefaultLocaleFromEnv();
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    window.localStorage.setItem(LOCALE_DEFAULT_SNAPSHOT_KEY, envDefault);
  } catch {
    /* ignore */
  }
}

export function LocaleProvider({
  children,
  initialLocale = getDefaultLocaleFromEnv()
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window !== "undefined"
      ? readAndSyncStoredLocale(initialLocale)
      : initialLocale
  );

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      persistUserLocaleChoice(next);
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

/** 读取持久化语言（供后续 layout hydration 使用） */
export function getPersistedLocale(): Locale {
  return readAndSyncStoredLocale();
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
