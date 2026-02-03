import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
// Import your new Sidebar component
import { Sidebar } from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SEO Auditor Dashboard",
  description: "A comprehensive SEO auditing tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex h-screen bg-zinc-50`}
      >
        {/* The Sidebar stays fixed on the left */}
        <Sidebar />
        
        {/* The Main area takes up the rest of the space and scrolls */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}