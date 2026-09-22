"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export interface Rule {
  id: string;
  courierName: string;
  minWeight: number;
  maxWeight: number;
  marginType: "FLAT" | "PERCENT";
  marginValue: number;
}

interface Courier {
  id: string;
  name: string;
}

const inputClass = "rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";

export function CommissionPanel({ initialRules, couriers }: { initialRules: Rule[]; couriers: Courier[] }) {
  const router = useRouter();
  const [rules, setRules] = useState(initialRules);
  const [form, setForm] = useState({ courierId: "", minWeight: "0", maxWeight: "1000", marginType: "PERCENT" as "PERCENT" | "FLAT", marginValue: "15" });
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/commission", {
        method: "POST",
        body: JSON.stringify({
          courierId: form.courierId || null,
          minWeight: Number(form.minWeight),
          maxWeight: Number(form.maxWeight),
          marginType: form.marginType,
          marginValue: Number(form.marginValue),
        }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/admin-commission/${id}`, { method: "DELETE" });
    setRules((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <p className="mb-3 text-sm font-medium text-foreground">Add Rule</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Courier</label>
            <select className={inputClass} value={form.courierId} onChange={(e) => setForm({ ...form, courierId: e.target.value })}>
              <option value="">All couriers (fallback)</option>
              {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="mb-1 block text-xs text-muted">Min kg</label><input className={`${inputClass} w-20`} value={form.minWeight} onChange={(e) => setForm({ ...form, minWeight: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs text-muted">Max kg</label><input className={`${inputClass} w-20`} value={form.maxWeight} onChange={(e) => setForm({ ...form, maxWeight: e.target.value })} /></div>
          <div>
            <label className="mb-1 block text-xs text-muted">Type</label>
            <select className={inputClass} value={form.marginType} onChange={(e) => setForm({ ...form, marginType: e.target.value as "PERCENT" | "FLAT" })}>
              <option value="PERCENT">Percent</option>
              <option value="FLAT">Flat ₹</option>
            </select>
          </div>
          <div><label className="mb-1 block text-xs text-muted">Value</label><input className={`${inputClass} w-20`} value={form.marginValue} onChange={(e) => setForm({ ...form, marginValue: e.target.value })} /></div>
          <Button disabled={loading} onClick={create}>Add</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Active Rules" />
        <div className="divide-y divide-border">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium">{r.courierName}</p>
                <p className="text-xs text-muted">{r.minWeight}–{r.maxWeight}kg · {r.marginType === "PERCENT" ? `${r.marginValue}%` : `₹${r.marginValue}`} margin</p>
              </div>
              <button className="text-xs text-danger hover:underline" onClick={() => remove(r.id)}>Remove</button>
            </div>
          ))}
          {rules.length === 0 && <p className="px-5 py-6 text-center text-sm text-muted">No rules yet — a default 12% margin applies.</p>}
        </div>
      </Card>
    </div>
  );
}
