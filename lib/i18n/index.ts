export { getDictionary, getMessage, t } from "@/lib/i18n/get-message";
export { LocaleProvider, getPersistedLocale, useLocale } from "@/lib/i18n/locale-context";
export { enUSMessages } from "@/lib/i18n/messages/en-US";
export { zhCNMessages } from "@/lib/i18n/messages/zh-CN";
export {
  DEFAULT_LOCALE,
  getDefaultLocaleFromEnv,
  readDefaultLocaleFromDocument,
  LOCALE_DEFAULT_SNAPSHOT_KEY,
  LOCALE_STORAGE_KEY,
  resolvePersistedLocale,
  SUPPORTED_LOCALES,
  type Locale,
  type MessageParams,
  type MessageTree
} from "@/lib/i18n/types";
