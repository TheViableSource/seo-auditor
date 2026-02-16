import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/ui/toast-provider";
import { WelcomeModal } from "@/components/WelcomeModal";

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased flex h-screen font-sans">
        <ToastProvider>
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
          <WelcomeModal />
        </ToastProvider>
      </body>
    </html>
  );
}
