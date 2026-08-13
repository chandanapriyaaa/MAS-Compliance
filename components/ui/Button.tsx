import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium " +
  "transition duration-[var(--dur-fast)] ease-spring active:scale-[0.97] " +
  "disabled:opacity-45 disabled:pointer-events-none select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  // The one filled accent — Apple's pill CTA.
  primary: "bg-blue text-white hover:brightness-110 shadow-sm",
  secondary:
    "bg-[var(--fill-tertiary)] text-label hover:bg-[var(--fill-secondary)]",
  ghost: "text-blue hover:bg-[var(--fill-quaternary)]",
  danger: "bg-red text-white hover:brightness-110 shadow-sm",
};

const sizes: Record<Size, string> = {
  // 44px min touch target on md.
  md: "h-11 px-5 text-[15px]",
  sm: "h-9 px-4 text-[13px]",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
