"use client";
import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { createClient } from "@/lib/supabase/client";

export function DeepLinkHandler() {
  useEffect(() => {
    const sub = CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
      if (!url.startsWith("ryocho://auth/callback")) return;
      const queryString = url.split("?")[1] ?? "";
      const params = new URLSearchParams(queryString);
      const code = params.get("code");
      if (code) {
        const supabase = createClient();
        await supabase.auth.exchangeCodeForSession(code);
        await Browser.close();
        window.location.href = "/";
      }
    });
    return () => {
      sub.then((s) => s.remove());
    };
  }, []);
  return null;
}
