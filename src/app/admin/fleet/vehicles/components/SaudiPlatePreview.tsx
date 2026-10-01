"use client";

import React from "react";

interface Props {
  digits: string;
  lettersAr: string;
  lettersEn: string;
  registrationType?: "public" | "private";
  label?: string;
}

export function SaudiPlatePreview({
  digits,
  lettersAr,
  lettersEn,
  registrationType = "public",
  label = "معاينة لوحة النقل العام الرسمية (Live Plate Preview)",
}: Props) {
  const displayDigitsAr = digits || "----";
  const displayDigitsEn = digits || "----";
  const displayLettersAr = lettersAr || "---";
  const displayLettersEn = lettersEn || "---";

  const isPublic = registrationType === "public";

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
          <span>{label}</span>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-normal">
            {isPublic ? "لوحة نقل عام (شريط أصفر)" : "لوحة خصوصي (شريط أبيض)"}
          </span>
        </div>
      )}

      {/* Plate Frame */}
      <div className="relative mx-auto w-full max-w-md rounded-xl border-4 border-slate-900 bg-white p-2.5 shadow-md select-none text-slate-900 transition-all font-mono">
        <div className="flex items-stretch justify-between rounded-lg border-2 border-slate-900 overflow-hidden bg-slate-50/20 min-h-[96px]">
          
          {/* Main Content Area (Arabic on top, English on bottom) */}
          <div className="flex-1 flex flex-col justify-between py-1.5 px-4 divide-y-2 divide-slate-900">
            {/* Arabic Half (Top) */}
            <div className="flex items-center justify-between pb-1.5" dir="rtl">
              <span className="text-xl sm:text-2xl font-black tracking-widest text-slate-950 font-sans">
                {displayLettersAr}
              </span>
              <span className="text-xl sm:text-2xl font-black tracking-widest text-slate-950">
                {displayDigitsAr}
              </span>
            </div>

            {/* English Half (Bottom) */}
            <div className="flex items-center justify-between pt-1.5" dir="ltr">
              <span className="text-lg sm:text-xl font-black tracking-widest text-slate-950">
                {displayDigitsEn}
              </span>
              <span className="text-lg sm:text-xl font-black tracking-widest text-slate-950">
                {displayLettersEn}
              </span>
            </div>
          </div>

          {/* Right Stripe (Saudi Arabia emblem & type strip) */}
          <div
            className={`w-14 sm:w-16 flex flex-col items-center justify-between py-2 border-r-2 border-slate-900 text-center ${
              isPublic
                ? "bg-amber-400 text-slate-950 font-bold"
                : "bg-slate-100 text-slate-900"
            }`}
          >
            {/* KSA Emblem / Text */}
            <div className="text-[10px] sm:text-xs font-black leading-tight tracking-wider">
              KSA
            </div>
            
            {/* Transport indicator */}
            <div className="my-auto flex flex-col items-center justify-center">
              <div className="h-4 w-4 rounded-full border border-slate-900 flex items-center justify-center text-[9px] font-black">
                {isPublic ? "ن" : "خ"}
              </div>
              <span className="text-[9px] font-bold mt-0.5">
                {isPublic ? "نقل عام" : "خصوصي"}
              </span>
            </div>

            {/* Arabic country text */}
            <div className="text-[10px] font-black leading-tight tracking-tighter">
              السعودية
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
