import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jasonchen.ryocho",
  appName: "旅帳",
  webDir: "out",
  server: {
    url: "https://travelio-dev.vercel.app",
    cleartext: false,
  },
  ios: {
    // Disable WKWebView's automatic safe-area inset; we already apply
    // env(safe-area-inset-*) on AppShell + BottomNav. Without this, iOS adds
    // a second inset on top of CSS env() and content gets pushed down twice.
    contentInset: "never",
    limitsNavigationsToAppBoundDomains: false,
    scheme: "ryocho",
    appendUserAgent: "RyochoNative",
  },
};

export default config;
