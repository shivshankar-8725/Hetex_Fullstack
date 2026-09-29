import { NextResponse } from "next/server";
import { z } from "zod";
import { authClient, callUnary, toHttpError } from "@/lib/grpc/client";
import { setSessionCookie } from "@/lib/auth";

const schema = z.object({
  phone: z.string().min(10),
  code: z.string().min(4, "Enter 6-digit OTP code"),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    interface AuthResponse {
      token: string;
      userId: string;
      name: string;
      role: string;
    }

    const data = await callUnary<object, AuthResponse>(authClient, "verifyPhoneOtp", {
      phone: parsed.data.phone,
      code: parsed.data.code,
    });

    await setSessionCookie(data.token);
    return NextResponse.json({ success: true, userId: data.userId, name: data.name });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
