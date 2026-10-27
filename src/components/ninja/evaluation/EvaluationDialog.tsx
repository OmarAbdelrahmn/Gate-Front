"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./evaluation.module.css";

/** Native modal behavior keeps keyboard focus inside and restores it on close. */
export function EvaluationDialog({ isOpen, onClose, title, children, locale }: { isOpen: boolean; onClose: () => void; title: string; children: ReactNode; locale: "ar" | "en"; maxWidth?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!isOpen) { dialog.close(); return; }
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; };
  }, [isOpen]);
  return <dialog ref={ref} className={styles.dialog} dir={locale === "ar" ? "rtl" : "ltr"} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }}>
    <div className={styles.dialogHeader}><h2 id={titleId}>{title}</h2><button type="button" onClick={onClose} aria-label={locale === "ar" ? "إغلاق" : "Close"} autoFocus><X size={18} /></button></div>
    {isOpen && <div className={styles.dialogBody}>{children}</div>}
  </dialog>;
}
