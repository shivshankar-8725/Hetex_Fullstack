import { DisputesPanel } from "@/components/disputes/DisputesPanel";

export default function DisputesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Weight Disputes</h1>
        <p className="text-sm text-muted">When a courier's recorded weight differs from what you declared, review and respond here.</p>
      </div>
      <DisputesPanel />
    </div>
  );
}
