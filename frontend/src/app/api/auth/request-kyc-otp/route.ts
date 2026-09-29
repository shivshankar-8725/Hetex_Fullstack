import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { authClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({
  documentType: z.enum(["PAN", "AADHAAR", "GST"]),
  documentNumber: z.string().min(5, "Invalid document number"),
});

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    interface RequestKycOtpResponse {
      documentType: string;
      documentNumber: string;
      referenceId: string;
      devOtp?: string;
    }

    const data = await callUnary<object, RequestKycOtpResponse>(
      authClient,
      "requestKycOtp",
      {
        documentType: parsed.data.documentType,
        documentNumber: parsed.data.documentNumber,
      },
      token
    );

    return NextResponse.json({
      success: true,
      referenceId: data.referenceId,
      devOtp: data.devOtp,
      message: `OTP dispatched for ${parsed.data.documentType} verification`,
    });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
