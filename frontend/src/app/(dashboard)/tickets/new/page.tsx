import { getSessionToken } from "@/lib/auth";
import { orderClient, callUnary } from "@/lib/grpc/client";
import type { OrderSummaryMsg } from "@/lib/grpc/mappers";
import { NewTicketForm } from "@/components/tickets/NewTicketForm";

export default async function NewTicketPage() {
  const token = await getSessionToken();
  if (!token) return null;

  interface ListOrdersResponse { orders: OrderSummaryMsg[] }
  const data = await callUnary<object, ListOrdersResponse>(orderClient, "listOrders", { statusFilter: "" }, token);
  const orders = data.orders
    .filter((o) => o.hasShipment && o.shipment)
    .map((o) => ({ id: o.id, orderNumber: o.orderNumber, courierName: o.shipment!.courier.name, awbNumber: o.shipment!.awbNumber }));

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New Support Ticket</h1>
        <p className="text-sm text-muted">Your inquiry goes straight to the courier handling this shipment.</p>
      </div>
      <NewTicketForm orders={orders} />
    </div>
  );
}
