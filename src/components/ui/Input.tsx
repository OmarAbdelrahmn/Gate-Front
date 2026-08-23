import type { InputHTMLAttributes } from "react";

export function Input({ label, className = "", required = false, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
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
      <input required={required} aria-required={required || undefined} className={`h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 font-normal text-[var(--foreground)] outline-none placeholder:text-slate-400 focus:border-[#1167c9] focus:ring-4 focus:ring-blue-100 ${className}`} {...props}/>
    </label>
  );
}
