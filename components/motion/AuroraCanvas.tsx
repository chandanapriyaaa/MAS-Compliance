"use client";

import { useEffect, useRef } from "react";

/**
 * Abstract ambient hero visual: several large, soft radial gradients ("blobs")
 * that drift on sine paths and gently lean toward the pointer. CSS-blurred for a
 * high-tier, non-figurative finish. Under reduced-motion it renders one static
 * frame. Pointer parallax is desktop-only (fine pointer).
 */
export function AuroraCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const canvas = ref.current;
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;

    function palette() {
      const dark =
        document.documentElement.getAttribute("data-theme") === "dark" ||
        (!document.documentElement.getAttribute("data-theme") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      return dark
        ? [
            "rgba(10,132,255,0.55)",
            "rgba(191,90,242,0.45)",
            "rgba(100,210,255,0.40)",
            "rgba(48,209,88,0.28)",
          ]
        : [
            "rgba(0,113,227,0.42)",
            "rgba(175,82,222,0.30)",
            "rgba(90,200,250,0.34)",
            "rgba(52,199,89,0.20)",
          ];
    }

    const blobs = [
      { x: 0.28, y: 0.35, r: 0.42, sx: 0.7, sy: 0.5, p: 0 },
      { x: 0.72, y: 0.3, r: 0.5, sx: -0.6, sy: 0.7, p: 1.7 },
      { x: 0.6, y: 0.72, r: 0.46, sx: 0.5, sy: -0.6, p: 3.1 },
      { x: 0.35, y: 0.68, r: 0.38, sx: -0.4, sy: -0.5, p: 4.6 },
    ];
    let colors = palette();

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    let px = 0;
    let py = 0; // pointer offset, damped
    let tx = 0;
    let ty = 0;
    function onMove(e: PointerEvent) {
      if (!fine) return;
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }

    function draw(t: number) {
      px += (tx - px) * 0.05;
      py += (ty - py) * 0.05;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
      blobs.forEach((b, i) => {
        const drift = reduce ? 0 : t / 1000;
        const cx =
          (b.x + Math.sin(drift * b.sx + b.p) * 0.06 + px * 0.05 * (i + 1)) * w;
        const cy =
          (b.y + Math.cos(drift * b.sy + b.p) * 0.06 + py * 0.05 * (i + 1)) * h;
        const rad = b.r * Math.max(w, h);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, colors[i % colors.length]);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    let raf = 0;
    let running = true;
    const render = (t: number) => {
      if (!running) return;
      draw(t);
      if (!reduce) raf = requestAnimationFrame(render);
    };
    render(0);

    const onResize = () => {
      resize();
      colors = palette();
      if (reduce) draw(0);
    };
    const onTheme = () => {
      colors = palette();
      if (reduce) draw(0);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove);
    const themeObserver = new MutationObserver(onTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ filter: "blur(44px) saturate(1.15)" }}
    />
  );
}
