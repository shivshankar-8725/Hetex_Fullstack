import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { ndrClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({ action: z.enum(["REATTEMPT", "RTO"]), notes: z.string().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    await callUnary(ndrClient, "actOnNdr", { ndrId: id, action: parsed.data.action, notes: parsed.data.notes ?? "" }, token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
