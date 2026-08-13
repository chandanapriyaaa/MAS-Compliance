"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./ui/BrandMark";
import { ThemeToggle } from "./ui/ThemeToggle";
import { cn } from "./ui/cn";

const LINKS = [
  { href: "/dashboard/shipments", label: "Shipments" },
  { href: "/dashboard/review-queue", label: "Review Queue" },
];

/** Floating rounded Liquid-Glass capsule nav — chrome that defers to content. */
export function Nav() {
  const pathname = usePathname();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3">
      <header className="glass pointer-events-auto flex h-14 w-full max-w-3xl items-center justify-between gap-2 rounded-full pl-4 pr-2.5">
        <Link href="/" className="relative z-[1] flex items-center gap-2">
          <BrandMark size={24} />
          <span className="hidden text-[14px] font-semibold tracking-tight text-label sm:block">
            Trade Compliance Copilot
          </span>
        </Link>

        <div className="relative z-[1] flex items-center gap-1">
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
      </header>
    </div>
  );
}
