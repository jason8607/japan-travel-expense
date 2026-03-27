"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  showBack,
  right,
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg px-4 pt-2 pb-3">
      <div className="relative flex items-center justify-center min-h-[40px]">
        {showBack && (
          <button
            onClick={() => router.back()}
            aria-label="返回上一頁"
            className="absolute left-0 flex items-center text-sm text-blue-500"
          >
            <ChevronLeft className="h-5 w-5" />
            <span>返回</span>
          </button>
        )}
        <div className="text-center">
          <h1 className="text-lg font-bold">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {right && <div className="absolute right-0">{right}</div>}
      </div>
    </header>
  );
}
