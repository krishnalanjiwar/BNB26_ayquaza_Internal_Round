import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Fair Drop — Bot-Resistant Ticket Sales",
  description:
    "A high-concurrency ticketing platform with virtual queue, anti-bot protection, atomic ticket allocation, and fairness analytics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-fd-bg text-white/[0.92] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
