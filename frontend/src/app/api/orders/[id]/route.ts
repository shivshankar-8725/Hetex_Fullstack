import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { orderClient, callUnary, toHttpError } from "@/lib/grpc/client";
import { toOrderDetail, type OrderDetailMsg } from "@/lib/grpc/mappers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const data = await callUnary<object, OrderDetailMsg>(orderClient, "getOrder", { orderId: id }, token);
    return NextResponse.json({ order: toOrderDetail(data) });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
