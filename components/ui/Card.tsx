import { cn } from "./cn";

/**
 * Elevated content surface: hairline border + soft shadow + generous radius.
 * The lift comes from a quiet shadow and the white-on-gray contrast, not glow.
 */
export function Card({
  className,
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-separator bg-elevated shadow-sm",
        interactive &&
          "transition duration-[var(--dur)] ease-spring hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}
