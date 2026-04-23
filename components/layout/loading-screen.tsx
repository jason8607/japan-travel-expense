"use client";

import Image from "next/image";

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-card" role="status" aria-busy="true">
      <div className="text-center">
        <div className="relative">
          <Image
            src="/icon-192.png"
            alt="旅帳"
            width={80}
            height={80}
            priority
            className="animate-bounce drop-shadow-sm"
          />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-1 bg-primary/20 rounded-full animate-pulse" />
        </div>
        <div className="flex items-center justify-center gap-1 mt-5">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:0ms]" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:150ms]" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
