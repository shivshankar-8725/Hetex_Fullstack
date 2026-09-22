import { NextResponse } from "next/server";
import { z } from "zod";
import { authClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({ email: z.string().email() });

interface RegisterResponse {
  email: string;
  devOtp: string;
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const data = await callUnary<object, RegisterResponse>(authClient, "resendEmailOtp", parsed.data);
    return NextResponse.json({ email: data.email, devOtp: data.devOtp });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
