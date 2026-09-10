import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";

import { Providers } from "@/app/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lean CRM",
  description: "A lean B2B sales CRM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-50`}>
        <Providers>
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
              <Link
                href="/leads"
                className="text-sm font-semibold tracking-tight text-slate-900"
              >
                Lean CRM
              </Link>
              <span className="ml-3 text-sm text-slate-400">Sales</span>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
