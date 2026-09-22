import { getSessionToken } from "@/lib/auth";
import { adminClient, callUnary } from "@/lib/grpc/client";
import type { CourierMsg } from "@/lib/grpc/mappers";
import { CommissionPanel, type Rule } from "@/components/admin/CommissionPanel";

interface CommissionRuleMsg {
  id: string;
  courierId: string;
  courierName: string;
  minWeight: number;
  maxWeight: number;
  marginType: string;
  marginValue: number;
}

export default async function AdminCommissionPage() {
  const token = await getSessionToken();
  if (!token) return null;

  interface ListCommissionRulesResponse { rules: CommissionRuleMsg[]; couriers: CourierMsg[] }
  const data = await callUnary<object, ListCommissionRulesResponse>(adminClient, "listCommissionRules", {}, token);
  const couriers = [...data.couriers].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Commission Rules</h1>
        <p className="text-sm text-muted">Define the margin HetEx earns per shipment, by courier and weight slab.</p>
      </div>
      <CommissionPanel initialRules={data.rules as unknown as Rule[]} couriers={couriers} />
    </div>
  );
}
