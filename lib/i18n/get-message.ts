import { enUSMessages } from "@/lib/i18n/messages/en-US";
import { zhCNMessages } from "@/lib/i18n/messages/zh-CN";
import type { Locale, MessageParams, MessageTree } from "@/lib/i18n/types";
import { DEFAULT_LOCALE } from "@/lib/i18n/types";

const DICTIONARIES: Record<Locale, MessageTree> = {
  "zh-CN": zhCNMessages,
  "en-US": enUSMessages
};

function resolvePath(tree: MessageTree, path: string): string | undefined {
  const parts = path.split(".").filter(Boolean);
  let node: string | MessageTree = tree;

  for (const part of parts) {
    if (typeof node !== "object" || node == null || !(part in node)) {
      return undefined;
    }
    node = node[part]!;
  }

  return typeof node === "string" ? node : undefined;
}

function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value == null ? `{${key}}` : String(value);
  });
}

/**
 * 按 locale 与点路径取文案；en-US 缺失时回退 zh-CN，仍缺失则返回 key
 */
export function getMessage(
  locale: Locale,
  key: string,
  params?: MessageParams
): string {
  const primary = resolvePath(DICTIONARIES[locale], key);
  if (primary != null && primary !== "") {
    return interpolate(primary, params);
  }

  if (locale !== DEFAULT_LOCALE) {
    const fallback = resolvePath(DICTIONARIES[DEFAULT_LOCALE], key);
    if (fallback != null && fallback !== "") {
      return interpolate(fallback, params);
    }
  }

  return key;
}

/** 默认 locale 的简写 */
export function t(key: string, params?: MessageParams): string {
  return getMessage(DEFAULT_LOCALE, key, params);
}

export function getDictionary(locale: Locale): MessageTree {
  return DICTIONARIES[locale];
}
