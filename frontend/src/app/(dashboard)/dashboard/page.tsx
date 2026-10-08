import Link from "next/link";
import { getCurrentUser, getSessionToken } from "@/lib/auth";
import { orderClient, analyticsClient, callUnary } from "@/lib/grpc/client";
import { toOrderRow, type OrderSummaryMsg } from "@/lib/grpc/mappers";
import { StatTile, Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  CourierDonutChart,
  SlaGaugeCard,
  SlaStatusStackedBarChart,
  MonthlyExpensesChart,
} from "@/components/charts/AnalyticsCharts";

interface ListOrdersResponse {
  orders: OrderSummaryMsg[];
}

interface AnalyticsResponse {
  courierSplit: { name: string; count: number; avgDeliveryDays?: number; slaComplianceRate?: number }[];
  courierSla: { courierName: string; meetingSla: number; slaAtRisk: number; missedSla: number; slaPercentage: number }[];
  monthlyExpenses: { month: string; freightCharges: number; codHandling: number; fuelSurcharge: number; marginEarned: number }[];
  totals: {
    orders: number;
    delivered: number;
    rto: number;
    rtoPercent: number;
    totalInvestment: number;
    revenueGenerated: number;
    avgDeliveryDays: number;
    overallSlaRate: number;
  };
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const token = await getSessionToken();
  if (!user || !token) return null;

  const [ordersData, analyticsData] = await Promise.all([
    callUnary<object, ListOrdersResponse>(orderClient, "listOrders", { statusFilter: "" }, token).catch(() => ({ orders: [] })),
    callUnary<object, AnalyticsResponse>(analyticsClient, "getAnalytics", {}, token).catch(() => null),
  ]);

  const orders = (ordersData.orders || []).map(toOrderRow);
  const recentOrders = orders.slice(0, 6);

  const totals = analyticsData?.totals || {
    totalInvestment: 0,
    revenueGenerated: 0,
    avgDeliveryDays: 0,
    overallSlaRate: 0,
    orders: orders.length,
    delivered: orders.filter((o) => o.shipment?.status === "DELIVERED").length,
    rto: orders.filter((o) => o.shipment?.status === "RTO_INITIATED" || o.shipment?.status === "RTO_DELIVERED").length,
    rtoPercent: 0,
  };

  const courierSlaList = analyticsData?.courierSla && analyticsData.courierSla.length > 0 ? analyticsData.courierSla : [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="brand-gradient relative flex flex-col sm:flex-row sm:items-center justify-between overflow-hidden rounded-2xl p-6 text-white shadow-elevated gap-4">
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Delivery Dashboard & SLA Performance</h1>
          <p className="mt-1 text-sm text-white/80">Welcome back, {user.name.split(" ")[0]}. Track live courier performance & SLA metrics.</p>
        </div>
        <Link href="/orders/new" className="relative z-10 shrink-0">
          <Button className="!bg-white !text-brand shadow-elevated hover:!bg-white/90 font-semibold px-5 py-2.5">+ Create Shipment</Button>
        </Link>
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/10" />
      </div>

      {/* Top KPI Cards (Investment, Revenue, Avg Days, SLA Rate) */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Wallet Balance" value={`₹${(user.wallet?.balance ?? 0).toLocaleString()}`} hint="Available funds for booking" icon="wallet" tone="success" />
        <StatTile label="Total Shipments Booked" value={`${totals.orders}`} hint="Total orders processed" icon="package" />
        <StatTile label="Freight Investment" value={`₹${(totals.totalInvestment || 0).toLocaleString()}`} hint="Total shipping expenditure" icon="truck" />
        <StatTile label="Avg Delivery Time" value={`${totals.avgDeliveryDays || 0} Days`} hint="Overall fulfillment TAT" icon="check" />
      </div>

      {/* Charts Grid - Donut & SLA Gauges */}
      <div className="grid gap-6 md:grid-cols-12">
        <Card className="md:col-span-5 flex flex-col justify-between">
          <CardHeader title="Courier Shipment Share" subtitle="Distribution of total delivery volume" />
          <div className="p-4 flex-1 flex items-center justify-center">
            <CourierDonutChart data={analyticsData?.courierSplit || []} />
          </div>
        </Card>

        <Card className="md:col-span-7 flex flex-col justify-between">
          <CardHeader title="Delivery Partner SLA Compliance" subtitle="Fulfillment accuracy by individual partner" />
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {courierSlaList.map((item) => (
              <SlaGaugeCard key={item.courierName} courierName={item.courierName} percentage={item.slaPercentage} />
            ))}
          </div>
        </Card>
      </div>

      {/* Charts Grid - Monthly Expenses & SLA Status Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Monthly Logistics Expenses" subtitle="Cost breakdown by Freight, COD, Fuel & Margin" />
          <div className="p-4">
            <MonthlyExpensesChart data={analyticsData?.monthlyExpenses} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Service Level Agreement Status" subtitle="Performance breakdown by courier partner" />
          <div className="p-4">
            <SlaStatusStackedBarChart data={courierSlaList} />
          </div>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader title="Recent Shipments" action={<Link href="/orders" className="text-sm font-semibold text-brand hover:underline">View all orders →</Link>} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted bg-slate-50/50">
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Consignee / Buyer</th>
                <th className="px-5 py-3">Delivery Partner</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/orders/${order.id}`} className="font-semibold text-brand hover:underline">{order.orderNumber}</Link>
                  </td>
                  <td className="px-5 py-3 text-muted">{order.buyerAddress.contactName}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{order.shipment?.courier.name ?? "Delhivery Surface"}</td>
                  <td className="px-5 py-3"><StatusBadge status={order.shipment?.status ?? order.status} /></td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted">No orders yet. Book your first shipment to view live updates.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
