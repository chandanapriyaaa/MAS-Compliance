"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "../ui/cn";

const STEPS = [
  {
    n: "01",
    name: "Intake",
    desc: "Turns a description, invoice, or spec sheet into structured facts: material, function, use-case, route.",
    glyph: "M4 7h16M4 12h16M4 17h10",
  },
  {
    n: "02",
    name: "HS Classification",
    desc: "Retrieves the closest HS lines, then derives confidence from retrieval strength and sample agreement.",
    glyph: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 21l-4.3-4.3",
  },
  {
    n: "03",
    name: "Scheme Cross-Check",
    desc: "Checks RoDTEP and drawback eligibility, and flags any mismatch with the claimed scheme.",
    glyph: "M5 12l4 4 10-10",
  },
  {
    n: "04",
    name: "Duty Calculator",
    desc: "Computes BCD, surcharge, and IGST from grounded reference rates. Never a guessed figure.",
    glyph: "M6 3h12v18l-6-3-6 3V3Z",
  },
  {
    n: "05",
    name: "Confidence Gate",
    desc: "Aggregates confidence across steps. Above threshold clears; below it routes to review.",
    glyph: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z",
  },
  {
    n: "06",
    name: "Documentation",
    desc: "Drafts invoice, packing-list, and LC language from the finalized code.",
    glyph: "M7 3h7l4 4v14H7V3ZM14 3v4h4",
  },
];

export function PipelineScrolly() {
  const sectionRef = useRef<HTMLElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReduce(true);
      setActive(STEPS.length - 1);
      return;
    }

    let raf = 0;
    let running = true;
    let last = -1;

    const loop = () => {
      if (!running) return;
      const sec = sectionRef.current;
      if (sec) {
        const rect = sec.getBoundingClientRect();
        const budget = sec.offsetHeight - window.innerHeight;
        const traveled = Math.min(Math.max(-rect.top, 0), budget);
        const p = budget > 0 ? traveled / budget : 0;

        if (fillRef.current) fillRef.current.style.height = `${p * 100}%`;
        if (orbRef.current) orbRef.current.style.top = `${p * 100}%`;

        // Discrete active step — dead zones at the ends keep 1 and 6 readable.
        const idx = Math.min(
          STEPS.length - 1,
          Math.max(0, Math.floor(p * STEPS.length * 0.999)),
        );
        if (idx !== last) {
          last = idx;
          setActive(idx);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={cn("relative", reduce ? "py-4" : "h-[460vh]")}
      aria-label="The agent pipeline"
    >
      <div
        className={cn(
          reduce
            ? ""
            : "sticky top-0 flex min-h-screen items-center overflow-hidden",
        )}
      >
        <div className="mx-auto grid w-full max-w-content gap-10 px-5 sm:px-8 lg:grid-cols-[minmax(240px,340px)_1fr] lg:gap-16">
          {/* Rail */}
          <div className="relative">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.16em] text-blue">
              The pipeline
            </p>
            <div className="relative pl-8">
              {/* track + fill */}
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 rounded bg-separator" />
              {!reduce && (
                <>
                  <div
                    ref={fillRef}
                    className="absolute left-[7px] top-2 w-0.5 rounded bg-gradient-to-b from-blue to-purple"
                    style={{ height: "0%" }}
                  />
                  <div
                    ref={orbRef}
                    className="absolute left-[8px] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue shadow-[0_0_16px_4px_var(--blue)]"
                    style={{ top: "0%" }}
                  />
                </>
              )}
              <ul className="space-y-5">
                {STEPS.map((s, i) => {
                  const on = reduce || i <= active;
                  return (
                    <li key={s.n} className="relative">
                      <span
                        className={cn(
                          "absolute -left-8 top-1 h-3.5 w-3.5 -translate-x-0 rounded-full border-2 transition-all duration-500",
                          on
                            ? "border-blue bg-blue"
                            : "border-separator-strong bg-canvas",
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setActive(i)}
                        className={cn(
                          "text-left text-[15px] font-medium transition-colors duration-300",
                          i === active && !reduce
                            ? "text-label"
                            : on
                              ? "text-label-secondary"
                              : "text-label-tertiary",
                        )}
                      >
                        <span className="font-mono text-xs text-label-tertiary">
                          {s.n}
                        </span>{" "}
                        {s.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Detail panel(s) */}
          <div className="relative min-h-[280px]">
            {STEPS.map((s, i) => (
              <article
                key={s.n}
                className={cn(
                  reduce
                    ? "mb-8"
                    : "absolute inset-0 transition-all duration-500 ease-spring",
                  reduce || i === active
                    ? "opacity-100"
                    : "pointer-events-none translate-y-4 opacity-0",
                )}
                aria-hidden={!reduce && i !== active}
              >
                <div className="mb-6 grid h-14 w-14 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--blue)_12%,transparent)]">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path
                      d={s.glyph}
                      stroke="var(--blue)"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="font-mono text-sm text-label-tertiary">{s.n}</div>
                <h3 className="mt-1 text-[30px] font-semibold tracking-tight text-label sm:text-[38px]">
                  {s.name}
                </h3>
                <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-label-secondary">
                  {s.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
