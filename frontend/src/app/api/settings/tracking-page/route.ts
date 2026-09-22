import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { settingsClient, callUnary, toHttpError } from "@/lib/grpc/client";

export async function GET() {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const config = await callUnary(settingsClient, "getTrackingPageConfig", {}, token);
    return NextResponse.json({ config });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}

const schema = z.object({ brandName: z.string().min(1), primaryColor: z.string().min(4), logoUrl: z.string().url().optional().or(z.literal("")) });

export async function PATCH(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const config = await callUnary(settingsClient, "updateTrackingPageConfig", {
      brandName: parsed.data.brandName,
      primaryColor: parsed.data.primaryColor,
      logoUrl: parsed.data.logoUrl ?? "",
    }, token);
    return NextResponse.json({ config });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
