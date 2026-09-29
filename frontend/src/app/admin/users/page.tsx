import { Suspense } from "react";
import { getSessionToken } from "@/lib/auth";
import { adminClient, callUnary } from "@/lib/grpc/client";
import { AdminUsersTable, type SellerRow } from "@/components/admin/AdminUsersTable";

export default async function AdminUsersPage() {
  const token = await getSessionToken();
  if (!token) return null;

  interface ListSellersResponse { sellers: SellerRow[] }
  const data = await callUnary<object, ListSellersResponse>(adminClient, "listSellers", {}, token);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-foreground">Sellers & Wallets</h1>
      
      <Suspense fallback={<div className="p-8 text-center text-muted">Loading sellers...</div>}>
        <AdminUsersTable sellers={data.sellers ?? []} />
      </Suspense>
    </div>
  );
}
