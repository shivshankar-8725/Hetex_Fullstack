import { clsx } from "clsx";

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  READY_TO_SHIP: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" },
  MANIFESTED: { bg: "bg-brand-light", text: "text-brand", dot: "bg-brand" },
  PICKUP_SCHEDULED: { bg: "bg-brand-light", text: "text-brand", dot: "bg-brand" },
  IN_TRANSIT: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  OUT_FOR_DELIVERY: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  DELIVERED: { bg: "bg-green-50", text: "text-success", dot: "bg-success" },
  NDR: { bg: "bg-red-50", text: "text-danger", dot: "bg-danger" },
  RTO_INITIATED: { bg: "bg-red-50", text: "text-danger", dot: "bg-danger" },
  RTO_DELIVERED: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" },
  CANCELLED: { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400" },
  PENDING: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  PROCESSING: { bg: "bg-brand-light", text: "text-brand", dot: "bg-brand" },
  SETTLED: { bg: "bg-green-50", text: "text-success", dot: "bg-success" },
  VERIFIED: { bg: "bg-green-50", text: "text-success", dot: "bg-success" },
  OPEN: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  RESOLVED: { bg: "bg-green-50", text: "text-success", dot: "bg-success" },
  REJECTED: { bg: "bg-red-50", text: "text-danger", dot: "bg-danger" },
  DRAFT: { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400" },
  BOOKED: { bg: "bg-green-50", text: "text-success", dot: "bg-success" },
};

const DEFAULT_STYLE = { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" };

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? DEFAULT_STYLE;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        style.bg,
        style.text
      )}
    >
      <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} />
      {status.replaceAll("_", " ")}
    </span>
  );
}
