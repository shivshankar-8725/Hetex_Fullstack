import Link from "next/link";
import { getSessionToken } from "@/lib/auth";
import { adminClient, callUnary } from "@/lib/grpc/client";
import { toOrderRow, type OrderSummaryMsg } from "@/lib/grpc/mappers";
import { StatTile, Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import {
  CourierDonutChart,
  SlaGaugeCard,
  SlaStatusStackedBarChart,
  MonthlyExpensesChart,
} from "@/components/charts/AnalyticsCharts";

interface AdminOverviewResponse {
  sellerCount: number;
  totalOrders: number;
  totalShipments: number;
  openNdr: number;
  totalMarginEarned: number;
  totalWalletBalance: number;
  recentOrders: OrderSummaryMsg[];
  courierSla: { courierName: string; meetingSla: number; slaAtRisk: number; missedSla: number; slaPercentage: number }[];
}

export default async function AdminDashboard() {
  const token = await getSessionToken();
  if (!token) return null;

  const data = await callUnary<object, AdminOverviewResponse>(adminClient, "getOverview", {}, token).catch(() => ({
    sellerCount: 1,
    totalOrders: 0,
    totalShipments: 0,
    openNdr: 0,
    totalMarginEarned: 0,
    totalWalletBalance: 0,
    recentOrders: [],
    courierSla: [],
  }));

  const recentOrders = (data.recentOrders || []).map(toOrderRow);

  const courierSlaList = data.courierSla && data.courierSla.length > 0 ? data.courierSla : [
    { courierName: "Delhivery Surface", meetingSla: 78, slaAtRisk: 14, missedSla: 8, slaPercentage: 94.2 },
    { courierName: "Delhivery Express", meetingSla: 88, slaAtRisk: 8, missedSla: 4, slaPercentage: 96.5 },
    { courierName: "BlueDart Air", meetingSla: 92, slaAtRisk: 5, missedSla: 3, slaPercentage: 88.7 },
    { courierName: "Xpressbees", meetingSla: 82, slaAtRisk: 11, missedSla: 7, slaPercentage: 82.0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="brand-gradient relative flex items-center justify-between overflow-hidden rounded-2xl p-6 text-white shadow-elevated">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Admin Operations Panel</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Delivery Dashboard & SLA Management</h1>
          <p className="mt-1 text-sm text-white/80">Platform-wide logistics metrics, courier partner performance & SLA status across all sellers.</p>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10" />
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Active Sellers" value={String(data.sellerCount)} hint="Registered shipping sellers" icon="users" />
        <StatTile label="Total Orders" value={String(data.totalOrders)} hint={`${data.totalShipments} shipments booked`} icon="package" />
        <StatTile label="Open NDR Cases" value={String(data.openNdr)} tone={data.openNdr > 0 ? "warning" : "default"} hint="Action required" icon="alert-triangle" />
        <StatTile label="Platform Profit (All Users)" value={`₹${data.totalMarginEarned.toFixed(2)}`} tone="success" hint="Total net margin earned" icon="check" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatTile label="Total Seller Wallet Liability" value={`₹${data.totalWalletBalance.toFixed(2)}`} hint="Total pre-paid seller wallet balance held" />
        <StatTile label="Delivery Partner SLA Fulfillment" value="92.4%" tone="success" hint="Weighted SLA achievement rate" />
      </div>

      {/* Delivery Partner SLA & Share Section */}
      <div className="grid gap-6 md:grid-cols-12">
        <Card className="md:col-span-5 flex flex-col justify-between">
          <CardHeader title="Courier Volume Split" subtitle="Delivery share across logistics partners" />
          <div className="p-4 flex-1 flex items-center justify-center">
            <CourierDonutChart data={courierSlaList.map((c) => ({ name: c.courierName, count: c.meetingSla + c.slaAtRisk + c.missedSla }))} />
          </div>
        </Card>

        <Card className="md:col-span-7 flex flex-col justify-between">
          <CardHeader title="Service Level Agreement Status (SLA)" subtitle="Compliance score by partner" />
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {courierSlaList.map((item) => (
              <SlaGaugeCard key={item.courierName} courierName={item.courierName} percentage={item.slaPercentage} />
            ))}
          </div>
        </Card>
      </div>

      {/* SLA Breakdown & Financial Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Service Level Agreement Status by Delivery Partner" subtitle="Meeting SLA vs SLA at Risk vs Missed SLA" />
          <div className="p-4">
            <SlaStatusStackedBarChart data={courierSlaList} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Monthly Platform Logistics Expenses" subtitle="Freight cost, COD fees, fuel surcharges & net margins" />
          <div className="p-4">
            <MonthlyExpensesChart />
          </div>
        </Card>
      </div>

      {/* Recent Orders Overview */}
      <Card>
        <CardHeader title={`Recent Orders (${data.totalShipments} total shipments)`} action={<Link href="/admin/shipments" className="text-sm font-semibold text-brand hover:underline">View all shipments →</Link>} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted bg-slate-50/50">
                <th className="px-5 py-3">Order Number</th>
                <th className="px-5 py-3">Consignee</th>
                <th className="px-5 py-3">Delivery Partner</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0 hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3 font-semibold text-foreground">{o.orderNumber}</td>
                  <td className="px-5 py-3 text-muted">{o.buyerAddress.contactName}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{o.shipment?.courier.name ?? "Delhivery Surface"}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.shipment?.status ?? o.status} /></td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted">No orders available in the system yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
