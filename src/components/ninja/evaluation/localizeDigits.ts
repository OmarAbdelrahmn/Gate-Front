/** Always format numbers with English digits (0-9) across Ninja Evaluation. */
export function localizeDigits(value: string | number | null | undefined, _locale?: "ar" | "en"): string {
  if (value === null || value === undefined) return "";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return String(value).replace(/[٠-٩]/g, (digit) => {
    const index = arabic.indexOf(digit);
    return index >= 0 ? String(index) : digit;
  });
}
