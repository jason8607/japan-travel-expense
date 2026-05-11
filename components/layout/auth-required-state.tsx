"use client";

import type { LucideIcon } from "lucide-react";
import { LogIn, Plane } from "lucide-react";
import Link from "next/link";

interface AuthRequiredStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
}

export function AuthRequiredState({
  icon: Icon = LogIn,
  title = "請先登入",
  description = "登入後可以同步旅程資料、多人分帳，並保留所有記帳紀錄。",
}: AuthRequiredStateProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center ring-1 ring-foreground/10">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        <div className="mt-5 grid gap-2">
          <Link
            href="/auth/login"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
          >
            登入 / 註冊
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-card px-4 text-sm font-medium text-muted-foreground ring-1 ring-foreground/10 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
          >
            <Plane className="h-4 w-4" />
            回首頁使用訪客模式
          </Link>
        </div>
      </div>
    </div>
  );
}
