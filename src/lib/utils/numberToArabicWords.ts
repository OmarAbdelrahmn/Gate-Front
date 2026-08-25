/**
 * Utility to convert numeric amounts to formal Arabic words (Tafreet).
 * Example: 15000 -> خمسة عشر ألف ريال سعودي لا غير
 * Example: 1500.50 -> ألف وخمسمائة ريال سعودي وخمسون هللة لا غير
 */
export function tafreetArabicNumber(amount: number | string, includeSuffix: boolean = true): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) return includeSuffix ? "صفر ريال سعودي لا غير" : "صفر";

  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const teens = [
    "عشرة",
    "أحد عشر",
    "اثنا عشر",
    "ثلاثة عشر",
    "أربعة عشر",
    "خمسة عشر",
    "ستة عشر",
    "سبعة عشر",
    "ثمانية عشر",
    "تسعة عشر",
  ];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

  function convertGroup(n: number): string {
    let result = "";
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    const t = Math.floor(remainder / 10);
    const o = remainder % 10;

    if (h > 0) {
      result += hundreds[h];
    }

    if (remainder > 0) {
      if (result !== "") result += " و";
      if (remainder < 10) {
        result += ones[remainder];
      } else if (remainder >= 10 && remainder < 20) {
        result += teens[remainder - 10];
      } else {
        if (o > 0) {
          result += ones[o] + " و" + tens[t];
        } else {
          result += tens[t];
        }
      }
    }

    return result;
  }

  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);

  const parts: string[] = [];

  const millions = Math.floor(intPart / 1000000);
  const thousands = Math.floor((intPart % 1000000) / 1000);
  const units = intPart % 1000;

  if (millions > 0) {
    if (millions === 1) parts.push("مليون");
    else if (millions === 2) parts.push("مليونان");
    else if (millions >= 3 && millions <= 10) parts.push(convertGroup(millions) + " ملايين");
    else parts.push(convertGroup(millions) + " مليون");
  }

  if (thousands > 0) {
    if (thousands === 1) parts.push("ألف");
    else if (thousands === 2) parts.push("ألفان");
    else if (thousands >= 3 && thousands <= 10) parts.push(convertGroup(thousands) + " آلاف");
    else parts.push(convertGroup(thousands) + " ألف");
  }

  if (units > 0) {
    parts.push(convertGroup(units));
  }

  let text = parts.join(" و");
  if (!text) text = "صفر";

  if (!includeSuffix) {
    if (decPart > 0) {
      return text + " و" + convertGroup(decPart) + " هللة";
    }
    return text;
  }

  let resultString = text + " ريال سعودي";

  if (decPart > 0) {
    resultString += " و" + convertGroup(decPart) + " هللة";
  }

  resultString += " لا غير";

  return resultString;
}
