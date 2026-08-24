import labelsAr from "../locales/permissions.ar.json";
import labelsEn from "../locales/permissions.en.json";
import type { AppLocale } from "./i18n";

export function permissionLabel(permissionKey: string, locale: AppLocale = "ar") {
  const labels = locale === "en" ? labelsEn : labelsAr;
  return (labels as Record<string, string>)[permissionKey] ?? permissionKey;
}

