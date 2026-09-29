import { NextResponse } from "next/server";
import { z } from "zod";
import { authClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    interface SendPhoneOtpResponse {
      phone: string;
      devOtp?: string;
    }

    const data = await callUnary<object, SendPhoneOtpResponse>(authClient, "sendPhoneOtp", {
      phone: parsed.data.phone,
    });

    return NextResponse.json({
      success: true,
      phone: data.phone,
      devOtp: data.devOtp,
      message: "Phone verification OTP sent successfully",
    });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
