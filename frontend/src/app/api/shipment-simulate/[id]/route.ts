import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { shipmentClient, callUnary, toHttpError } from "@/lib/grpc/client";

/**
 * Demo-only trigger that stands in for a courier webhook firing: advances one shipment
 * to its next status. A live courier's real webhook would call /api/webhooks/tracking
 * instead of this route.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const shipment = await callUnary(shipmentClient, "simulateTracking", { shipmentId: id }, token);
    return NextResponse.json({ shipment });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
