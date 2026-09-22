import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { orderClient, callUnary, toHttpError } from "@/lib/grpc/client";
import { toOrderRow, type OrderSummaryMsg } from "@/lib/grpc/mappers";

const schema = z.object({
  pickupAddressId: z.string(),
  buyerAddressId: z.string(),
  courierId: z.string(),
  sellerPrice: z.number().positive(),
  margin: z.number().min(0),
  itemDescription: z.string().min(1),
  declaredValue: z.number().positive(),
  weight: z.number().positive(),
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  paymentMode: z.enum(["COD", "PREPAID"]),
  codAmount: z.number().min(0).default(0),
});

export async function GET(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = new URL(request.url).searchParams.get("status");
  try {
    interface ListOrdersResponse { orders: OrderSummaryMsg[] }
    const data = await callUnary<object, ListOrdersResponse>(orderClient, "listOrders", { statusFilter: status ?? "" }, token);
    return NextResponse.json({ orders: data.orders.map(toOrderRow) });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  try {
    interface CreateOrderResponse { orderId: string; orderNumber: string; awbNumber: string }
    const data = await callUnary<object, CreateOrderResponse>(orderClient, "createOrder", parsed.data, token);
    return NextResponse.json({ orderId: data.orderId, orderNumber: data.orderNumber, awbNumber: data.awbNumber }, { status: 201 });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
