/**
 * Normalizes Arabic text and general strings for robust search and filtering.
 *
 * Capabilities:
 * - Converts to lower case
 * - Converts Arabic-Indic and Eastern-Arabic digits (٠-٩, ۰-۹) to standard digits (0-9)
 * - Removes Arabic diacritics / tashkeel (fatha, damma, kasra, sukun, shadda, tanween, dagger alif)
 * - Removes tatweel / kashida (ـ)
 * - Normalizes Alef variants: أ, إ, آ, ٱ -> ا
 * - Normalizes Alef Maksura: ى -> ي
 * - Normalizes Teh Marbuta: ة -> ه
 * - Trims and cleans whitespace
 */
export function normalizeArabicText(text: string | null | undefined): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // Diacritics (tashkeel)
    .replace(/\u0640/g, "") // Tatweel
    .replace(/[أإآٱ]/g, "ا") // Alef normalization (e.g. إداري -> اداري)
    .replace(/ى/g, "ي") // Alef Maksura to Yeh (e.g. على -> علي)
    .replace(/ة/g, "ه") // Teh Marbuta to Heh (e.g. إجازة -> اجازه)
    .replace(/[٠۰]/g, "0")
    .replace(/[١۱]/g, "1")
    .replace(/[٢۲]/g, "2")
    .replace(/[٣۳]/g, "3")
    .replace(/[٤۴]/g, "4")
    .replace(/[٥۵]/g, "5")
    .replace(/[٦۶]/g, "6")
    .replace(/[٧۷]/g, "7")
    .replace(/[٨۸]/g, "8")
    .replace(/[٩۹]/g, "9")
    .trim();
}

/**
 * Matches a query against one or multiple candidate values using normalized Arabic comparison.
 * Every word in the search query must be matched in the combined normalized targets.
 */
export function matchesArabicSearch(
  query: string | null | undefined,
  ...targets: (string | number | boolean | null | undefined | unknown)[]
): boolean {
  const normalizedQuery = normalizeArabicText(query);
  if (!normalizedQuery) return true;

  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
  if (queryWords.length === 0) return true;

  const combinedNormalizedText = targets
    .map((item) => (item !== null && item !== undefined ? normalizeArabicText(String(item)) : ""))
    .filter(Boolean)
    .join(" ");

  return queryWords.every((word) => combinedNormalizedText.includes(word));
}
