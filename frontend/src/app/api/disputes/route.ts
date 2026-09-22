import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { shipmentClient, callUnary, toHttpError } from "@/lib/grpc/client";

export async function GET() {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    interface ListWeightDisputesResponse { disputes: unknown[] }
    const data = await callUnary<object, ListWeightDisputesResponse>(shipmentClient, "listWeightDisputes", {}, token);
    return NextResponse.json({ disputes: data.disputes });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
