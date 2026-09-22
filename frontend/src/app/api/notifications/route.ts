import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { notificationClient, callUnary, toHttpError } from "@/lib/grpc/client";

export async function GET() {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    interface ListNotificationsResponse { notifications: unknown[] }
    const data = await callUnary<object, ListNotificationsResponse>(notificationClient, "listNotifications", {}, token);
    return NextResponse.json({ notifications: data.notifications });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
