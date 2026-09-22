import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { ticketClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({ message: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });

  try {
    const ticket = await callUnary(ticketClient, "addTicketMessage", { ticketId: id, message: parsed.data.message }, token);
    return NextResponse.json({ ticket });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
