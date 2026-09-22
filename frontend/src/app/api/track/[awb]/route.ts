import { NextResponse } from "next/server";
import { shipmentClient, callUnary, toHttpError } from "@/lib/grpc/client";

export async function GET(_request: Request, { params }: { params: Promise<{ awb: string }> }) {
  const { awb } = await params;
  try {
    interface TrackPublicResponse {
      awbNumber: string; status: string; currentLocation: string; courierName: string; destinationCity: string;
      events: unknown[]; brandName: string; primaryColor: string; logoUrl: string;
    }
    const data = await callUnary<object, TrackPublicResponse>(shipmentClient, "trackPublic", { awbNumber: awb });
    return NextResponse.json({
      awbNumber: data.awbNumber,
      status: data.status,
      currentLocation: data.currentLocation,
      courierName: data.courierName,
      destinationCity: data.destinationCity,
      events: data.events,
      branding: { brandName: data.brandName, primaryColor: data.primaryColor, logoUrl: data.logoUrl || null },
    });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
