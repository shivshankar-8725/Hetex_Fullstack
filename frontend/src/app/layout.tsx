import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HetEx | Multi-Courier Shipping Platform",
  description: "Compare courier rates, book shipments, and track deliveries across every major courier — all from one dashboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
