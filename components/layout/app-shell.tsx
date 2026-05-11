"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useLayoutEffect } from "react";

/**
 * Fills the root flex column, locks document-level scroll (inner regions scroll
 * themselves), and resets window scroll on navigation — WKWebView / Capacitor
 * can leave a non-zero document scrollTop otherwise.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useLayoutEffect(() => {
    window.history.scrollRestoration = "manual";
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  /* fixed inset-0: WKWebView/Capacitor often mis-resolves % height chains; this matches the visual viewport. */
  return (
    <div className="fixed inset-0 z-1 flex flex-col overflow-hidden overscroll-none bg-card">
      {children}
    </div>
  );
}
