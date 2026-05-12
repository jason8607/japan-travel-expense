"use client";

import { useWidgetSync } from "@/hooks/use-widget-sync";

/** Pushes widget snapshot to the native Capacitor plugin when running inside the iOS app. */
export function WidgetNativeSync() {
  useWidgetSync();
  return null;
}
