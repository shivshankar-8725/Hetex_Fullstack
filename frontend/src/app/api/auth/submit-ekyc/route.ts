import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { authClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({
  panNumber: z.string().length(10),
  gstNumber: z.string().length(15),
  gstOtp: z.string().min(4),
  consent: z.literal(true),
});

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid PAN, GSTIN, the OTP sent to your GST-registered mobile, and accept the consent to continue" }, { status: 400 });

  try {
    const profile = await callUnary(authClient, "submitEkyc", {
      panNumber: parsed.data.panNumber,
      gstNumber: parsed.data.gstNumber,
      gstOtp: parsed.data.gstOtp,
      consent: parsed.data.consent,
    }, token);
    return NextResponse.json({ profile });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
