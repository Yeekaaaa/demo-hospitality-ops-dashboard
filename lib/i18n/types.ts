/** 支持的语言（默认中文） */
export type Locale = "zh-CN" | "en-US";

export const DEFAULT_LOCALE: Locale = "zh-CN";

export const SUPPORTED_LOCALES: readonly Locale[] = ["zh-CN", "en-US"] as const;

const ENV_DEFAULT_LOCALE_KEY = "NEXT_PUBLIC_DEFAULT_LOCALE";

function localeFromEnvString(raw: string | undefined): Locale | null {
  const trimmed = raw?.trim();
  if (trimmed === "zh-CN" || trimmed === "en-US") return trimmed;
  return null;
}

/** 浏览器端优先读 <html data-default-locale>（与根 layout 部署配置一致） */
export function readDefaultLocaleFromDocument(): Locale | null {
  if (typeof document === "undefined") return null;
  return localeFromEnvString(document.documentElement.getAttribute("data-default-locale") ?? undefined);
}

/** 默认语言：客户端以 html data 为准，服务端/构建时读 NEXT_PUBLIC_DEFAULT_LOCALE */
export function getDefaultLocaleFromEnv(): Locale {
  const fromDom = readDefaultLocaleFromDocument();
  if (fromDom) return fromDom;

  const fromEnv = localeFromEnvString(process.env[ENV_DEFAULT_LOCALE_KEY]);
  if (fromEnv) return fromEnv;

  return DEFAULT_LOCALE;
}

/** localStorage：用户选择的语言 */
export const LOCALE_STORAGE_KEY = "fengtin-locale";

/** localStorage：写入用户选择时对应的 env 默认语言快照 */
export const LOCALE_DEFAULT_SNAPSHOT_KEY = "fengtin-locale-default-snapshot";

/**
 * 解析持久化语言：env 默认变更时丢弃旧 locale；否则沿用用户手动选择。
 */
export function resolvePersistedLocale(params: {
  envDefault: Locale;
  storedLocale: string | null;
  storedSnapshot: string | null;
  isValidLocale: (value: string) => value is Locale;
}): Locale {
  const { envDefault, storedLocale, storedSnapshot, isValidLocale } = params;

  if (storedSnapshot !== envDefault) {
    return envDefault;
  }

  if (storedLocale && isValidLocale(storedLocale)) {
    return storedLocale;
  }

  return envDefault;
}

/** 嵌套字典树；叶子节点为文案字符串 */
export type MessageTree = {
  [key: string]: string | MessageTree;
};

export type MessageParams = Record<string, string | number>;
