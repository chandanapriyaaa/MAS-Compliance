import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trade Compliance Copilot",
  description:
    "Multi-agent HS classification, DGFT scheme cross-check, duty calculation, and compliant documentation for Indian exporters and CHAs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-slate-200">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <a href="/" className="text-lg font-semibold tracking-tight">
                Trade Compliance Copilot
              </a>
              <nav className="flex gap-4 text-sm text-slate-600">
                <a href="/dashboard/shipments" className="hover:text-slate-900">
                  Shipments
                </a>
                <a href="/dashboard/review-queue" className="hover:text-slate-900">
                  Review Queue
                </a>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
