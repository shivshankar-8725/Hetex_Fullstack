import { getSessionToken } from "@/lib/auth";
import { adminClient, callUnary } from "@/lib/grpc/client";
import type { CourierMsg } from "@/lib/grpc/mappers";
import { Card, CardHeader } from "@/components/ui/Card";
import { CourierToggle } from "@/components/admin/CourierToggle";

export default async function AdminCouriersPage() {
  const token = await getSessionToken();
  if (!token) return null;

  interface ListCouriersResponse { couriers: CourierMsg[] }
  const data = await callUnary<object, ListCouriersResponse>(adminClient, "listCouriers", {}, token);
  const couriers = [...data.couriers].sort((a, b) => a.name.localeCompare(b.name));

  const enabledCount = couriers.filter((c) => c.active).length;
  const disabledCount = couriers.length - enabledCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Delivery Company Management</h1>
          <p className="text-sm text-muted">
            Manage logistics partners dynamically. Status changes update the database instantly without requiring a code deployment.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Total Partners</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{couriers.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">Enabled Partners</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{enabledCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Disabled Partners</p>
          <p className="mt-1 text-2xl font-bold text-slate-600">{disabledCount}</p>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Logistics Companies"
          subtitle="Enable or disable delivery companies to control which couriers are offered during shipping rate calculations."
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-slate-50/50 text-xs font-semibold uppercase tracking-wider text-muted">
                <th className="px-6 py-3.5">Delivery Company</th>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Base Rate</th>
                <th className="px-6 py-3.5">Rating</th>
                <th className="px-6 py-3.5">ETA</th>
                <th className="px-6 py-3.5">RTO Risk</th>
                <th className="px-6 py-3.5">Status & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {couriers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 font-semibold text-foreground">
                    <div className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.logoColor }} />
                      <span>{c.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-muted">{c.code}</td>
                  <td className="px-6 py-4 font-medium text-foreground">₹{c.baseRatePerKg}/kg</td>
                  <td className="px-6 py-4 text-amber-600 font-medium">★ {c.rating}</td>
                  <td className="px-6 py-4 text-slate-600">{c.etaMinDays}-{c.etaMaxDays} days</td>
                  <td className="px-6 py-4 text-slate-600">{c.rtoRiskPercent}%</td>
                  <td className="px-6 py-4">
                    <CourierToggle courierId={c.id} active={c.active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
