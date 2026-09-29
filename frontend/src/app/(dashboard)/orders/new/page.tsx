import { getCurrentUser, getSessionToken } from "@/lib/auth";
import { addressClient, callUnary } from "@/lib/grpc/client";
import type { AddressMsg } from "@/lib/grpc/mappers";
import { NewOrderForm } from "@/components/orders/NewOrderForm";

export default async function NewOrderPage() {
  const user = await getCurrentUser();
  const token = await getSessionToken();
  if (!user || !token) return null;

  interface ListAddressesResponse { addresses: AddressMsg[] }
  const data = await callUnary<object, ListAddressesResponse>(addressClient, "listAddresses", { typeFilter: "PICKUP" }, token);

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New Order</h1>
        <p className="text-sm text-muted">Enter shipment details to compare live courier rates and book.</p>
      </div>
      <NewOrderForm pickupAddresses={data.addresses} />
    </div>
  );
}
