import { notFound } from "next/navigation";
import { shipmentClient, callUnary, toHttpError } from "@/lib/grpc/client";
import { StatusBadge } from "@/components/ui/Badge";

interface TrackPublicResponse {
  awbNumber: string;
  status: string;
  currentLocation: string;
  courierName: string;
  destinationCity: string;
  events: { id: string; description: string; location: string; timestamp: string }[];
  brandName: string;
  primaryColor: string;
  logoUrl: string;
}

export default async function PublicTrackingPage({ params }: { params: Promise<{ awb: string }> }) {
  const { awb } = await params;

  let data: TrackPublicResponse;
  try {
    data = await callUnary<object, TrackPublicResponse>(shipmentClient, "trackPublic", { awbNumber: awb });
  } catch (err) {
    if (toHttpError(err).status === 404) notFound();
    throw err;
  }

  const branding = { brandName: data.brandName || "HetEx", primaryColor: data.primaryColor || "#2c3958", logoUrl: data.logoUrl || null };
  const events = [...data.events].reverse();

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-lg px-4">
        <div className="mb-6 flex items-center justify-center gap-2">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={branding.brandName} className="h-8" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: branding.primaryColor }}>
              {branding.brandName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="text-lg font-semibold" style={{ color: branding.primaryColor }}>{branding.brandName}</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">AWB Number</p>
              <p className="font-mono text-lg font-semibold text-slate-900">{data.awbNumber}</p>
            </div>
            <StatusBadge status={data.status} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Shipped via {data.courierName} · Destination: {data.destinationCity}
          </p>

          <div className="mt-6 space-y-5 border-t border-slate-100 pt-6">
            {events.map((event, i) => (
              <div key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`h-2.5 w-2.5 rounded-full ${i === 0 ? "" : "bg-slate-300"}`} style={i === 0 ? { backgroundColor: branding.primaryColor } : {}} />
                  {i !== events.length - 1 && <div className="mt-1 h-full w-px flex-1 bg-slate-200" />}
                </div>
                <div className="pb-4">
                  <p className={`text-sm font-medium ${i === 0 ? "text-slate-900" : "text-slate-500"}`}>{event.description}</p>
                  <p className="text-xs text-slate-400">{event.location} · {new Date(event.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">Powered by HetEx</p>
      </div>
    </div>
  );
}
