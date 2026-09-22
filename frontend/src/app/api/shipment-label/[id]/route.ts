import { getSessionToken } from "@/lib/auth";
import { shipmentClient, callUnary, toHttpError } from "@/lib/grpc/client";

interface PdfResponse { content: Buffer; filename: string }

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await getSessionToken();
  if (!token) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  try {
    const data = await callUnary<object, PdfResponse>(shipmentClient, "getLabelPdf", { shipmentId: id }, token);
    return new Response(new Uint8Array(data.content), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${data.filename}"` },
    });
  } catch (err) {
    const httpError = toHttpError(err);
    return new Response(httpError.message, { status: httpError.status });
  }
}
