import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { rateClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({
  fromPincode: z.string().length(6),
  toPincode: z.string().length(6),
  weight: z.number().positive(),
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  paymentMode: z.enum(["COD", "PREPAID"]),
  codAmount: z.number().min(0).default(0),
});

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  try {
    const data = await callUnary(rateClient, "getRates", parsed.data, token);
    return NextResponse.json(data);
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
