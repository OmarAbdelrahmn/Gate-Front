export type NationalityOption = {
  value: string;
  labelAr: string;
  labelEn: string;
};

export const NATIONALITIES: NationalityOption[] = [
  { value: "سعودي", labelAr: "سعودي", labelEn: "Saudi" },
  { value: "مصري", labelAr: "مصري", labelEn: "Egyptian" },
  { value: "هندي", labelAr: "هندي", labelEn: "Indian" },
  { value: "باكستاني", labelAr: "باكستاني", labelEn: "Pakistani" },
  { value: "بنغلاديشي", labelAr: "بنغلاديشي", labelEn: "Bangladeshi" },
  { value: "يمني", labelAr: "يمني", labelEn: "Yemeni" },
  { value: "سوداني", labelAr: "سوداني", labelEn: "Sudanese" },
  { value: "سوري", labelAr: "سوري", labelEn: "Syrian" },
  { value: "أردني", labelAr: "أردني", labelEn: "Jordanian" },
  { value: "لبناني", labelAr: "لبناني", labelEn: "Lebanese" },
  { value: "فلسطيني", labelAr: "فلسطيني", labelEn: "Palestinian" },
  { value: "مغربي", labelAr: "مغربي", labelEn: "Moroccan" },
  { value: "تونسي", labelAr: "تونسي", labelEn: "Tunisian" },
  { value: "جزائري", labelAr: "جزائري", labelEn: "Algerian" },
  { value: "نيبالي", labelAr: "نيبالي", labelEn: "Nepalese" },
  { value: "سريلانكي", labelAr: "سريلانكي", labelEn: "Sri Lankan" },
  { value: "فلبيني", labelAr: "فلبيني", labelEn: "Filipino" },
  { value: "إندونيسي", labelAr: "إندونيسي", labelEn: "Indonesian" },
  { value: "إثيوبي", labelAr: "إثيوبي", labelEn: "Ethiopian" },
  { value: "أوغندي", labelAr: "أوغندي", labelEn: "Ugandan" },
  { value: "كيني", labelAr: "كيني", labelEn: "Kenyan" },
  { value: "غاني", labelAr: "غاني", labelEn: "Ghanaian" },
  { value: "نيجيري", labelAr: "نيجيري", labelEn: "Nigerian" },
  { value: "صومالي", labelAr: "صومالي", labelEn: "Somali" },
  { value: "موريتاني", labelAr: "موريتاني", labelEn: "Mauritanian" },
  { value: "تشادي", labelAr: "تشادي", labelEn: "Chadian" },
  { value: "تركي", labelAr: "تركي", labelEn: "Turkish" },
  { value: "عراقي", labelAr: "عراقي", labelEn: "Iraqi" },
  { value: "كويتي", labelAr: "كويتي", labelEn: "Kuwaiti" },
  { value: "إماراتي", labelAr: "إماراتي", labelEn: "Emirati" },
  { value: "عماني", labelAr: "عماني", labelEn: "Omani" },
  { value: "بحريني", labelAr: "بحريني", labelEn: "Bahraini" },
  { value: "قطري", labelAr: "قطري", labelEn: "Qatari" },
  { value: "أفغاني", labelAr: "أفغاني", labelEn: "Afghan" },
  { value: "برمي", labelAr: "برمي / ميانمار", labelEn: "Burmese / Myanmar" },
  { value: "أمريكي", labelAr: "أمريكي", labelEn: "American" },
  { value: "بريطاني", labelAr: "بريطاني", labelEn: "British" },
  { value: "كندي", labelAr: "كندي", labelEn: "Canadian" },
  { value: "أخرى", labelAr: "جنسية أخرى", labelEn: "Other" },
];

export function getNationalityOptions(locale: "ar" | "en" = "ar", currentValue?: unknown) {
  const options = NATIONALITIES.map((n) => ({
    value: n.value,
    label: locale === "en" ? n.labelEn : n.labelAr,
    sublabel: locale === "en" ? n.labelAr : n.labelEn,
    keywords: `${n.labelAr} ${n.labelEn} ${n.value}`,
  }));

  const valStr = String(currentValue ?? "").trim();
  if (valStr && !options.some((o) => o.value === valStr || o.label === valStr)) {
    options.unshift({
      value: valStr,
      label: valStr,
      sublabel: locale === "en" ? "Custom Value" : "قيمة حالية",
      keywords: valStr,
    });
  }

  return options;
}
