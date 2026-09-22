import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { adminClient, callUnary, toHttpError } from "@/lib/grpc/client";

export async function GET() {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    interface ListCommissionRulesResponse { rules: unknown[]; couriers: unknown[] }
    const data = await callUnary<object, ListCommissionRulesResponse>(adminClient, "listCommissionRules", {}, token);
    return NextResponse.json({ rules: data.rules, couriers: data.couriers });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}

const schema = z.object({
  courierId: z.string().nullable(),
  minWeight: z.number().min(0),
  maxWeight: z.number().positive(),
  marginType: z.enum(["FLAT", "PERCENT"]),
  marginValue: z.number().positive(),
});

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const rule = await callUnary(adminClient, "createCommissionRule", { ...parsed.data, courierId: parsed.data.courierId ?? "" }, token);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
