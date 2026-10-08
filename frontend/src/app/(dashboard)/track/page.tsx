"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { trackOrderAction } from "./actions";
import { formatStatus } from "@/lib/formatters";

export default function TrackOrderPage() {
  const [trackingId, setTrackingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const res = await trackOrderAction(trackingId);
    if (res.success) {
      setResult(res.data);
    } else {
      setError(res.error || "Failed to find tracking details.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Track Order</h1>
        <p className="text-muted text-sm">Enter your Order ID or AWB number to check the live tracking status of your shipment.</p>
      </div>

      <Card>
        <CardHeader title="Tracking details" />
        <div className="p-6">
          <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="Enter AWB or Order ID"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="shrink-0 bg-brand text-white hover:bg-brand/90 py-2 px-6">
              {loading ? "Searching..." : "Track Shipment"}
            </Button>
          </form>

          {error && (
            <div className="mt-6 p-4 rounded-lg bg-red-50 text-red-600 border border-red-200 text-sm flex gap-2 items-start">
              <Icon name="alert-circle" className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Tracking Results</h3>
              <div className="bg-slate-50 border border-border p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted font-medium">AWB Number</p>
                    <p className="text-sm font-semibold">{result.awbNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted font-medium">Courier</p>
                    <p className="text-sm font-semibold">{result.courierName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted font-medium">Destination</p>
                    <p className="text-sm font-semibold">{result.destinationCity || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted font-medium">Current Status</p>
                    <p className="text-sm font-bold text-brand">{formatStatus(result.status)}</p>
                  </div>
                </div>
              </div>

              {result.events && result.events.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-3">Timeline</h4>
                  <div className="space-y-4 relative border-l-2 border-slate-200 ml-2 pl-4">
                    {result.events.map((event: any, i: number) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full bg-brand ring-4 ring-white" />
                        <p className="text-sm font-medium">{formatStatus(event.status)}</p>
                        <p className="text-xs text-muted">{event.location} • {new Date(event.timestamp).toLocaleString()}</p>
                        {event.description && <p className="text-xs text-slate-600 mt-1">{event.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
