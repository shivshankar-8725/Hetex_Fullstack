import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { channelClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({ platform: z.enum(["SHOPIFY", "WOOCOMMERCE", "AMAZON", "FLIPKART"]), storeName: z.string().min(1) });

export async function GET() {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    interface ListChannelsResponse { connections: unknown[] }
    const data = await callUnary<object, ListChannelsResponse>(channelClient, "listChannels", {}, token);
    return NextResponse.json({ connections: data.connections });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}

/** Mocks an OAuth handshake — a live version would redirect to the platform's real OAuth consent screen. */
export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const connection = await callUnary(channelClient, "connectChannel", parsed.data, token);
    return NextResponse.json({ connection }, { status: 201 });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
