import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { walletClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({ amount: z.number().positive().max(1000000) });

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });

  try {
    interface RechargeResponse { balance: number }
    const data = await callUnary<object, RechargeResponse>(walletClient, "recharge", parsed.data, token);
    return NextResponse.json({ balance: data.balance });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
