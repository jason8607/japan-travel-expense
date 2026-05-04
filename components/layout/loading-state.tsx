"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: string;
  className?: string;
  variant?: "page" | "screen";
}

export function LoadingState({
  label = "載入中",
  className,
  variant = "page",
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center px-4",
        variant === "screen" ? "min-h-dvh" : "min-h-full py-8",
        className
      )}
      role="status"
      aria-busy="true"
    >
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center ring-1 ring-foreground/10">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
          <Image
            src="/icon-transparent.png"
            alt=""
            width={40}
            height={40}
            priority={variant === "screen"}
            className="animate-pulse"
          />
        </div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <div className="mt-3 flex items-center justify-center gap-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/70" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/70 [animation-delay:200ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/70 [animation-delay:400ms]" />
        </div>
      </div>
    </div>
  );
}
