import { getSessionToken } from "@/lib/auth";
import { adminClient, callUnary } from "@/lib/grpc/client";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";

interface AllShipmentRow {
  awbNumber: string;
  orderNumber: string;
  sellerName: string;
  courierName: string;
  status: string;
  currentLocation: string;
  paymentMode: string;
  createdAt: string;
}

export default async function AdminShipmentsPage() {
  const token = await getSessionToken();
  if (!token) return null;

  interface ListAllShipmentsResponse { shipments: AllShipmentRow[] }
  const data = await callUnary<object, ListAllShipmentsResponse>(adminClient, "listAllShipments", {}, token);
  const shipments = [...data.shipments].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">All Shipments & Tracking</h1>
        <p className="text-sm text-muted">Master tracking view across every registered seller.</p>
      </div>
      <Card>
        <CardHeader title={`${shipments.length} shipments`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3">AWB</th>
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Seller</th>
                <th className="px-5 py-3">Courier</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Current Location</th>
                <th className="px-5 py-3">Payment</th>
                <th className="px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.awbNumber} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-mono">{s.awbNumber}</td>
                  <td className="px-5 py-3 text-muted">{s.orderNumber}</td>
                  <td className="px-5 py-3">{s.sellerName}</td>
                  <td className="px-5 py-3 text-muted">{s.courierName}</td>
                  <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-5 py-3 text-muted">{s.currentLocation || "—"}</td>
                  <td className="px-5 py-3 text-muted">{s.paymentMode}</td>
                  <td className="px-5 py-3 text-muted">{new Date(s.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {shipments.length === 0 && <tr><td colSpan={8} className="px-5 py-8 text-center text-muted">No shipments booked yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
