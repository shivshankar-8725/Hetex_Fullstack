import Link from "next/link";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { Button } from "@/components/ui/Button";
import { BulkUploadButton } from "@/components/orders/BulkUploadButton";

export default function OrdersPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Orders</h1>
          <p className="text-sm text-muted">Track and manage every shipment booked through HetEx.</p>
        </div>
        <div className="flex gap-3">
          <BulkUploadButton />
          <Link href="/orders/new"><Button>+ New Order</Button></Link>
        </div>
      </div>
      <OrdersTable />
    </div>
  );
}
