"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

export function Input({
  label,
  className = "",
  required = false,
  type,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <label className="field-shell grid gap-2 text-sm font-bold text-inherit">
      {label && (
        <span className="flex items-center justify-between gap-3">
          <span>{label}</span>
          <span className={required ? "field-required" : "field-optional"} aria-hidden="true">
            {required ? "مطلوب" : "اختياري"}
          </span>
        </span>
      )}
      <div className="relative flex items-center w-full">
        <input
          required={required}
          aria-required={required || undefined}
          type={inputType}
          className={`h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 font-normal text-[var(--foreground)] outline-none placeholder:text-slate-400 focus:border-[#1167c9] focus:ring-4 focus:ring-blue-100 text-start ${
            isPassword ? "pe-10" : ""
          } ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            className="absolute top-1/2 -translate-y-1/2 end-3 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[var(--foreground)] dark:hover:bg-slate-800 focus:outline-none transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </label>
  );
}

