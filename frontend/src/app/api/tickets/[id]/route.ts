import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { ticketClient, callUnary, toHttpError } from "@/lib/grpc/client";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const ticket = await callUnary(ticketClient, "getTicket", { ticketId: id }, token);
    return NextResponse.json({ ticket });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
