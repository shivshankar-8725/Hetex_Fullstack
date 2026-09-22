import { getSessionToken } from "@/lib/auth";
import { adminClient, callUnary } from "@/lib/grpc/client";
import { toOrderRow, type OrderSummaryMsg } from "@/lib/grpc/mappers";
import { StatTile, Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";

interface AdminOverviewResponse {
  sellerCount: number;
  totalOrders: number;
  totalShipments: number;
  openNdr: number;
  totalMarginEarned: number;
  totalWalletBalance: number;
  recentOrders: OrderSummaryMsg[];
}

export default async function AdminDashboard() {
  const token = await getSessionToken();
  if (!token) return null;

  const data = await callUnary<object, AdminOverviewResponse>(adminClient, "getOverview", {}, token);
  const recentOrders = data.recentOrders.map(toOrderRow);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Platform Overview</h1>
        <p className="text-sm text-muted">HetEx-wide metrics across all sellers.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Sellers" value={String(data.sellerCount)} />
        <StatTile label="Total Orders" value={String(data.totalOrders)} />
        <StatTile label="Open NDR" value={String(data.openNdr)} tone={data.openNdr > 0 ? "warning" : "default"} />
        <StatTile label="Total Margin Earned" value={`₹${data.totalMarginEarned.toFixed(2)}`} tone="success" />
      </div>
      <StatTile label="Total Wallet Balance Held (Liability)" value={`₹${data.totalWalletBalance.toFixed(2)}`} />

      <Card>
        <CardHeader title={`Recent Orders (${data.totalShipments} shipments total)`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Buyer</th>
                <th className="px-5 py-3">Courier</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">{o.orderNumber}</td>
                  <td className="px-5 py-3 text-muted">{o.buyerAddress.contactName}</td>
                  <td className="px-5 py-3 text-muted">{o.shipment?.courier.name ?? "—"}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.shipment?.status ?? o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
