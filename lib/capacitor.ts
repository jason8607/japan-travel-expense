import { Capacitor } from "@capacitor/core";

export const isNativeApp = (): boolean => {
  if (typeof window === "undefined") return false;
  // User agent marker set via capacitor.config.ts appendUserAgent (reliable, no bridge timing issues)
  if (navigator.userAgent.includes("RyochoNative")) return true;
  // Fallback: Capacitor bridge injection check
  return Capacitor.isNativePlatform();
};
