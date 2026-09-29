import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_HTTP_URL || "http://localhost:8080";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    const response = await fetch(`${BACKEND_URL}/api/webhooks/razorpay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": signature,
      },
      body: rawBody,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    console.error("Failed to forward Razorpay webhook:", err);
    return NextResponse.json(
      { error: "Internal webhook forward error" },
      { status: 500 }
    );
  }
}
