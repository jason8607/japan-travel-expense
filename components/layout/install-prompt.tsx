"use client";

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("install_prompt_dismissed");
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      // browser cancelled or not supported
    }
    setShowPrompt(false);
    setDeferredPrompt(null);
    localStorage.setItem("install_prompt_dismissed", "true");
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("install_prompt_dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-lg">
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-lg border">
        <div className="text-2xl">📱</div>
        <div className="flex-1">
          <p className="text-sm font-medium">安裝到手機桌面</p>
          <p className="text-xs text-muted-foreground">
            隨時快速記帳，離線也能用
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleInstall}
          className="bg-blue-500 hover:bg-blue-600"
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          安裝
        </Button>
        <button onClick={handleDismiss} aria-label="關閉" className="text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
