"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./ui/BrandMark";
import { ThemeToggle } from "./ui/ThemeToggle";
import { cn } from "./ui/cn";

const LINKS = [
  { href: "/dashboard/shipments", label: "Shipments" },
  { href: "/dashboard/review-queue", label: "Review" },
  { href: "/dashboard/audit", label: "Audit" },
  { href: "/docs", label: "Docs" },
];

/** Floating rounded Liquid-Glass capsule nav with a mobile menu. */
export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center px-3">
      <header className="glass pointer-events-auto w-full max-w-3xl rounded-full px-3 sm:pl-4 sm:pr-2.5">
        <div className="flex h-14 items-center justify-between gap-2">
          <Link href="/" className="relative z-[1] flex items-center gap-2" onClick={() => setOpen(false)}>
            <BrandMark size={24} />
            <span className="text-[14px] font-semibold tracking-tight text-label">
              Trade Compliance Copilot
            </span>
          </Link>

          {/* desktop links */}
          <div className="relative z-[1] hidden items-center gap-1 md:flex">
            <nav className="flex items-center gap-0.5">
              {LINKS.map((l) => {
                const active = pathname.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[13px] font-medium transition duration-[var(--dur-fast)]",
                      active
                        ? "bg-[var(--fill-tertiary)] text-label"
                        : "text-label-secondary hover:bg-[var(--fill-quaternary)] hover:text-label",
                    )}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
            <ThemeToggle />
          </div>

          {/* mobile controls */}
          <div className="relative z-[1] flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
              aria-expanded={open}
              className="grid h-9 w-9 place-items-center rounded-full text-label-secondary transition hover:bg-[var(--fill-quaternary)] active:scale-90"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                {open ? (
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* mobile dropdown — its own floating glass panel below the capsule */}
      {open && (
        <nav className="glass pointer-events-auto mt-2 flex w-full max-w-3xl flex-col gap-0.5 rounded-2xl p-2 md:hidden">
          {LINKS.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "relative z-[1] rounded-xl px-3 py-2.5 text-[14px] font-medium transition",
                  active ? "bg-[var(--fill-tertiary)] text-label" : "text-label-secondary hover:bg-[var(--fill-quaternary)]",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
