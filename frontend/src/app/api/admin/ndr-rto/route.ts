import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { adminClient, callUnary, toHttpError } from "@/lib/grpc/client";

export async function GET() {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    interface NdrRtoRow { awbNumber: string; sellerName: string; courierName: string; reason: string; status: string }
    interface ListNdrRtoOversightResponse { shipments: NdrRtoRow[] }
    const data = await callUnary<object, ListNdrRtoOversightResponse>(adminClient, "listNdrRtoOversight", {}, token);
    const shipments = data.shipments.map((s) => ({
      id: s.awbNumber,
      awbNumber: s.awbNumber,
      status: s.status,
      courier: { name: s.courierName },
      order: { user: { businessName: s.sellerName, name: s.sellerName } },
      ndrRecords: s.reason ? [{ reason: s.reason }] : [],
    }));
    return NextResponse.json({ shipments });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
