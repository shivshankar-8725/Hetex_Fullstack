"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";

interface DisputeRow {
  id: string;
  orderNumber: string;
  awbNumber: string;
  courierName: string;
  declaredWeight: number;
  courierWeight: number;
  extraCharge: number;
  status: string;
  resolutionNote: string;
}

export function DisputesPanel() {
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/disputes").then((r) => r.json()).then((d) => setDisputes(d.disputes ?? [])).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function respond(id: string, status: "RESOLVED" | "REJECTED") {
    setBusyId(id);
    try {
      await fetch(`/api/dispute-respond/${id}`, {
        method: "POST",
        body: JSON.stringify({ status, resolutionNote: status === "RESOLVED" ? "Extra charge accepted by seller" : "Disputed by seller — pending courier review" }),
      });
      load();
    } finally {
      setBusyId(null);
    }
  }

  const pending = disputes.filter((d) => d.status === "OPEN");
  const resolved = disputes.filter((d) => d.status !== "OPEN");

  if (!loading && disputes.length === 0) {
    return <Card className="p-8 text-center text-sm text-muted">No weight discrepancies flagged. Courier-recorded weights are matching your declared weights.</Card>;
  }

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div className="space-y-4">
          {pending.map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">{d.orderNumber} · {d.courierName}</p>
                  <p className="font-mono text-xs text-muted">{d.awbNumber}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-muted">Declared</p><p className="font-medium">{d.declaredWeight.toFixed(2)} kg</p></div>
                <div><p className="text-muted">Courier-recorded</p><p className="font-medium text-warning">{d.courierWeight.toFixed(2)} kg</p></div>
                <div><p className="text-muted">Extra Charge</p><p className="font-medium text-danger">₹{d.extraCharge.toFixed(2)}</p></div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button disabled={busyId === d.id} onClick={() => respond(d.id, "RESOLVED")}>Accept Charge</Button>
                <Button variant="secondary" disabled={busyId === d.id} onClick={() => respond(d.id, "REJECTED")}>Dispute It</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Resolved</p>
          <div className="space-y-2">
            {resolved.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <span>{d.orderNumber} · {d.courierName} · ₹{d.extraCharge.toFixed(2)}</span>
                <StatusBadge status={d.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
