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

/** 缺失、null、undefined、纯空白均视为不可用 */
function isUsableMessage(value: string | undefined | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value == null ? `{${key}}` : String(value);
  });
}

function renderTemplate(
  template: string | undefined,
  params?: MessageParams
): string | undefined {
  if (!isUsableMessage(template)) return undefined;
  const rendered = interpolate(template, params);
  return isUsableMessage(rendered) ? rendered : undefined;
}

/**
 * 按 locale 与点路径取文案；en-US 缺失或空串时回退 zh-CN，仍缺失则返回 key（永不返回空串）
 */
export function getMessage(
  locale: Locale,
  key: string,
  params?: MessageParams
): string {
  const primary = renderTemplate(resolvePath(DICTIONARIES[locale], key), params);
  if (primary) return primary;

  if (locale !== DEFAULT_LOCALE) {
    const fallback = renderTemplate(resolvePath(DICTIONARIES[DEFAULT_LOCALE], key), params);
    if (fallback) return fallback;
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
