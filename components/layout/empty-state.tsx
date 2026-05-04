"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface EmptyStateAction {
  label: string;
  href: string;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  variant?: "page" | "section";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "page",
  className,
}: EmptyStateProps) {
  const isPage = variant === "page";

  return (
    <div
      className={cn(
        "flex items-center justify-center px-4",
        isPage ? "min-h-[60vh] py-8" : "py-4",
        className
      )}
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-3xl bg-card text-center ring-1 ring-foreground/10",
          isPage ? "p-6" : "p-5"
        )}
      >
        <div
          className={cn(
            "mx-auto flex items-center justify-center rounded-2xl bg-primary/10 text-primary",
            isPage ? "mb-4 h-16 w-16" : "mb-3 h-12 w-12"
          )}
        >
          <Icon className={isPage ? "h-8 w-8" : "h-6 w-6"} />
        </div>
        <h2 className={cn("font-bold text-foreground", isPage ? "text-lg" : "text-sm")}>
          {title}
        </h2>
        {description && (
          <p
            className={cn(
              "mt-2 leading-relaxed text-muted-foreground",
              isPage ? "text-sm" : "text-xs"
            )}
          >
            {description}
          </p>
        )}
        {(action || secondaryAction) && (
          <div className={cn("grid gap-2", isPage ? "mt-5" : "mt-4")}>
            {action && (
              <Link
                href={action.href}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
              >
                {action.label}
              </Link>
            )}
            {secondaryAction && (
              <Link
                href={secondaryAction.href}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-card px-4 text-sm font-medium text-muted-foreground ring-1 ring-foreground/10 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
              >
                {secondaryAction.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
