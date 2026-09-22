import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { rateClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({ fromPincode: z.string().length(6), toPincode: z.string().length(6) });

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter valid 6-digit pincodes" }, { status: 400 });

  try {
    const data = await callUnary(rateClient, "checkServiceability", parsed.data, token);
    return NextResponse.json(data);
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
