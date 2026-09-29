import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { shipmentClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({ shipmentId: z.string().min(1) });

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid shipment ID" }, { status: 400 });

  try {
    interface LiveTrackingResponse {
      awbNumber: string;
      status: string;
      currentLocation: string;
      courierName: string;
      destinationCity: string;
      expectedDeliveryDate: string;
      events: { id: string; status: string; description: string; location: string; timestamp: string }[];
      isLive: boolean;
      message: string;
    }

    const data = await callUnary<{ shipmentId: string }, LiveTrackingResponse>(
      shipmentClient,
      "getLiveTracking",
      { shipmentId: parsed.data.shipmentId },
      token
    );

    return NextResponse.json(data);
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
