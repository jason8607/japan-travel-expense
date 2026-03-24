"use client";

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center">
        <div className="relative">
          <div className="text-5xl animate-bounce">🗾</div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-200 rounded-full animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground mt-4 font-medium">
          旅帳
        </p>
        <div className="flex items-center justify-center gap-1 mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0ms]" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:150ms]" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
