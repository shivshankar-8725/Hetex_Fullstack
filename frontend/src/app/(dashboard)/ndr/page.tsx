import { NdrPanel } from "@/components/ndr/NdrPanel";

export default function NdrPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">NDR Management</h1>
        <p className="text-sm text-muted">Failed delivery attempts awaiting a reattempt or RTO decision.</p>
      </div>
      <NdrPanel />
    </div>
  );
}
