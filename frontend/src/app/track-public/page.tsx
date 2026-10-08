"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { trackOrderAction } from "../(dashboard)/track/actions";
import { formatStatus } from "@/lib/formatters";
import Link from "next/link";

export default function PublicTrackPage() {
  const searchParams = useSearchParams();
  const initialAwb = searchParams.get("awb") || "";

  const [trackingId, setTrackingId] = useState(initialAwb);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    if (initialAwb && !initialLoadDone) {
      setInitialLoadDone(true);
      handleTrackRaw(initialAwb);
    }
  }, [initialAwb, initialLoadDone]);

  const handleTrackRaw = async (idToTrack: string) => {
    if (!idToTrack.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    const res = await trackOrderAction(idToTrack.trim());
    if (res.success) {
      setResult(res.data);
    } else {
      setError(res.error || "Failed to find tracking details.");
    }
    setLoading(false);
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleTrackRaw(trackingId);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="flex items-center justify-between border-b border-border bg-white px-6 py-4 shadow-sm">
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/login">
          <Button variant="secondary" className="text-brand">Log In to HetEx</Button>
        </Link>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto p-6 md:p-12 space-y-6">
        <div className="flex flex-col gap-2 text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Track Your Shipment</h1>
          <p className="text-muted text-sm">Enter your AWB number to check the live status of your package.</p>
        </div>

        <Card className="shadow-elevated border-none">
          <div className="p-6">
            <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                <input
                  type="text"
                  placeholder="Enter AWB or Tracking ID"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-white text-base focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="shrink-0 bg-brand text-white hover:bg-brand-dark py-3 px-8 text-base">
                {loading ? "Searching..." : "Track Package"}
              </Button>
            </form>

            {error && (
              <div className="mt-6 p-4 rounded-lg bg-red-50 text-red-600 border border-red-200 flex gap-3 items-start">
                <Icon name="alert-circle" className="h-5 w-5 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {result && (
              <div className="mt-10">
                <div className="bg-brand-light/30 border border-brand/20 p-6 rounded-xl space-y-4 mb-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider font-semibold">AWB Number</p>
                      <p className="text-base font-bold text-foreground mt-1">{result.awbNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider font-semibold">Courier</p>
                      <p className="text-base font-bold text-foreground mt-1">{result.courierName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider font-semibold">Destination</p>
                      <p className="text-base font-bold text-foreground mt-1">{result.destinationCity || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider font-semibold">Current Status</p>
                      <p className="text-base font-bold text-brand mt-1">{formatStatus(result.status)}</p>
                    </div>
                  </div>
                </div>

                {result.events && result.events.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold mb-6 text-foreground">Tracking Timeline</h4>
                    <div className="space-y-6 relative border-l-2 border-slate-200 ml-3 pl-6">
                      {result.events.map((event: any, i: number) => (
                        <div key={i} className="relative">
                          <div className={`absolute -left-[31px] top-1.5 h-4 w-4 rounded-full ring-4 ring-slate-50 ${i === 0 ? 'bg-brand' : 'bg-slate-300'}`} />
                          <p className={`text-base font-bold ${i === 0 ? 'text-brand' : 'text-slate-700'}`}>{formatStatus(event.status)}</p>
                          <p className="text-sm text-muted mt-0.5">{event.location} • {new Date(event.timestamp).toLocaleString()}</p>
                          {event.description && <p className="text-sm text-slate-600 mt-2 bg-white border border-slate-100 p-3 rounded-lg shadow-sm inline-block">{event.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
