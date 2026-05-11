"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { HeaderActionProvider, useHeaderActionSlot } from "@/components/layout/header-action-context";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

interface MainShellProps {
  children: ReactNode;
}

interface HeaderConfig {
  title: string;
  showBack?: boolean;
  backVariant?: "arrow" | "close";
}

function getHeaderConfig(pathname: string, isEditingExpense: boolean): HeaderConfig | null {
  if (pathname === "/") return null;
  if (pathname === "/records") return { title: "記帳" };
  if (pathname === "/records/new") {
    return {
      title: isEditingExpense ? "編輯消費" : "新增消費",
      showBack: true,
      backVariant: "close",
    };
  }
  if (pathname === "/scan") return { title: "掃描收據" };
  if (pathname === "/stats") return { title: "統計" };
  if (pathname === "/settings") return { title: "設定" };
  if (pathname === "/summary") return { title: "旅行總結", showBack: true };
  if (pathname === "/recap") return { title: "旅後回顧", showBack: true };
  if (pathname === "/trip/new") return { title: "建立新旅程", showBack: true };
  if (/^\/trip\/[^/]+\/invite$/.test(pathname)) {
    return { title: "邀請成員", showBack: true };
  }

  return null;
}

function MainShellInner({ children }: MainShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const header = getHeaderConfig(pathname, searchParams.has("edit"));
  const headerAction = useHeaderActionSlot();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {header && (
        <PageHeader
          title={header.title}
          showBack={header.showBack}
          backVariant={header.backVariant}
          right={headerAction}
        />
      )}
      <main
        className={cn(
          "flex-1 min-h-0 overflow-y-auto",
          header && "pt-4"
        )}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

export function MainShell({ children }: MainShellProps) {
  return (
    <HeaderActionProvider>
      <MainShellInner>{children}</MainShellInner>
    </HeaderActionProvider>
  );
}
