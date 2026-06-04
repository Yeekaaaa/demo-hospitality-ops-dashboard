/** 支持的语言（默认中文） */
export type Locale = "zh-CN" | "en-US";

export const DEFAULT_LOCALE: Locale = "zh-CN";

export const SUPPORTED_LOCALES: readonly Locale[] = ["zh-CN", "en-US"] as const;

/** 嵌套字典树；叶子节点为文案字符串 */
export type MessageTree = {
  [key: string]: string | MessageTree;
};

export type MessageParams = Record<string, string | number>;
