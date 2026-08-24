"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, ChevronDown, ChevronUp } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  status?: number;
  details?: any;
  duration?: number;
}

type ToastListener = (toast: ToastItem) => void;

let listeners: ToastListener[] = [];
let lastToastMap: Record<string, number> = {};

export const toast = {
  show: (type: ToastType, title: string, message?: string, options?: { status?: number; details?: any; duration?: number }) => {
    const key = `${type}:${title}:${message || ""}`;
    const now = Date.now();
    // Ignore duplicate toast within 3 seconds window
    if (lastToastMap[key] && now - lastToastMap[key] < 3000) {
      return "";
    }
    lastToastMap[key] = now;

    const item: ToastItem = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      message,
      status: options?.status,
      details: options?.details,
      duration: options?.duration ?? 4500,
    };
    listeners.forEach((l) => l(item));
    return item.id;
  },
  success: (title: string, message?: string, options?: { status?: number; details?: any; duration?: number }) =>
    toast.show("success", title, message, options),
  error: (title: string, message?: string, options?: { status?: number; details?: any; duration?: number }) =>
    toast.show("error", title, message, options),
  warning: (title: string, message?: string, options?: { status?: number; details?: any; duration?: number }) =>
    toast.show("warning", title, message, options),
  info: (title: string, message?: string, options?: { status?: number; details?: any; duration?: number }) =>
    toast.show("info", title, message, options),
  
  /**
   * Helper to inspect API response or error object and display toast with full details
   */
  handleResponse: (
    errOrRes: any,
    fallbackSuccessMsg = "تمت العملية بنجاح",
    fallbackErrorMsg = "حدث خطأ أثناء تنفيذ الطلب"
  ) => {
    if (!errOrRes) {
      return toast.success("تم بنجاح", fallbackSuccessMsg);
    }
    if (errOrRes instanceof Error || (typeof errOrRes === "object" && "status" in errOrRes && errOrRes.status >= 400)) {
      const status = errOrRes.status || errOrRes.statusCode || 500;
      const msg = errOrRes.message || errOrRes.details?.message || fallbackErrorMsg;
      return toast.error("تنبيه من النظام", msg, {
        status,
        details: errOrRes.details || errOrRes,
      });
    }
    const msg = typeof errOrRes === "string" ? errOrRes : errOrRes?.message || fallbackSuccessMsg;
    return toast.success("تم بنجاح", msg, {
      details: typeof errOrRes === "object" ? errOrRes : undefined,
    });
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleAdd = (item: ToastItem) => {
      if (!item || !item.id) return;
      setToasts((prev) => {
        // Prevent duplicate toast if message matches existing active toast
        const isDuplicate = prev.some(
          (t) => t.type === item.type && t.message === item.message && t.title === item.title
        );
        if (isDuplicate) return prev;
        return [item, ...prev.slice(0, 1)]; // Show max 2 toasts at a time
      });
    };
    listeners.push(handleAdd);
    return () => {
      listeners = listeners.filter((l) => l !== handleAdd);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {children}
      <div
        dir="rtl"
        aria-live="polite"
        className="fixed bottom-5 left-5 z-[9999] flex max-w-md w-[calc(100vw-2.5rem)] flex-col gap-2.5 pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </>
  );
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (item.duration && item.duration > 0) {
      const timer = setTimeout(onClose, item.duration);
      return () => clearTimeout(timer);
    }
  }, [item.duration, onClose]);

  const styles = {
    success: {
      bg: "bg-slate-900/95 border-emerald-500/40 text-slate-100",
      accent: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
      icon: CheckCircle2,
      badge: "bg-emerald-500/20 text-emerald-300",
    },
    error: {
      bg: "bg-slate-900/95 border-red-500/40 text-slate-100",
      accent: "text-red-400 bg-red-500/10 border border-red-500/20",
      icon: AlertCircle,
      badge: "bg-red-500/20 text-red-300",
    },
    warning: {
      bg: "bg-slate-900/95 border-amber-500/40 text-slate-100",
      accent: "text-amber-400 bg-amber-500/10 border border-amber-500/20",
      icon: AlertTriangle,
      badge: "bg-amber-500/20 text-amber-300",
    },
    info: {
      bg: "bg-slate-900/95 border-blue-500/40 text-slate-100",
      accent: "text-blue-400 bg-blue-500/10 border border-blue-500/20",
      icon: Info,
      badge: "bg-blue-500/20 text-blue-300",
    },
  }[item.type];

  const IconComp = styles.icon;

  return (
    <div
      className={`pointer-events-auto flex flex-col rounded-2xl border ${styles.bg} p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${styles.accent}`}>
            <IconComp size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold leading-snug">{item.title}</h4>
            </div>
            {item.message && (
              <p className="text-xs text-slate-300 font-medium leading-relaxed mt-0.5 break-words">
                {item.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {item.details && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
              title="تفاصيل الاستجابة"
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {expanded && item.details && (
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-[11px] font-mono text-slate-300 max-h-44 overflow-auto">
          <span className="block mb-1 text-[10px] text-slate-500 font-sans font-bold">تفاصيل الاستجابة (Server Response):</span>
          <pre className="whitespace-pre-wrap break-all">
            {typeof item.details === "string"
              ? item.details
              : JSON.stringify(item.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
