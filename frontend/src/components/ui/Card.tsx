import { clsx } from "clsx";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

export function Card({ children, className, hoverable = false }: { children: ReactNode; className?: string; hoverable?: boolean }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-border bg-surface shadow-card transition-shadow duration-200",
        hoverable && "hover:shadow-elevated",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: string;
  tone?: "default" | "success" | "danger" | "warning";
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-success",
    danger: "text-danger",
    warning: "text-warning",
  }[tone];
  const iconToneClass = {
    default: "bg-brand-light text-brand",
    success: "bg-green-50 text-success",
    danger: "bg-red-50 text-danger",
    warning: "bg-amber-50 text-warning",
  }[tone];

  return (
    <Card className="p-5" hoverable>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        {icon && (
          <div className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", iconToneClass)}>
            <Icon name={icon} className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className={clsx("mt-2 text-2xl font-semibold tracking-tight", toneClass)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
