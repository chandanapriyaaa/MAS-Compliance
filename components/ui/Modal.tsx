"use client";

import { useEffect } from "react";

/** Centered dialog with a dimmed, blurred backdrop. Escape / backdrop closes. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 sm:items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/35 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[1] mt-16 w-full max-w-lg overflow-hidden rounded-xl border border-separator bg-canvas shadow-lg sm:mt-0"
        style={{ animation: "modalIn 0.28s var(--spring-smooth) both" }}
      >
        <style>{`@keyframes modalIn{from{transform:translateY(10px) scale(0.98);opacity:0}to{transform:none;opacity:1}}`}</style>
        {title && (
          <div className="flex items-center justify-between border-b border-separator px-5 py-4">
            <h2 className="text-[15px] font-semibold text-label">{title}</h2>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full text-label-secondary hover:bg-[var(--fill-quaternary)]"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
