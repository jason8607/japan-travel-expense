import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider } from "@/lib/context";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme-context";
import { ServiceWorkerRegister } from "@/components/layout/sw-register";
import { InstallPrompt } from "@/components/layout/install-prompt";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "旅帳 — 日本旅遊記帳",
  description: "AI 收據辨識、即時統計、多人記帳的日本旅遊記帳 App",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} h-full`}
      data-theme="warm"
      suppressHydrationWarning
    >
      <head>
        {/* Apply the user's saved theme before React hydrates to avoid FOUC. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="h-full font-sans antialiased bg-muted">
        <ThemeProvider>
          <AppProvider>
            <div className="mx-auto max-w-lg min-h-full bg-background shadow-sm">
              {children}
            </div>
            <InstallPrompt />
            <Toaster position="top-center" />
            <ServiceWorkerRegister />
          </AppProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
