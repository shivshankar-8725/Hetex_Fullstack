import { Suspense } from "react";
import { getSessionToken } from "@/lib/auth";
import { adminClient, callUnary } from "@/lib/grpc/client";
import { AdminShipmentsTable, type AllShipmentRow } from "@/components/admin/AdminShipmentsTable";

export default async function AdminShipmentsPage() {
  const token = await getSessionToken();
  if (!token) return null;

  interface ListAllShipmentsResponse { shipments: AllShipmentRow[] }
  const data = await callUnary<object, ListAllShipmentsResponse>(adminClient, "listAllShipments", {}, token);
  const shipments = [...(data.shipments ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">All Shipments & Tracking</h1>
        <p className="text-sm text-muted">Master tracking view across every registered seller.</p>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-muted">Loading shipments...</div>}>
        <AdminShipmentsTable shipments={shipments} />
      </Suspense>
    </div>
  );
}
