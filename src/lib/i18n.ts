import ar from "../locales/ar.json";
import en from "../locales/en.json";

export type AppLocale = "ar" | "en";
const messages = { ar, en } as const;

export function translate(locale: AppLocale, key: string): string {
  const value = key.split(".").reduce<unknown>((current, segment) => current && typeof current === "object" ? (current as Record<string, unknown>)[segment] : undefined, messages[locale]);
  return typeof value === "string" ? value : key;
}

export function getMessages(locale: AppLocale) {
  return messages[locale];
}
