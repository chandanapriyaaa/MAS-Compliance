"use client";

import { useEffect, useRef } from "react";

/**
 * Editorial statement whose words light from faded to solid as the section
 * scrolls through the viewport (design cue: Locus / Apple text-wipe). Bound to
 * continuous scroll progress, not a one-shot fade. Reduced-motion shows it
 * fully solid. The full text is always in the DOM (accessible).
 */
export function ScrollWordReveal({
  text,
  lead,
  className,
}: {
  text: string;
  /** Number of leading words that start already solid (the "hook"). */
  lead?: number;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = Array.from(el.querySelectorAll<HTMLElement>(".rw"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      words.forEach((w) => w.classList.add("lit"));
      return;
    }

    let raf = 0;
    let running = true;
    const loop = () => {
      if (!running) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when statement bottom sits at 82% of viewport, 1 when top hits 28%.
      const start = vh * 0.82;
      const end = vh * 0.28;
      const p = Math.max(0, Math.min(1, (start - rect.top) / (start - end)));
      const litTo = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle("lit", i < litTo));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  const parts = text.trim().split(/\s+/);
  return (
    <p ref={ref} className={className}>
      {parts.map((w, i) => (
        <span
          key={i}
          className={`rw ${lead && i < lead ? "lit" : ""}`}
          style={{ transition: "color 0.35s var(--spring-smooth)" }}
        >
          {w}
          {i < parts.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
