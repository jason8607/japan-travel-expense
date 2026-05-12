import { AppShell } from "@/components/layout/app-shell";
import { DeepLinkHandler } from "@/components/layout/deep-link-handler";
import { WidgetNativeSync } from "@/components/layout/widget-native-sync";
import { InstallPrompt } from "@/components/layout/install-prompt";
import { ServiceWorkerRegister } from "@/components/layout/sw-register";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider } from "@/lib/context";
import { THEME_INIT_SCRIPT, ThemeProvider } from "@/lib/theme-context";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
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
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-TW"
      className={`${geistSans.variable} h-full overflow-hidden`}
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        {/* Apply the user's saved theme before React hydrates to avoid FOUC. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="m-0 overflow-hidden font-sans antialiased bg-card">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:text-sm focus:font-medium"
        >
          跳至主要內容
        </a>
        <AppShell>
          <ThemeProvider>
            <div className="relative flex w-full min-h-0 flex-1 flex-col overflow-hidden">
              <AppProvider>
                <WidgetNativeSync />
                <div
                  id="main-content"
                  className="mx-auto flex min-h-0 flex-1 flex-col overflow-hidden w-full max-w-lg bg-background shadow-sm"
                >
                  {children}
                </div>
              </AppProvider>
              {/* Zero layout footprint: Toaster/Analytics hosts must not steal flex height from #main-content */}
              <div className="pointer-events-none absolute left-0 top-0 h-0 w-0 overflow-visible">
                <div className="pointer-events-auto">
                  <InstallPrompt />
                  <Toaster position="top-center" />
                  <ServiceWorkerRegister />
                  <DeepLinkHandler />
                  <Analytics />
                  <SpeedInsights />
                </div>
              </div>
            </div>
          </ThemeProvider>
        </AppShell>
      </body>
    </html>
  );
}
