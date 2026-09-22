"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function TrackingPageForm({ initial, sampleAwb }: { initial: { brandName: string; primaryColor: string; logoUrl: string | null }; sampleAwb: string | null }) {
  const [brandName, setBrandName] = useState(initial.brandName);
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? "");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      await fetch("/api/settings/tracking-page", { method: "PATCH", body: JSON.stringify({ brandName, primaryColor, logoUrl }) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Brand name shown to buyers</label>
        <input className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Primary color</label>
        <div className="flex items-center gap-2">
          <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-14 rounded border border-border" />
          <span className="text-sm text-muted">{primaryColor}</span>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Logo URL (optional)</label>
        <input className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
      </div>
      <div className="flex items-center gap-3">
        <Button disabled={loading} onClick={save}>{loading ? "Saving…" : "Save Branding"}</Button>
        {saved && <span className="text-sm text-success">Saved!</span>}
      </div>
      {sampleAwb && (
        <p className="text-xs text-muted">
          Preview: <Link href={`/track/${sampleAwb}`} target="_blank" className="text-brand underline">/track/{sampleAwb}</Link>
        </p>
      )}
    </Card>
  );
}
