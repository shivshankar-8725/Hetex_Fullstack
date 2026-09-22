import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { authClient, callUnary } from "@/lib/grpc/client";

const JWT_SECRET = process.env.JWT_SECRET ?? "hetex-dev-secret-change-in-production";
const SESSION_COOKIE = "hetex_session";

export interface SessionPayload {
  userId: string;
  role: "SELLER" | "ADMIN";
}

interface JavaJwtClaims {
  sub: string;
  role: string;
}

/** The JWT is issued by the Java backend (AuthService); Next.js only verifies it locally for route-guarding. */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as JavaJwtClaims;
    return { userId: decoded.sub, role: decoded.role as "SELLER" | "ADMIN" };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return verifySessionToken(token);
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  businessName: string | null;
  role: "SELLER" | "ADMIN";
  kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
  panNumber: string | null;
  gstNumber: string | null;
  wallet: { balance: number };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await getSessionToken();
  if (!token || !verifySessionToken(token)) return null;

  try {
    interface ProfileResponse {
      id: string;
      name: string;
      email: string;
      phone: string;
      businessName: string;
      role: string;
      kycStatus: string;
      panNumber: string;
      gstNumber: string;
      walletBalance: number;
    }
    const profile = await callUnary<object, ProfileResponse>(authClient, "getProfile", {}, token);
    return {
      id: profile.id,
      name: profile.name,
      email: profile.email || null,
      phone: profile.phone,
      businessName: profile.businessName || null,
      role: profile.role as "SELLER" | "ADMIN",
      kycStatus: profile.kycStatus.replace("KYC_", "") as "PENDING" | "VERIFIED" | "REJECTED",
      panNumber: profile.panNumber || null,
      gstNumber: profile.gstNumber || null,
      wallet: { balance: profile.walletBalance },
    };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE };
