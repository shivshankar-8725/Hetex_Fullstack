import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { shipmentClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({ status: z.enum(["RESOLVED", "REJECTED"]), resolutionNote: z.string().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    await callUnary(shipmentClient, "respondToWeightDispute", {
      disputeId: id,
      status: parsed.data.status,
      resolutionNote: parsed.data.resolutionNote ?? "",
    }, token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
