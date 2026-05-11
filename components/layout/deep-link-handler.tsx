"use client";
import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { createClient } from "@/lib/supabase/client";

const TRIP_JOIN_RE = /^ryocho:\/\/trip\/([^/?#]+)\/join(?:\?|#|$)/;

export function DeepLinkHandler() {
  useEffect(() => {
    const sub = CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
      if (url.startsWith("ryocho://auth/callback")) {
        const queryString = url.split("?")[1] ?? "";
        const params = new URLSearchParams(queryString);
        const code = params.get("code");
        if (code) {
          const supabase = createClient();
          await supabase.auth.exchangeCodeForSession(code);
          await Browser.close();
          window.location.href = "/";
        }
        return;
      }

      const joinMatch = url.match(TRIP_JOIN_RE);
      if (joinMatch) {
        const tripId = joinMatch[1];
        window.location.href = `/trip/${tripId}/join`;
      }
    });
    return () => {
      sub.then((s) => s.remove());
    };
  }, []);
  return null;
}
