/**
 * Hijri <-> Gregorian conversion utilities.
 * Follows the Saudi Umm al-Qura astronomical standard.
 */

export interface HijriDateParts {
  year: number;
  month: number;
  day: number;
}

export const HIJRI_MONTHS = [
  { number: 1, nameAr: "محرم", nameEn: "Muharram" },
  { number: 2, nameAr: "صفر", nameEn: "Safar" },
  { number: 3, nameAr: "ربيع الأول", nameEn: "Rabi' al-Awwal" },
  { number: 4, nameAr: "ربيع الآخر", nameEn: "Rabi' al-Thani" },
  { number: 5, nameAr: "جمادى الأولى", nameEn: "Jumada al-Ula" },
  { number: 6, nameAr: "جمادى الآخرة", nameEn: "Jumada al-Akhirah" },
  { number: 7, nameAr: "رجب", nameEn: "Rajab" },
  { number: 8, nameAr: "شعبان", nameEn: "Sha'ban" },
  { number: 9, nameAr: "رمضان", nameEn: "Ramadan" },
  { number: 10, nameAr: "شوال", nameEn: "Shawwal" },
  { number: 11, nameAr: "ذو القعدة", nameEn: "Dhu al-Qi'dah" },
  { number: 12, nameAr: "ذو الحجة", nameEn: "Dhu al-Hijjah" },
] as const;

let cachedFormatter: Intl.DateTimeFormat | null = null;

function getUmmAlQuraFormatter(): Intl.DateTimeFormat {
  if (!cachedFormatter) {
    cachedFormatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  return cachedFormatter;
}

function extractHijriParts(date: Date): HijriDateParts {
  const parts = getUmmAlQuraFormatter().formatToParts(date);
  let year = 1445;
  let month = 1;
  let day = 1;
  for (const p of parts) {
    if (p.type === "year") year = parseInt(p.value, 10);
    if (p.type === "month") month = parseInt(p.value, 10);
    if (p.type === "day") day = parseInt(p.value, 10);
  }
  return { year, month, day };
}

/**
 * Converts a Gregorian date string (YYYY-MM-DD) or Date object into Hijri { year, month, day }
 */
export function gregorianToHijri(gregorianDateStrOrObj: string | Date): HijriDateParts {
  let date: Date;
  if (typeof gregorianDateStrOrObj === "string") {
    const cleanStr = gregorianDateStrOrObj.slice(0, 10);
    date = new Date(`${cleanStr}T12:00:00Z`);
  } else {
    date = new Date(Date.UTC(
      gregorianDateStrOrObj.getUTCFullYear(),
      gregorianDateStrOrObj.getUTCMonth(),
      gregorianDateStrOrObj.getUTCDate(),
      12, 0, 0
    ));
  }

  if (isNaN(date.getTime())) {
    const today = new Date();
    date = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0));
  }

  try {
    return extractHijriParts(date);
  } catch {
    // Algorithmic fallback
    return kuwaitiGregorianToHijri(date);
  }
}

/**
 * Converts a Hijri date (year, month, day) into a Gregorian date string: "YYYY-MM-DD".
 */
export function hijriToGregorian(hYear: number, hMonth: number, hDay: number): string {
  const safeYear = Math.max(1300, Math.min(1600, Math.round(hYear) || 1447));
  const safeMonth = Math.max(1, Math.min(12, Math.round(hMonth) || 1));
  const safeDay = Math.max(1, Math.min(30, Math.round(hDay) || 1));

  try {
    const approxGYear = Math.round(safeYear * 0.970229 + 621.57);
    let date = new Date(Date.UTC(approxGYear, 0, 1, 12, 0, 0));
    let curH = extractHijriParts(date);
    let diffDays = Math.round(
      (safeYear - curH.year) * 354.36 + (safeMonth - curH.month) * 29.53 + (safeDay - curH.day)
    );
    date = new Date(date.getTime() + diffDays * 86400000);

    let bestDate = date;
    let minDiff = 999999;

    for (let i = 0; i < 40; i++) {
      curH = extractHijriParts(date);
      if (curH.year === safeYear && curH.month === safeMonth && curH.day === safeDay) {
        return date.toISOString().slice(0, 10);
      }

      const error =
        Math.abs(curH.year - safeYear) * 400 +
        Math.abs(curH.month - safeMonth) * 32 +
        Math.abs(curH.day - safeDay);

      if (error < minDiff) {
        minDiff = error;
        bestDate = date;
      }

      const dayDiff = Math.round(
        (safeYear - curH.year) * 354.36 + (safeMonth - curH.month) * 29.53 + (safeDay - curH.day)
      );

      if (dayDiff === 0) {
        if (
          curH.year > safeYear ||
          (curH.year === safeYear &&
            (curH.month > safeMonth ||
              (curH.month === safeMonth && curH.day > safeDay)))
        ) {
          date = new Date(date.getTime() - 86400000);
        } else {
          date = new Date(date.getTime() + 86400000);
        }
      } else {
        date = new Date(
          date.getTime() + (dayDiff > 0 ? Math.max(1, dayDiff) : Math.min(-1, dayDiff)) * 86400000
        );
      }
    }

    return bestDate.toISOString().slice(0, 10);
  } catch {
    return kuwaitiHijriToGregorian(safeYear, safeMonth, safeDay);
  }
}

/**
 * Format a Hijri date nicely for UI presentation.
 */
export function formatHijriDate(
  parts: HijriDateParts,
  locale: "ar" | "en" = "ar"
): string {
  const monthInfo = HIJRI_MONTHS.find((m) => m.number === parts.month) || HIJRI_MONTHS[0];
  const monthName = locale === "en" ? monthInfo.nameEn : monthInfo.nameAr;
  const suffix = locale === "en" ? "AH" : "هـ";
  return `${parts.day} ${monthName} ${parts.year} ${suffix}`;
}

// ---- Pure Algorithmic Fallback (Kuwaiti algorithm) ----
function kuwaitiGregorianToHijri(date: Date): HijriDateParts {
  let day = date.getUTCDate();
  let month = date.getUTCMonth();
  let year = date.getUTCFullYear();

  let m = month + 1;
  let y = year;
  if (m < 3) {
    y -= 1;
    m += 12;
  }

  let a = Math.floor(y / 100);
  let b = 2 - a + Math.floor(a / 4);
  if (y < 1583) b = 0;

  let jd =
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    b -
    1524;

  let z = jd - 1948440 + 10632;
  let n = Math.floor((z - 1) / 10631);
  z = z - 10631 * n + 354;
  let j =
    Math.floor((10985 - z) / 5316) * Math.floor((50 * z) / 17719) +
    Math.floor(z / 5670) * Math.floor((43 * z) / 15238);
  z =
    z -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;

  let hMonth = Math.floor((24 * z) / 709);
  let hDay = z - Math.floor((709 * hMonth) / 24);
  let hYear = 30 * n + j - 30;

  return { year: hYear, month: hMonth, day: hDay };
}

function kuwaitiHijriToGregorian(hYear: number, hMonth: number, hDay: number): string {
  let jd =
    Math.floor((11 * hYear + 3) / 30) +
    354 * hYear +
    30 * hMonth -
    Math.floor((hMonth - 1) / 2) +
    hDay +
    1948440 -
    385;

  let l = jd + 68569;
  let n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  let i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  let j = Math.floor((80 * l) / 2447);
  let d = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  let m = j + 2 - 12 * l;
  let y = 100 * (n - 49) + i + l;

  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}
