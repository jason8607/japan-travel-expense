import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider } from "@/lib/context";
import { ServiceWorkerRegister } from "@/components/layout/sw-register";
import { InstallPrompt } from "@/components/layout/install-prompt";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "旅帳 — 日本旅遊記帳",
  description: "AI 收據辨識、即時統計、多人記帳的日本旅遊記帳 App",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "旅帳",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant" className={`${geistSans.variable} h-full`}>
      <body className="h-full font-sans antialiased bg-gray-50">
        <AppProvider>
          <div className="mx-auto max-w-lg min-h-full bg-white shadow-sm">
            {children}
          </div>
          <InstallPrompt />
          <Toaster position="top-center" />
          <ServiceWorkerRegister />
        </AppProvider>
      </body>
    </html>
  );
}
