import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { codClient, callUnary, toHttpError } from "@/lib/grpc/client";

export async function GET() {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    interface RemittanceRow { id: string; orderNumber: string; courierName: string; amount: number; status: string; settledAt: string }
    interface ListRemittancesResponse {
      remittances: RemittanceRow[];
      summary: { total: number; pending: number; processing: number; settled: number };
    }
    const data = await callUnary<object, ListRemittancesResponse>(codClient, "listRemittances", {}, token);
    const remittances = data.remittances.map((r) => ({
      id: r.id,
      amount: r.amount,
      status: r.status,
      settledAt: r.settledAt || null,
      shipment: { courier: { name: r.courierName }, order: { orderNumber: r.orderNumber } },
    }));
    return NextResponse.json({ remittances, summary: data.summary });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
