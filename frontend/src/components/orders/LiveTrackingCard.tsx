"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface TrackingEvent {
  id: string;
  status: string;
  description: string;
  location: string;
  timestamp: string;
}

interface LiveTrackingCardProps {
  shipmentId: string;
  awbNumber: string;
  courierName: string;
  initialEvents: TrackingEvent[];
  initialStatus: string;
  initialLocation: string;
}

export function LiveTrackingCard({
  shipmentId,
  awbNumber,
  courierName,
  initialEvents,
  initialStatus,
  initialLocation,
}: LiveTrackingCardProps) {
  const [events, setEvents] = useState<TrackingEvent[]>(initialEvents);
  const [status, setStatus] = useState(initialStatus);
  const [location, setLocation] = useState(initialLocation);
  const [expectedDate, setExpectedDate] = useState<string>("");
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchLiveTracking() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/shipments/live-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentId }),
      });
      const data = await res.json();
      if (res.ok && data) {
        if (data.events && data.events.length > 0) {
          setEvents(data.events);
        }
        if (data.status) setStatus(data.status);
        if (data.currentLocation) setLocation(data.currentLocation);
        if (data.expectedDeliveryDate) setExpectedDate(data.expectedDeliveryDate);
        setIsLive(data.isLive ?? false);
        if (data.message) setMessage(data.message);
      } else {
        setMessage(data.error || "Failed to fetch live tracking");
      }
    } catch {
      setMessage("Network error fetching live tracking");
    } finally {
      setLoading(false);
    }
  }

  const reversedEvents = [...events].reverse();

  return (
    <Card>
      <CardHeader
        title="Live Delivery Tracking"
        subtitle={`Courier: ${courierName} · AWB: ${awbNumber}`}
        action={
          <Button variant="secondary" onClick={fetchLiveTracking} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh Live Tracking"}
          </Button>
        }
      />
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3.5 border border-slate-200">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Current Location</p>
            <p className="text-sm font-semibold text-foreground">{location || "Sort Facility"}</p>
          </div>
          {expectedDate && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Expected Delivery</p>
              <p className="text-sm font-semibold text-brand">{expectedDate}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            {isLive !== null && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                isLive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                {isLive ? "Live API" : "Cached"}
              </span>
            )}
          </div>
        </div>

        {message && (
          <p className="text-xs text-muted italic bg-slate-50 p-2 rounded border border-slate-100">
            {message}
          </p>
        )}

        <div className="space-y-4 pt-2">
          {reversedEvents.length === 0 ? (
            <p className="text-sm text-muted">No tracking events recorded yet.</p>
          ) : (
            reversedEvents.map((event, idx) => (
              <div key={event.id || idx} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`h-2.5 w-2.5 rounded-full ${idx === 0 ? "bg-brand ring-4 ring-brand/10" : "bg-slate-300"}`} />
                  {idx !== reversedEvents.length - 1 && <div className="mt-1 h-full w-px flex-1 bg-slate-200" />}
                </div>
                <div className="pb-3">
                  <p className={`text-sm font-medium ${idx === 0 ? "text-foreground font-semibold" : "text-slate-600"}`}>
                    {event.description}
                  </p>
                  <p className="text-xs text-muted">
                    {event.location ? `${event.location} · ` : ""}
                    {event.timestamp ? new Date(event.timestamp).toLocaleString() : ""}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
