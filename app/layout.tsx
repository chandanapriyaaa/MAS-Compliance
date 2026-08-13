import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Trade Compliance Copilot",
  description:
    "Multi-agent HS classification, DGFT scheme cross-check, duty calculation, and compliant documentation for Indian exporters and CHAs.",
};

// Applied before first paint to avoid a theme flash.
const noFlash = `(function(){try{var t=localStorage.getItem('theme');if(t){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body>
        <div className="flex min-h-screen flex-col">
          <Nav />
          <main className="mx-auto w-full max-w-content flex-1 px-5 py-10 sm:px-8">
            {children}
          </main>
          <footer className="border-t border-separator">
            <div className="mx-auto flex max-w-content flex-col gap-1 px-5 py-8 sm:px-8">
              <p className="text-[13px] text-label-secondary">
                Trade Compliance Copilot — HS classification, DGFT scheme
                cross-check, duty, and documentation with human-in-the-loop
                escalation.
              </p>
              <p className="text-xs text-label-tertiary">
                Drafts are machine-generated and must be verified by a licensed
                customs broker before filing.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
