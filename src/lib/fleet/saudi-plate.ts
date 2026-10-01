/**
 * Saudi License Plate Utilities & Transliteration
 * 
 * Standard letters authorized by the Saudi Traffic Directorate (المرور السعودي)
 * for vehicle license plates.
 */

export const SAUDI_AR_TO_EN_LETTERS: Record<string, string> = {
  "أ": "A",
  "ا": "A",
  "إ": "A",
  "آ": "A",
  "ب": "B",
  "ح": "J",
  "د": "D",
  "ر": "R",
  "س": "S",
  "ص": "X",
  "ط": "T",
  "ع": "E",
  "ق": "G",
  "ك": "K",
  "ل": "L",
  "م": "Z",
  "ن": "N",
  "ه": "H",
  "هـ": "H",
  "ة": "H",
  "و": "U",
  "ي": "V",
  "ى": "V",
};

export const SAUDI_EN_TO_AR_LETTERS: Record<string, string> = {
  A: "أ",
  B: "ب",
  J: "ح",
  D: "د",
  R: "ر",
  S: "س",
  X: "ص",
  T: "ط",
  E: "ع",
  G: "ق",
  K: "ك",
  L: "ل",
  Z: "م",
  N: "ن",
  H: "هـ",
  U: "و",
  V: "ى",
};

/**
 * Filter input to accept only numeric digits (0-9), max 4 characters.
 */
export function sanitizePlateDigits(val: string): string {
  if (!val) return "";
  return val.replace(/\D/g, "").slice(0, 4);
}

/**
 * Filter input to accept only Arabic alphabet characters and single spaces.
 */
export function sanitizePlateLettersAr(val: string): string {
  if (!val) return "";
  // Keep only Arabic letters and spaces
  return val
    .replace(/[^\u0621-\u064A\s]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 7);
}

/**
 * Filter input to accept only English alphabet characters (A-Z) and single spaces, uppercase.
 */
export function sanitizePlateLettersEn(val: string): string {
  if (!val) return "";
  return val
    .replace(/[^a-zA-Z\s]/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase()
    .slice(0, 7);
}

/**
 * Converts Arabic plate letters to English plate letters based on Saudi standard.
 * Automatically inserts a space between letters for standard readability.
 */
export function transliteratePlateArToEn(arabicLetters: string): string {
  if (!arabicLetters) return "";
  // Extract individual Arabic letters
  const chars = arabicLetters.replace(/\s+/g, "").split("");
  const mapped = chars.map((ch) => SAUDI_AR_TO_EN_LETTERS[ch] || "").filter(Boolean);
  return mapped.join(" ");
}

/**
 * Construct full Arabic and English plate string representations from components.
 */
export function buildPlateStrings(
  digits: string,
  lettersAr: string,
  lettersEn: string,
  options?: {
    arabicFormat?: "digits-first" | "letters-first";
    englishFormat?: "digits-first" | "letters-first";
  }
): { plateNumberAr: string; plateNumberEn: string } {
  const cleanDigits = sanitizePlateDigits(digits);
  const cleanAr = sanitizePlateLettersAr(lettersAr).trim();
  const cleanEn = sanitizePlateLettersEn(lettersEn).trim();

  const arFormat = options?.arabicFormat || "digits-first";
  const enFormat = options?.englishFormat || "digits-first";

  let plateNumberAr = "";
  if (cleanDigits && cleanAr) {
    plateNumberAr = arFormat === "digits-first" ? `${cleanDigits} ${cleanAr}` : `${cleanAr} ${cleanDigits}`;
  } else {
    plateNumberAr = cleanDigits || cleanAr;
  }

  let plateNumberEn = "";
  if (cleanDigits && cleanEn) {
    plateNumberEn = enFormat === "digits-first" ? `${cleanDigits} ${cleanEn}` : `${cleanEn} ${cleanDigits}`;
  } else {
    plateNumberEn = cleanDigits || cleanEn;
  }

  return { plateNumberAr, plateNumberEn };
}
