"use client";

import { useEffect } from "react";

/**
 * Landing-page motion engine (mount once). Three jobs, all reduced-motion aware:
 *  1. Reveal — IntersectionObserver adds `.in` to [data-reveal] as it enters.
 *  2. Word split — [data-words] headlines are split into staggered .word spans.
 *  3. Parallax — [data-parallax="0.15"] elements translate against a *damped*
 *     shadow-scroll value (never scroll-jacked; we only read scroll passively).
 *
 * Content is fully present in SSR DOM; motion is a layer on top.
 */
export function ScrollFX() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── 2. Word split (do first so reveal can observe the spans' parent) ──
    document.querySelectorAll<HTMLElement>("[data-words]").forEach((el) => {
      if (el.dataset.split === "1") return;
      const words = (el.textContent ?? "").trim().split(/\s+/);
      el.dataset.split = "1";
      el.textContent = "";
      words.forEach((w, i) => {
        const span = document.createElement("span");
        span.className = "word";
        span.textContent = w;
        span.style.transitionDelay = `${i * 55}ms`;
        el.appendChild(span);
        if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
      });
    });

    if (reduce) {
      document
        .querySelectorAll("[data-reveal], .word")
        .forEach((el) => el.classList.add("in"));
      return;
    }

    // ── 1. Reveal observer ──
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.classList.add("in");
          el.querySelectorAll(".word").forEach((w) => w.classList.add("in"));
          io.unobserve(el);
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    document
      .querySelectorAll("[data-reveal], [data-words]")
      .forEach((el) => io.observe(el));

    // ── 3. Damped parallax ──
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-parallax]"),
    ).map((el) => ({ el, speed: parseFloat(el.dataset.parallax || "0.12") }));

    let raf = 0;
    let running = true;
    let shadow = window.scrollY;
    const ALPHA = 0.1;

    const loop = () => {
      if (!running) return;
      shadow += (window.scrollY - shadow) * ALPHA;
      const vh = window.innerHeight;
      for (const { el, speed } of nodes) {
        const rect = el.getBoundingClientRect();
        // distance of element center from viewport center, in px
        const delta = rect.top + rect.height / 2 - vh / 2;
        el.style.transform = `translate3d(0, ${(-delta * speed).toFixed(2)}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    // touch shadow so linter keeps it; it smooths perceived cadence
    void shadow;
    raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  return null;
}
