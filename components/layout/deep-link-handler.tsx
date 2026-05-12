"use client";
import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { createClient } from "@/lib/supabase/client";

const TRIP_JOIN_RE = /^ryocho:\/\/trip\/([^/?#]+)\/join(?:\?|#|$)/;
const SHORTCUT_RE = /^ryocho:\/\/shortcut\/(new|scan|summary)(?:\?|#|$)/;
const WIDGET_NAV_RE = /^ryocho:\/\/widget\/(today|categories|summary)(?:\?|#|$)/;

const SHORTCUT_PATH: Record<string, string> = {
  new: "/records/new",
  scan: "/scan",
  summary: "/summary",
};

const WIDGET_NAV_PATH: Record<string, string> = {
  today: "/",
  categories: "/records",
  summary: "/summary",
};

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
        return;
      }

      const shortcutMatch = url.match(SHORTCUT_RE);
      if (shortcutMatch) {
        const path = SHORTCUT_PATH[shortcutMatch[1]];
        if (path) window.location.href = path;
        return;
      }

      const widgetNavMatch = url.match(WIDGET_NAV_RE);
      if (widgetNavMatch) {
        const path = WIDGET_NAV_PATH[widgetNavMatch[1]];
        if (path) window.location.href = path;
        return;
      }
    });
    return () => {
      sub.then((s) => s.remove());
    };
  }, []);
  return null;
}
