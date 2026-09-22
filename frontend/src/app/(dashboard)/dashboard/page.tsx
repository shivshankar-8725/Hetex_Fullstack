import Link from "next/link";
import { getCurrentUser, getSessionToken } from "@/lib/auth";
import { orderClient, callUnary } from "@/lib/grpc/client";
import { toOrderRow, type OrderSummaryMsg } from "@/lib/grpc/mappers";
import { StatTile, Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const token = await getSessionToken();
  if (!user || !token) return null;

  interface ListOrdersResponse { orders: OrderSummaryMsg[] }
  const data = await callUnary<object, ListOrdersResponse>(orderClient, "listOrders", { statusFilter: "" }, token);
  const orders = data.orders.map(toOrderRow);

  const totalOrders = orders.length;
  const deliveredCount = orders.filter((o) => o.shipment?.status === "DELIVERED").length;
  const ndrCount = orders.filter((o) => o.shipment?.status === "NDR").length;
  const rtoCount = orders.filter((o) => o.shipment?.status === "RTO_INITIATED" || o.shipment?.status === "RTO_DELIVERED").length;
  const recentOrders = orders.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="brand-gradient relative flex items-center justify-between overflow-hidden rounded-2xl px-6 py-6 text-white shadow-elevated">
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Welcome back, {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-white/80">Here&apos;s what&apos;s happening with your shipments today.</p>
        </div>
        <Link href="/orders/new" className="relative shrink-0">
          <Button className="!bg-white !text-brand shadow-elevated hover:!bg-white/90">+ New Order</Button>
        </Link>
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/10" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Total Orders" value={String(totalOrders)} icon="package" />
        <StatTile label="Delivered" value={String(deliveredCount)} icon="check" tone="success" />
        <StatTile label="NDR" value={String(ndrCount)} icon="alert-triangle" tone={ndrCount > 0 ? "warning" : "default"} />
        <StatTile label="RTO" value={String(rtoCount)} icon="truck" tone={rtoCount > 0 ? "danger" : "default"} />
      </div>

      <Card>
        <CardHeader title="Recent Orders" action={<Link href="/orders" className="text-sm font-medium text-brand">View all</Link>} />
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
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/orders/${order.id}`} className="font-medium text-brand">{order.orderNumber}</Link>
                  </td>
                  <td className="px-5 py-3 text-muted">{order.buyerAddress.contactName}</td>
                  <td className="px-5 py-3 text-muted">{order.shipment?.courier.name ?? "—"}</td>
                  <td className="px-5 py-3"><StatusBadge status={order.shipment?.status ?? order.status} /></td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted">No orders yet. Book your first shipment to get started.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
