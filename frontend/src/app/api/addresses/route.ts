import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { addressClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({
  type: z.enum(["PICKUP", "BUYER"]),
  label: z.string().min(1),
  contactName: z.string().min(1),
  phone: z.string().min(10),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().length(6),
  isDefault: z.boolean().optional(),
});

export async function GET(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = new URL(request.url).searchParams.get("type");
  try {
    interface ListAddressesResponse { addresses: unknown[] }
    const data = await callUnary<object, ListAddressesResponse>(addressClient, "listAddresses", { typeFilter: type ?? "" }, token);
    return NextResponse.json({ addresses: data.addresses });
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
    const address = await callUnary(addressClient, "createAddress", {
      type: parsed.data.type,
      label: parsed.data.label,
      contactName: parsed.data.contactName,
      phone: parsed.data.phone,
      addressLine1: parsed.data.addressLine1,
      addressLine2: parsed.data.addressLine2 ?? "",
      city: parsed.data.city,
      state: parsed.data.state,
      pincode: parsed.data.pincode,
      isDefault: parsed.data.isDefault ?? false,
    }, token);
    return NextResponse.json({ address }, { status: 201 });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
