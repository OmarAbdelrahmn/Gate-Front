"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/** Native modal focus containment, Escape support, and focus restoration. */
export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-2xl" }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!isOpen || !dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return <dialog ref={ref} aria-labelledby={titleId} className={`treasury-dialog ${maxWidth}`} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
    if (event.target === event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }
  }}>
    <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
      <h2 id={titleId} className="text-lg font-bold">{title}</h2>
      <button type="button" onClick={onClose} aria-label="إغلاق" className="shrink-0 rounded-lg border border-border p-2"><X size={18} aria-hidden="true" /></button>
    </div>
    <div className="mt-5">{children}</div>
  </dialog>;
}
