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

/** Sticky translucent (glass) top bar — chrome that defers to content. */
export function Nav() {
  const pathname = usePathname();
  return (
    <header className="glass sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-content items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-[15px] font-semibold tracking-tight text-label">
            Trade Compliance Copilot
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <nav className="mr-1 hidden items-center gap-1 sm:flex">
            {LINKS.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition duration-[var(--dur-fast)]",
                    active
                      ? "bg-[var(--fill-tertiary)] text-label"
                      : "text-label-secondary hover:text-label hover:bg-[var(--fill-quaternary)]",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
