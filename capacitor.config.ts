import type { CapacitorConfig } from "@capacitor/cli";

// Default: load the deployed site (bundled `out/` is often stale unless you run `npm run build` + cap copy).
// Set CAPACITOR_LIVE_SERVER_URL to override, or CAPACITOR_USE_BUNDLED_WEB=1 to omit server and use webDir only.
const useBundledWeb = process.env.CAPACITOR_USE_BUNDLED_WEB === "1";
const liveServerUrl =
  process.env.CAPACITOR_LIVE_SERVER_URL?.trim() || "https://travelio-dev.vercel.app";

const config: CapacitorConfig = {
  appId: "com.jasonchen.ryocho",
  appName: "旅帳",
  webDir: "out",
  ...(!useBundledWeb
    ? {
        server: {
          url: liveServerUrl,
          cleartext: false,
        },
      }
    : {}),
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
