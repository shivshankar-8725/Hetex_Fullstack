import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { orderClient, callUnary, toHttpError } from "@/lib/grpc/client";

/** CSV bulk order upload: creates DRAFT orders (unshipped queue) — the seller books each from the Orders page. */
export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const csvContent = await file.text();
  try {
    interface BulkUploadOrdersResponse { created: number; errors: string[] }
    const data = await callUnary<object, BulkUploadOrdersResponse>(orderClient, "bulkUploadOrders", { csvContent }, token);
    return NextResponse.json({ created: data.created, errors: data.errors });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
