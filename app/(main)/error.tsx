"use client";

import { useEffect } from "react";
import { AlertTriangle, Home } from "lucide-react";
import Link from "next/link";

export default function MainError({
  error,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center ring-1 ring-foreground/10">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-foreground">發生錯誤了</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          很抱歉，頁面發生了預期外的錯誤。
        </p>
        <div className="mt-5 grid gap-2">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
          >
            重新載入
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-card px-4 text-sm font-medium text-muted-foreground ring-1 ring-foreground/10 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
          >
            <Home className="h-4 w-4" />
            回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}
