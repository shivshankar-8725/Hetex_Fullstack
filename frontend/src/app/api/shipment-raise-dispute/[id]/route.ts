import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { shipmentClient, callUnary, toHttpError } from "@/lib/grpc/client";

/** Demo trigger standing in for a courier's post-pickup weight-check flagging a mismatch. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const dispute = await callUnary(shipmentClient, "raiseWeightDispute", { shipmentId: id }, token);
    return NextResponse.json({ dispute });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
