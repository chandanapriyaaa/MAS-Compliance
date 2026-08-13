import { cn } from "./cn";

/** Page-level heading with an optional eyebrow + supporting line. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  className,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="space-y-1.5">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[28px] font-semibold leading-tight text-label">
          {title}
        </h1>
        {subtitle && (
          <p className="max-w-2xl text-[15px] leading-relaxed text-label-secondary">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
