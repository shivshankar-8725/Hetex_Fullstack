import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { walletClient, callUnary, toHttpError } from "@/lib/grpc/client";

export async function GET() {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    interface WalletResponse { balance: number; transactions: unknown[] }
    const data = await callUnary<object, WalletResponse>(walletClient, "getWallet", {}, token);
    return NextResponse.json({ wallet: { balance: data.balance, transactions: data.transactions } });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
