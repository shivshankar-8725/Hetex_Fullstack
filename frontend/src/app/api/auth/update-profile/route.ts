import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { authClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({
  name: z.string().optional(),
  businessName: z.string().optional(),
});

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  try {
    const profile = await callUnary(authClient, "updateProfile", {
      name: parsed.data.name || "",
      business_name: parsed.data.businessName || "",
    }, token);
    return NextResponse.json({ profile });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
