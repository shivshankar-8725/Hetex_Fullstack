import { notFound } from "next/navigation";
import { getCurrentUser, getSessionToken } from "@/lib/auth";
import { orderClient, callUnary, toHttpError } from "@/lib/grpc/client";
import { toOrderDetail, type OrderDetailMsg } from "@/lib/grpc/mappers";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { OrderActions } from "@/components/orders/OrderActions";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const token = await getSessionToken();
  if (!user || !token) return null;

  let order;
  try {
    const data = await callUnary<object, OrderDetailMsg>(orderClient, "getOrder", { orderId: id }, token);
    order = toOrderDetail(data);
  } catch (err) {
    if (toHttpError(err).status === 404) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{order.orderNumber}</h1>
          <p className="text-sm text-muted">Placed on {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <StatusBadge status={order.shipment?.status ?? order.status} />
      </div>

      {order.shipment && <OrderActions orderId={order.id} shipmentId={order.shipment.id} status={order.shipment.status} />}

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pickup</p>
          <p className="mt-2 font-medium">{order.pickupAddress.contactName}</p>
          <p className="text-sm text-muted">{order.pickupAddress.addressLine1}, {order.pickupAddress.city}, {order.pickupAddress.state} - {order.pickupAddress.pincode}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Consignee</p>
          <p className="mt-2 font-medium">{order.buyerAddress.contactName}</p>
          <p className="text-sm text-muted">{order.buyerAddress.addressLine1}, {order.buyerAddress.city}, {order.buyerAddress.state} - {order.buyerAddress.pincode}</p>
        </Card>
      </div>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Package</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div><p className="text-muted">Item</p><p className="font-medium">{order.itemDescription}</p></div>
          <div><p className="text-muted">Declared Value</p><p className="font-medium">₹{order.declaredValue}</p></div>
          <div><p className="text-muted">Actual Weight</p><p className="font-medium">{order.weight} kg</p></div>
          <div><p className="text-muted">Billable Weight</p><p className="font-medium">{order.billableWeight.toFixed(2)} kg</p></div>
          <div><p className="text-muted">Dimensions</p><p className="font-medium">{order.length}×{order.width}×{order.height} cm</p></div>
          <div><p className="text-muted">Payment</p><p className="font-medium">{order.paymentMode}{order.paymentMode === "COD" ? ` · ₹${order.codAmount}` : ""}</p></div>
          {order.shipment && <div><p className="text-muted">AWB</p><p className="font-mono font-medium">{order.shipment.awbNumber}</p></div>}
          {order.shipment && <div><p className="text-muted">Shipping Charge</p><p className="font-medium">₹{order.shipment.rateCharged.toFixed(2)}</p></div>}
        </div>
      </Card>

      {order.shipment && (
        <Card>
          <CardHeader title="Tracking Timeline" subtitle={`Courier: ${order.shipment.courier.name}`} />
          <div className="space-y-4 p-5">
            {[...order.shipment.trackingEvents].reverse().map((event) => (
              <div key={event.id} className="flex gap-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />
                <div>
                  <p className="text-sm font-medium text-foreground">{event.description}</p>
                  <p className="text-xs text-muted">{event.location} · {new Date(event.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {order.shipment?.ndrRecords && order.shipment.ndrRecords.length > 0 && (
        <Card>
          <CardHeader title="NDR History" />
          <div className="space-y-3 p-5 text-sm">
            {order.shipment.ndrRecords.map((r) => (
              <div key={r.id} className="rounded-lg bg-red-50 p-3">
                <p className="font-medium text-danger">Attempt {r.attemptNumber}: {r.reason}</p>
                <p className="text-xs text-muted">Action: {r.action} {r.notes ? `— ${r.notes}` : ""}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
