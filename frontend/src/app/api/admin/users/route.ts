import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { adminClient, callUnary, toHttpError } from "@/lib/grpc/client";

export async function GET() {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    interface SellerRow { id: string; businessName: string; name: string; phone: string; kycStatus: string; orderCount: number; walletBalance: number }
    interface ListSellersResponse { sellers: SellerRow[] }
    const data = await callUnary<object, ListSellersResponse>(adminClient, "listSellers", {}, token);
    const users = data.sellers.map((s) => ({
      id: s.id,
      businessName: s.businessName || null,
      name: s.name,
      phone: s.phone,
      kycStatus: s.kycStatus.replace("KYC_", ""),
      wallet: { balance: s.walletBalance },
      _count: { orders: s.orderCount },
    }));
    return NextResponse.json({ users });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}

const adjustSchema = z.object({ userId: z.string(), amount: z.number(), reason: z.string().min(1) });

export async function PATCH(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const parsed = adjustSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    interface AdjustWalletResponse { balance: number }
    const data = await callUnary<object, AdjustWalletResponse>(adminClient, "adjustWallet", parsed.data, token);
    return NextResponse.json({ balance: data.balance });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
