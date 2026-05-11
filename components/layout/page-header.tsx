"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  /** "arrow" = navigation push (← 返回); "close" = modal/sheet dismiss (X) */
  backVariant?: "arrow" | "close";
  right?: ReactNode;
}

export function PageHeader({
  title,
  showBack,
  backVariant = "arrow",
  right,
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <header className="shrink-0 border-b bg-card pt-[env(safe-area-inset-top,0px)]">
      <div className="relative flex h-14 items-center justify-center px-4">
        {showBack && (
          backVariant === "close" ? (
            <button
              onClick={() => router.back()}
              aria-label="關閉"
              className="absolute left-4 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground active:translate-y-px focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={() => router.back()}
              aria-label="返回上一頁"
              className="absolute left-4 flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors"
            >
              <span aria-hidden="true" className="text-lg leading-none">←</span>
              <span>返回</span>
            </button>
          )
        )}
        <div className="min-w-0 max-w-[calc(100%-6rem)] text-center">
          <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
        </div>
        {right && <div className="absolute right-4">{right}</div>}
      </div>
    </header>
  );
}
