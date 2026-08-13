import { cn } from "./cn";

/** Form field wrapper: label + control + optional hint, consistent rhythm. */
export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-[13px] font-medium text-label-secondary"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-label-tertiary">{hint}</p>}
    </div>
  );
}

const control =
  "w-full rounded-md border border-separator bg-canvas px-3.5 py-2.5 text-[15px] " +
  "text-label placeholder:text-[var(--placeholder)] transition duration-[var(--dur-fast)] " +
  "focus:border-blue focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--blue)_16%,transparent)]";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(control, "resize-y leading-relaxed", className)} {...props} />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(control, "appearance-none bg-canvas pr-9", className)}
      {...props}
    />
  );
}
