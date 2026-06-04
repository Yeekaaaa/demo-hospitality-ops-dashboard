/** 支持的语言（默认中文） */
export type Locale = "zh-CN" | "en-US";

export const DEFAULT_LOCALE: Locale = "zh-CN";

export const SUPPORTED_LOCALES: readonly Locale[] = ["zh-CN", "en-US"] as const;

const ENV_DEFAULT_LOCALE_KEY = "NEXT_PUBLIC_DEFAULT_LOCALE";

/** 构建时读取的默认语言（Vercel / .env）；非法或缺失时回退 zh-CN */
export function getDefaultLocaleFromEnv(): Locale {
  const raw = process.env[ENV_DEFAULT_LOCALE_KEY]?.trim();
  if (raw === "zh-CN" || raw === "en-US") return raw;
  return DEFAULT_LOCALE;
}

/** 嵌套字典树；叶子节点为文案字符串 */
export type MessageTree = {
  [key: string]: string | MessageTree;
};

export type MessageParams = Record<string, string | number>;
