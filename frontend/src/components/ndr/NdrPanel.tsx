"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface NdrRow {
  id: string;
  reason: string;
  attemptNumber: number;
  action: string;
  notes: string | null;
  shipment: {
    awbNumber: string;
    courier: { name: string };
    order: { orderNumber: string; buyerAddress: { contactName: string; city: string } };
  };
}

export function NdrPanel() {
  const [records, setRecords] = useState<NdrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  function load() {
    setLoading(true);
    fetch("/api/ndr").then((r) => r.json()).then((d) => setRecords(d.records ?? [])).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function act(id: string, action: "REATTEMPT" | "RTO") {
    setBusyId(id);
    try {
      await fetch(`/api/ndr-action/${id}`, { method: "POST", body: JSON.stringify({ action, notes: notes[id] }) });
      load();
    } finally {
      setBusyId(null);
    }
  }

  const pending = records.filter((r) => r.action === "PENDING");

  if (!loading && pending.length === 0) {
    return <Card className="p-8 text-center text-sm text-muted">No pending NDR cases. Great job keeping deliveries on track!</Card>;
  }

  return (
    <div className="space-y-4">
      {pending.map((r) => (
        <Card key={r.id} className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-foreground">{r.shipment.order.orderNumber} · {r.shipment.courier.name}</p>
              <p className="font-mono text-xs text-muted">{r.shipment.awbNumber}</p>
              <p className="mt-2 text-sm text-danger">Attempt {r.attemptNumber}: {r.reason}</p>
              <p className="text-sm text-muted">Buyer: {r.shipment.order.buyerAddress.contactName}, {r.shipment.order.buyerAddress.city}</p>
            </div>
          </div>
          <input
            placeholder="Call notes (e.g. buyer confirmed reattempt tomorrow)"
            className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
            value={notes[r.id] ?? ""}
            onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
          />
          <div className="mt-3 flex gap-2">
            <Button disabled={busyId === r.id} onClick={() => act(r.id, "REATTEMPT")}>Schedule Reattempt</Button>
            <Button variant="danger" disabled={busyId === r.id} onClick={() => act(r.id, "RTO")}>Initiate RTO</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
