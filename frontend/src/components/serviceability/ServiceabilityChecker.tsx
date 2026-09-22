"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ServiceabilityRow {
  courierName: string;
  logoColor: string;
  serviceable: boolean;
  codAvailable: boolean;
  estimatedDays: number;
}

export function ServiceabilityChecker() {
  const [fromPincode, setFromPincode] = useState("");
  const [toPincode, setToPincode] = useState("");
  const [rows, setRows] = useState<ServiceabilityRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/serviceability", { method: "POST", body: JSON.stringify({ fromPincode, toPincode }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRows(data.couriers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const serviceableCount = rows?.filter((r) => r.serviceable).length ?? 0;

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">From Pincode</label>
            <input
              value={fromPincode}
              onChange={(e) => setFromPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="560058"
              className="w-36 rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">To Pincode</label>
            <input
              value={toPincode}
              onChange={(e) => setToPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="400001"
              className="w-36 rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <Button disabled={fromPincode.length !== 6 || toPincode.length !== 6 || loading} onClick={check}>
            {loading ? "Checking…" : "Check Serviceability"}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Card>

      {rows && (
        <Card>
          <CardHeader title="Results" subtitle={`${serviceableCount} of ${rows.length} couriers deliver this route`} />
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <div key={r.courierName} className="flex items-center justify-between px-5 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.logoColor }} />
                  <span className="font-medium">{r.courierName}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  {r.serviceable ? (
                    <>
                      <span className="text-muted">ETA {r.estimatedDays}d</span>
                      <span className={r.codAvailable ? "text-success" : "text-muted"}>{r.codAvailable ? "COD available" : "Prepaid only"}</span>
                    </>
                  ) : (
                    <span className="text-danger">Not serviceable</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
