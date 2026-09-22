import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { ticketClient, callUnary, toHttpError } from "@/lib/grpc/client";

export async function GET() {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    interface ListTicketsResponse { tickets: unknown[] }
    const data = await callUnary<object, ListTicketsResponse>(ticketClient, "listTickets", {}, token);
    return NextResponse.json({ tickets: data.tickets });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}

const schema = z.object({ orderId: z.string().min(1), subject: z.string().min(1), message: z.string().min(1) });

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  try {
    const ticket = await callUnary(ticketClient, "createTicket", parsed.data, token);
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
