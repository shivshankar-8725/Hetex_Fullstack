import { getCurrentUser, getSessionToken } from "@/lib/auth";
import { addressClient, callUnary } from "@/lib/grpc/client";
import type { AddressMsg } from "@/lib/grpc/mappers";
import { AddressBook, type AddressRow } from "@/components/addresses/AddressBook";

export default async function AddressesPage() {
  const user = await getCurrentUser();
  const token = await getSessionToken();
  if (!user || !token) return null;

  interface ListAddressesResponse { addresses: AddressMsg[] }
  const data = await callUnary<object, ListAddressesResponse>(addressClient, "listAddresses", { typeFilter: "" }, token);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Address Book</h1>
        <p className="text-sm text-muted">Manage pickup warehouses and frequently used buyer addresses.</p>
      </div>
      <AddressBook initialAddresses={data.addresses as unknown as AddressRow[]} />
    </div>
  );
}
