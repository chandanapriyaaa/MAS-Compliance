"use client";

import { useEffect, useState } from "react";
import { cn } from "../ui/cn";

export interface DocSection {
  id: string;
  title: string;
}

/**
 * Documentation shell: sticky section nav on the left with scroll-spy, content
 * on the right. Client-only for the active-section highlight; content is passed
 * as children so it stays server-rendered and crawlable.
 */
export function DocsShell({
  sections,
  children,
}: {
  sections: DocSection[];
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  return (
    <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
      <nav className="hidden lg:block">
        <div className="sticky top-24 space-y-1">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-label-tertiary">
            On this page
          </p>
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={cn(
                "block rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                active === s.id
                  ? "bg-[var(--fill-tertiary)] font-medium text-label"
                  : "text-label-secondary hover:text-label",
              )}
            >
              {s.title}
            </a>
          ))}
        </div>
      </nav>
      <div className="min-w-0 max-w-3xl">{children}</div>
    </div>
  );
}
