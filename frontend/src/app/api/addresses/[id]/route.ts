import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { addressClient, callUnary, toHttpError } from "@/lib/grpc/client";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await callUnary(addressClient, "deleteAddress", { id }, token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
