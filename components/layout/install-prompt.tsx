"use client";

import { Button } from "@/components/ui/button";
import { isNativeApp } from "@/lib/capacitor";
import { Download, Share, Smartphone, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "android" | "ios" | "other";

const DISMISS_KEY = "install_prompt_dismissed";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari 專用 flag
  if ((window.navigator as Navigator & { standalone?: boolean }).standalone) return true;
  return false;
}

function isRecentlyDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const dismissed = localStorage.getItem(DISMISS_KEY);
  if (!dismissed) return false;
  const ts = Number(dismissed);
  if (!Number.isNaN(ts) && Date.now() - ts < THIRTY_DAYS_MS) return true;
  localStorage.removeItem(DISMISS_KEY);
  return false;
}

// Returns true once the component is hydrated on the client. Uses
// useSyncExternalStore so the SSR snapshot (`false`) matches the initial
// client snapshot, avoiding hydration mismatches without setState-in-effect.
const subscribeNoop = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

export function InstallPrompt() {
  const hydrated = useHydrated();

  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  // Derived from `hydrated`; safe to compute during render because both
  // detectPlatform/isStandalone/isRecentlyDismissed return SSR-safe defaults
  // until hydration flips to true.
  const platform: Platform = hydrated ? detectPlatform() : "other";
  const showPrompt =
    hydrated && !isNativeApp() && !dismissed && !isStandalone() && !isRecentlyDismissed();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setDismissed(true);
      setDeferredPrompt(null);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch {
        // browser cancelled or not supported
      }
      setDismissed(true);
      setDeferredPrompt(null);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      return;
    }

    // iOS / 尚未拿到 beforeinstallprompt 的瀏覽器 → 顯示教學
    setShowIosGuide(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowIosGuide(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  if (!showPrompt) return null;

  return (
    <>
      <div
        className="fixed left-4 right-4 z-50 mx-auto max-w-lg"
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-lg border">
          <div className="text-2xl"><Smartphone className="h-4 w-4" /></div>
          <div className="flex-1">
            <p className="text-sm font-medium">安裝到手機桌面</p>
            <p className="text-xs text-muted-foreground">
              隨時快速記帳,離線也能用
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleInstall}
            className="bg-primary hover:bg-primary/90"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            安裝
          </Button>
          <button onClick={handleDismiss} aria-label="關閉" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showIosGuide && (
        <div
          className="fixed inset-0 z-60 flex items-end justify-center bg-black/40 px-4 pb-6"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-card p-5 shadow-xl"
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-base font-semibold">加入主畫面</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {platform === "ios"
                    ? "Safari 不支援一鍵安裝,請依下列步驟手動加入"
                    : "請使用瀏覽器選單「加入主畫面」"}
                </p>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                aria-label="關閉"
                className="text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  1
                </span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  點擊下方工具列的
                  <Share className="h-4 w-4 text-primary" />
                  <span className="font-medium">分享</span>
                  按鈕
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  2
                </span>
                <span>選擇「加入主畫面」</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  3
                </span>
                <span>點右上角「新增」完成安裝</span>
              </li>
            </ol>

            <Button
              className="mt-5 w-full"
              variant="outline"
              onClick={() => setShowIosGuide(false)}
            >
              我知道了
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
