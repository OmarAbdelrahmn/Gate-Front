import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size,
  loading,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const styles: Record<Variant, string> = {
    primary: "bg-[#1167c9] text-white hover:bg-[#0b55a8] shadow-sm",
    secondary: "border border-[#dbe4f0] bg-white text-[#17345b] hover:bg-[#f1f6fc]",
    ghost: "text-[#536580] hover:bg-[#edf4fc]",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  const sizeStyles: Record<Size, string> = {
    sm: "min-h-8 px-2.5 text-xs rounded-lg",
    md: "min-h-10 px-3.5 text-sm rounded-xl",
    lg: "min-h-11 px-4 text-sm rounded-xl",
  };

  const defaultSizeStyle = size ? sizeStyles[size] : "min-h-11 px-4 text-sm rounded-xl";

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-bold disabled:cursor-not-allowed disabled:opacity-50 ${defaultSizeStyle} ${styles[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={17} className="animate-spin" />}
      {children}
    </button>
  );
}
