import { NextResponse } from "next/server";
import { z } from "zod";
import { authClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({ email: z.string().email() });

interface RequestPasswordResetResponse {
  email: string;
  devOtp?: string;
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });

  try {
    const res = await callUnary<object, RequestPasswordResetResponse>(authClient, "requestPasswordReset", parsed.data);
    return NextResponse.json(res);
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
