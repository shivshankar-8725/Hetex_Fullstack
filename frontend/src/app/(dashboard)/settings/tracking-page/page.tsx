import { getCurrentUser, getSessionToken } from "@/lib/auth";
import { settingsClient, orderClient, callUnary } from "@/lib/grpc/client";
import type { OrderSummaryMsg } from "@/lib/grpc/mappers";
import { TrackingPageForm } from "@/components/settings/TrackingPageForm";

interface TrackingPageConfigMsg { brandName: string; primaryColor: string; logoUrl: string }

export default async function TrackingPageSettings() {
  const user = await getCurrentUser();
  const token = await getSessionToken();
  if (!user || !token) return null;

  const config = await callUnary<object, TrackingPageConfigMsg>(settingsClient, "getTrackingPageConfig", {}, token);

  interface ListOrdersResponse { orders: OrderSummaryMsg[] }
  const orders = await callUnary<object, ListOrdersResponse>(orderClient, "listOrders", { statusFilter: "" }, token);
  const sampleAwb = orders.orders.find((o) => o.hasShipment)?.shipment?.awbNumber ?? null;

  return (
    <div className="w-full space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Branded Tracking Page</h1>
        <p className="text-sm text-muted">Customize the public tracking page your buyers see.</p>
      </div>
      <TrackingPageForm
        initial={{ brandName: config.brandName || (user.businessName ?? user.name), primaryColor: config.primaryColor || "#2563eb", logoUrl: config.logoUrl || null }}
        sampleAwb={sampleAwb}
      />
    </div>
  );
}
