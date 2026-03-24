"use client";

import { Button } from "@/components/ui/button";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-5xl mb-4">😵</div>
      <h2 className="text-lg font-bold mb-2">發生錯誤</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {error.message || "頁面載入時發生未預期的錯誤"}
      </p>
      <Button onClick={reset} className="bg-blue-500 hover:bg-blue-600">
        重新載入
      </Button>
    </div>
  );
}
