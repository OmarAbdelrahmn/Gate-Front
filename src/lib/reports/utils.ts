/**
 * Format ISO UTC timestamp.
 * In Arabic, uses 'ar-SA-u-nu-latn' so month/day names are Arabic while digits remain English.
 */
export function formatGeneratedAt(
  isoString: string | null | undefined,
  locale: "ar" | "en" = "ar",
): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString(locale === "en" ? "en-US" : "ar-SA-u-nu-latn", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/**
 * Format inventory valuation as Saudi Riyals (SAR).
 * Preserves full decimal precision (never cast to integer).
 * Digits are always formatted as English (Western Arabic: 0-9) numbers.
 */
export function formatInventoryValue(
  amount: number | null | undefined,
  locale: "ar" | "en" = "ar",
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return locale === "en" ? "0.00 SAR" : "0.00 ر.س";
  }
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return locale === "en" ? `${formatted} SAR` : `${formatted} ر.س`;
}

/**
 * Format integer counts with comma thousands separators.
 * Digits are always formatted as English (Western Arabic: 0-9) numbers.
 */
export function formatCount(
  value: number | null | undefined,
  _locale?: "ar" | "en",
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0";
  }
  return value.toLocaleString("en-US");
}

export function formatPercentage(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || isNaN(rate)) return "0%";
  return `${Math.round(rate)}%`;
}
