import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { authClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({
  gstNumber: z.string().length(15),
});

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid 15-character GSTIN" }, { status: 400 });

  try {
    const result = await callUnary(authClient, "requestGstOtp", {
      gstNumber: parsed.data.gstNumber,
    }, token);
    return NextResponse.json(result);
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
