import { NextResponse } from "next/server";
import { z } from "zod";
import { shipmentClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({
  awbNumber: z.string(),
  status: z.enum(["MANIFESTED", "PICKUP_SCHEDULED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "NDR", "RTO_INITIATED", "RTO_DELIVERED"]),
  description: z.string(),
  location: z.string(),
});

/**
 * The endpoint a real courier's webhook would call on status change. Kept separate from
 * /api/shipments/[id]/simulate (which is only a demo trigger) so a live integration has
 * a stable, unauthenticated-by-courier-signature endpoint to point at later.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    await callUnary(shipmentClient, "receiveWebhook", parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
