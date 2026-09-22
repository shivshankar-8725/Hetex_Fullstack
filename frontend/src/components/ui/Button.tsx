import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-sm hover:bg-brand-dark hover:shadow-card",
  secondary: "bg-white text-foreground border border-border hover:border-brand/40 hover:bg-brand-light/40",
  ghost: "text-brand hover:bg-brand-light",
  danger: "bg-danger text-white shadow-sm hover:bg-red-700",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
        VARIANT_CLASS[variant],
        className
      )}
      {...props}
    />
  );
}
