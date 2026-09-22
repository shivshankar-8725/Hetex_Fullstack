import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { analyticsClient, callUnary, toHttpError } from "@/lib/grpc/client";

export async function GET() {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await callUnary(analyticsClient, "getAnalytics", {}, token);
    return NextResponse.json(data);
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
