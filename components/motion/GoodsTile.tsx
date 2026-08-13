import { cn } from "../ui/cn";

/**
 * A framed "image" tile: a layered mesh-gradient scene (our own asset, not a
 * stock photo) with sheen, grain, and a soft inner ring so it reads like a
 * photographic tile rather than an icon. Themed to export-goods categories.
 * Swap `backgroundImage` for a real photo `<img>` later if desired.
 */
export type GoodsVariant =
  | "textile"
  | "spice"
  | "tech"
  | "cargo"
  | "agri"
  | "ocean";

const SCENES: Record<GoodsVariant, string> = {
  textile:
    "radial-gradient(120% 120% at 18% 12%, #8b6cff 0%, transparent 55%), radial-gradient(120% 120% at 86% 82%, #00c2a8 0%, transparent 55%), linear-gradient(135deg, #4f46e5, #0ea5b7)",
  spice:
    "radial-gradient(120% 120% at 22% 18%, #ffc155 0%, transparent 55%), radial-gradient(120% 120% at 82% 84%, #ff453a 0%, transparent 55%), linear-gradient(140deg, #ff8a00, #c81e3a)",
  tech:
    "radial-gradient(120% 120% at 18% 18%, #7ce0ff 0%, transparent 55%), radial-gradient(110% 110% at 86% 80%, #0a84ff 0%, transparent 55%), linear-gradient(140deg, #0a84ff, #5e5ce6)",
  cargo:
    "radial-gradient(120% 120% at 24% 14%, #ffd60a 0%, transparent 50%), radial-gradient(120% 120% at 82% 86%, #ff9f0a 0%, transparent 55%), linear-gradient(145deg, #33415a, #0f172a)",
  agri:
    "radial-gradient(120% 120% at 18% 18%, #b6f36a 0%, transparent 55%), radial-gradient(120% 120% at 86% 82%, #16a34a 0%, transparent 55%), linear-gradient(140deg, #22c55e, #065f46)",
  ocean:
    "radial-gradient(120% 120% at 20% 16%, #8fd6ff 0%, transparent 55%), radial-gradient(120% 120% at 84% 84%, #2b6cff 0%, transparent 55%), linear-gradient(150deg, #1e3a8a, #0ea5e9)",
};

export function GoodsTile({
  variant,
  className,
}: {
  variant: GoodsVariant;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grain relative block overflow-hidden ring-1 ring-black/5",
        className,
      )}
      style={{ backgroundImage: SCENES[variant] }}
    >
      {/* top sheen — the light hitting a glossy print */}
      <span
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.32) 0%, transparent 42%)",
        }}
      />
      {/* soft vignette for depth */}
      <span
        className="absolute inset-0"
        style={{
          boxShadow: "inset 0 -18px 40px rgba(0,0,0,0.22)",
        }}
      />
    </span>
  );
}
