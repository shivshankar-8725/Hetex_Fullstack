import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { walletClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string().optional().default(""),
  amount: z.number().positive(),
});

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 });

  try {
    interface VerifyPaymentResponse {
      success: boolean;
      balance: number;
      message: string;
    }
    const data = await callUnary<object, VerifyPaymentResponse>(
      walletClient,
      "verifyPayment",
      parsed.data,
      token
    );
    if (!data.success) {
      return NextResponse.json({ error: data.message || "Payment verification failed" }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
