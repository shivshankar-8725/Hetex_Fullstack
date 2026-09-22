import { NextResponse } from "next/server";
import { z } from "zod";
import { authClient, callUnary, toHttpError } from "@/lib/grpc/client";
import { setSessionCookie } from "@/lib/auth";

const schema = z.object({ email: z.string().email(), code: z.string().length(6) });

interface AuthResponse {
  token: string;
  userId: string;
  name: string;
  role: string;
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const auth = await callUnary<object, AuthResponse>(authClient, "verifyEmailOtp", parsed.data);
    await setSessionCookie(auth.token);
    return NextResponse.json({ user: { id: auth.userId, name: auth.name, role: auth.role } });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
