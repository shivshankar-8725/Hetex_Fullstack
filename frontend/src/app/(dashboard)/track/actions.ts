"use server";

import { shipmentClient, callUnary } from "@/lib/grpc/client";

export async function trackOrderAction(awbNumber: string) {
  try {
    const result = await callUnary<any, any>(shipmentClient, "trackPublic", { awbNumber });
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.details || error.message || "Failed to track order" };
  }
}
