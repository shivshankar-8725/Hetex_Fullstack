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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Courier Partners</h1>
        <p className="text-sm text-muted">Enable/disable partners and adjust their base rate. Adding a real partner later means writing one adapter class — the panel below stays the same.</p>
      </div>
      <Card>
        <CardHeader title={`${couriers.length} Partners`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3">Courier</th>
                <th className="px-5 py-3">Base Rate/kg</th>
                <th className="px-5 py-3">Rating</th>
                <th className="px-5 py-3">ETA</th>
                <th className="px-5 py-3">RTO Risk</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {couriers.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: c.logoColor }} />
                    {c.name}
                  </td>
                  <td className="px-5 py-3">₹{c.baseRatePerKg}</td>
                  <td className="px-5 py-3">★ {c.rating}</td>
                  <td className="px-5 py-3">{c.etaMinDays}-{c.etaMaxDays}d</td>
                  <td className="px-5 py-3">{c.rtoRiskPercent}%</td>
                  <td className="px-5 py-3"><CourierToggle courierId={c.id} active={c.active} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
