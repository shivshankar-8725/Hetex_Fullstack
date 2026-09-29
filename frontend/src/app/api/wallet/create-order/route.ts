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
    interface CreatePaymentOrderResponse {
      razorpayOrderId: string;
      amount: number;
      currency: string;
      razorpayKeyId: string;
    }
    const data = await callUnary<{ amount: number }, CreatePaymentOrderResponse>(
      walletClient,
      "createPaymentOrder",
      { amount: parsed.data.amount },
      token
    );
    return NextResponse.json(data);
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
