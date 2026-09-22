import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { adminClient, callUnary, toHttpError } from "@/lib/grpc/client";

export async function GET() {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    interface ListCouriersResponse { couriers: unknown[] }
    const data = await callUnary<object, ListCouriersResponse>(adminClient, "listCouriers", {}, token);
    return NextResponse.json({ couriers: data.couriers });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}

const patchSchema = z.object({
  id: z.string(),
  active: z.boolean().optional(),
  baseRatePerKg: z.number().positive().optional(),
});

export async function PATCH(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const courier = await callUnary(adminClient, "updateCourier", {
      id: parsed.data.id,
      active: parsed.data.active ?? false,
      hasActive: parsed.data.active !== undefined,
      baseRatePerKg: parsed.data.baseRatePerKg ?? 0,
      hasBaseRatePerKg: parsed.data.baseRatePerKg !== undefined,
    }, token);
    return NextResponse.json({ courier });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
