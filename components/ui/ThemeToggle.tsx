"use client";

import { useEffect, useState } from "react";
import { cn } from "./cn";

type Mode = "light" | "dark";

/**
 * Light/dark toggle. Stamps [data-theme] on <html> and persists the choice.
 * A companion inline script in the layout applies the stored theme before
 * first paint to avoid a flash.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    const stored = document.documentElement.getAttribute("data-theme") as Mode | null;
    const initial =
      stored ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setMode(initial);
  }, []);

  function toggle() {
    const next: Mode = mode === "dark" ? "light" : "dark";
    setMode(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle color theme"
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full text-label-secondary",
        "transition duration-[var(--dur-fast)] ease-spring hover:bg-[var(--fill-quaternary)] hover:text-label active:scale-90",
        className,
      )}
    >
      {mode === "dark" ? <Sun /> : <Moon />}
    </button>
  );
}

function Moon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Sun() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
