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

/**
 * Returns current calendar date in Riyadh (UTC+03:00) formatted as YYYY-MM-DD.
 */
export function getRiyadhTodayDate(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Returns the first day of the current month in Riyadh (UTC+03:00) formatted as YYYY-MM-01.
 */
export function getRiyadhFirstDayOfMonth(): string {
  const today = getRiyadhTodayDate();
  return `${today.substring(0, 7)}-01`;
}

/**
 * Format ISO UTC or offset timestamp in Riyadh time (UTC+03:00).
 * Handles explicit offsets (+03:00 or Z) without assuming zero offset.
 */
export function formatRiyadhDateTime(
  isoString: string | null | undefined,
  locale: "ar" | "en" = "ar",
): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString(locale === "en" ? "en-US" : "ar-SA-u-nu-latn", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

/**
 * Format SAR currency for reports.
 * Per specification:
 * - When amount is null, display a missing-rate label ("لا توجد تسعيرة") rather than zero.
 * - Digits are formatted with 2 decimal places.
 */
export function formatSarAmount(
  amount: number | null | undefined,
  missingLabel: string = "لا توجد تسعيرة",
): string {
  if (amount === null || amount === undefined) {
    return missingLabel;
  }
  const num = typeof amount === "number" ? amount : Number(amount);
  if (isNaN(num)) {
    return missingLabel;
  }
  return `${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ر.س`;
}

/**
 * Returns a rounded number to 2 decimal places for SAR amounts (useful in Excel exports).
 */
export function formatSarNumber(amount: number | null | undefined): number | null {
  if (amount === null || amount === undefined) return null;
  const num = typeof amount === "number" ? amount : Number(amount);
  if (isNaN(num)) return null;
  return Number(num.toFixed(2));
}

/**
 * Convert days count to 1 decimal place (e.g., 10490.2) without extraneous trailing digits.
 */
export function formatDaysNumber(days: number | null | undefined): number {
  if (days === null || days === undefined) return 0;
  const num = typeof days === "number" ? days : Number(days);
  if (isNaN(num)) return 0;
  return Number((Math.floor((num + 0.00001) * 10) / 10).toFixed(1));
}

/**
 * Format days count for period reports.
 * Formats days to 1 decimal place (e.g., 10490.2) without extraneous trailing digits.
 */
export function formatDays(days: number | null | undefined): string {
  if (days === null || days === undefined) return "0 يوم";
  const num = typeof days === "number" ? days : Number(days);
  if (isNaN(num)) return "0 يوم";
  return `${formatDaysNumber(num)} يوم`;
}

