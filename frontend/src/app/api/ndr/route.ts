import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { ndrClient, callUnary, toHttpError } from "@/lib/grpc/client";

interface NdrRow {
  id: string;
  reason: string;
  attemptNumber: number;
  action: string;
  notes: string;
  shipmentAwb: string;
  courierName: string;
  orderNumber: string;
  buyerContactName: string;
  buyerCity: string;
}

export async function GET() {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    interface ListNdrResponse { records: NdrRow[] }
    const data = await callUnary<object, ListNdrResponse>(ndrClient, "listNdr", {}, token);
    const records = data.records.map((r) => ({
      id: r.id,
      reason: r.reason,
      attemptNumber: r.attemptNumber,
      action: r.action,
      notes: r.notes || null,
      shipment: {
        awbNumber: r.shipmentAwb,
        courier: { name: r.courierName },
        order: { orderNumber: r.orderNumber, buyerAddress: { contactName: r.buyerContactName, city: r.buyerCity } },
      },
    }));
    return NextResponse.json({ records });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
