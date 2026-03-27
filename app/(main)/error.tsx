"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
      <div className="text-4xl">😵</div>
      <h2 className="text-lg font-bold text-slate-800">發生錯誤了</h2>
      <p className="text-sm text-muted-foreground">
        很抱歉，頁面發生了預期外的錯誤。
      </p>
      <Button onClick={reset} className="bg-blue-500 hover:bg-blue-600 text-white">
        重新載入
      </Button>
    </div>
  );
}
