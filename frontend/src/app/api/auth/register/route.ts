import { NextResponse } from "next/server";
import { z } from "zod";
import { authClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10).max(10),
  password: z.string().min(6),
});

interface RegisterResponse {
  email: string;
  devOtp: string;
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  try {
    const data = await callUnary<object, RegisterResponse>(authClient, "register", parsed.data);
    // AUTH_MODE=mock: OTP is returned in the response instead of emailed, so the demo UI can show it.
    return NextResponse.json({ email: data.email, devOtp: data.devOtp }, { status: 201 });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
