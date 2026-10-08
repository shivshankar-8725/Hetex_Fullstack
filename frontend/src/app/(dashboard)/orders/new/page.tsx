import { getCurrentUser, getSessionToken } from "@/lib/auth";
import { addressClient, callUnary } from "@/lib/grpc/client";
import type { AddressMsg } from "@/lib/grpc/mappers";
import { NewOrderForm } from "@/components/orders/NewOrderForm";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export default async function NewOrderPage() {
  const user = await getCurrentUser();
  const token = await getSessionToken();
  if (!user || !token) return null;

  if (user.kycStatus !== "VERIFIED") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-danger">
          <Icon name="info" className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">eKYC Verification Required</h2>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            Without eKYC, you cannot create a new order. Please verify your PAN or Aadhaar to continue.
          </p>
        </div>
        <Link href="/settings/profile" className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
          Complete eKYC Now
        </Link>
      </div>
    );
  }

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
