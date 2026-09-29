import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionToken } from "@/lib/auth";
import { authClient, callUnary, toHttpError } from "@/lib/grpc/client";

const schema = z.object({
  documentType: z.enum(["PAN", "AADHAAR", "GST"]),
  documentNumber: z.string().min(5),
  referenceId: z.string().optional().default(""),
  otp: z.string().min(4, "Enter 6-digit OTP code"),
  consent: z.boolean().refine((val) => val === true, "Consent is required"),
});

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    interface ProfileResponse {
      id: string;
      kycStatus: string;
      panNumber: string;
      gstNumber: string;
    }

    const data = await callUnary<object, ProfileResponse>(
      authClient,
      "verifyKycOtp",
      {
        documentType: parsed.data.documentType,
        documentNumber: parsed.data.documentNumber,
        referenceId: parsed.data.referenceId,
        otp: parsed.data.otp,
        consent: parsed.data.consent,
      },
      token
    );

    return NextResponse.json({
      success: true,
      kycStatus: data.kycStatus,
      panNumber: data.panNumber,
      gstNumber: data.gstNumber,
      message: "eKYC verification completed successfully!",
    });
  } catch (err) {
    const httpError = toHttpError(err);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
