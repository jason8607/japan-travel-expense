"use client";

import { Bell, BellOff, CreditCard, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { isNativeApp } from "@/lib/capacitor";
import {
  DEFAULT_PREFS,
  loadPrefs,
  savePrefs,
  type CashbackThreshold,
  type NotificationPrefs,
} from "@/lib/notification-prefs";
import {
  cancelDailyReminder,
  ensurePermission,
  getPermissionStatus,
  scheduleDailyReminder,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

const HOUR_OPTIONS = [18, 20, 21, 22] as const;
const THRESHOLD_OPTIONS: CashbackThreshold[] = [80, 95];

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    if (isNativeApp()) {
      getPermissionStatus().then((status) => {
        setPermissionGranted(status?.display === "granted");
      });
    }
  }, []);

  if (!isNativeApp()) {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <BellOff className="h-4 w-4 text-muted-foreground" />
            通知
          </h2>
        </div>
        <p className="px-4 py-3 text-xs text-muted-foreground">
          通知功能僅在 iOS App 內使用。請從 App Store 或主畫面捷徑開啟旅帳。
        </p>
      </div>
    );
  }

  const update = async (next: NotificationPrefs) => {
    setPrefs(next);
    savePrefs(next);
    try {
      if (next.dailyReminderEnabled) {
        await scheduleDailyReminder(next.dailyReminderHour);
      } else {
        await cancelDailyReminder();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "排程失敗";
      toast.error(message);
    }
  };

  const handleToggleDaily = async (enabled: boolean) => {
    if (enabled && !permissionGranted) {
      setBusy(true);
      const granted = await ensurePermission();
      setBusy(false);
      setPermissionGranted(granted);
      if (!granted) {
        toast.error("請至 iOS 設定 → 旅帳 → 通知 開啟權限");
        return;
      }
    }
    await update({ ...prefs, dailyReminderEnabled: enabled });
    toast.success(enabled ? "已開啟每日提醒" : "已關閉每日提醒");
  };

  const handleHourChange = async (hour: number) => {
    await update({ ...prefs, dailyReminderHour: hour });
  };

  const handleToggleCashback = async (enabled: boolean) => {
    if (enabled && !permissionGranted) {
      setBusy(true);
      const granted = await ensurePermission();
      setBusy(false);
      setPermissionGranted(granted);
      if (!granted) {
        toast.error("請至 iOS 設定 → 旅帳 → 通知 開啟權限");
        return;
      }
    }
    await update({ ...prefs, cashbackWarningEnabled: enabled });
    toast.success(enabled ? "已開啟回饋上限提醒" : "已關閉回饋上限提醒");
  };

  const handleThresholdChange = async (threshold: CashbackThreshold) => {
    await update({ ...prefs, cashbackWarningThreshold: threshold });
  };

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          通知
        </h2>
      </div>

      <div className="divide-y divide-border/60">
        {/* Daily reminder */}
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">每日花費提醒</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                每天指定時間提醒記錄當日尚未登錄的消費。
              </p>
            </div>
            <Toggle
              checked={prefs.dailyReminderEnabled}
              disabled={busy}
              onChange={handleToggleDaily}
            />
          </div>

          {prefs.dailyReminderEnabled && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">提醒時間</span>
              {HOUR_OPTIONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleHourChange(h)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors active:translate-y-px focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    prefs.dailyReminderHour === h
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  )}
                >
                  {String(h).padStart(2, "0")}:00
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cashback warning */}
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                信用卡回饋上限提醒
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                當卡片本旅程回饋接近上限時通知，提醒換卡或調整支付方式。
              </p>
            </div>
            <Toggle
              checked={prefs.cashbackWarningEnabled}
              disabled={busy}
              onChange={handleToggleCashback}
            />
          </div>

          {prefs.cashbackWarningEnabled && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">提醒門檻</span>
              {THRESHOLD_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleThresholdChange(t)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors active:translate-y-px focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    prefs.cashbackWarningThreshold === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  )}
                >
                  {t}%
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {busy && (
        <div className="px-4 py-2 border-t border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          請求通知權限中...
        </div>
      )}
    </div>
  );
}

interface ToggleProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ checked, disabled, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-background shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
