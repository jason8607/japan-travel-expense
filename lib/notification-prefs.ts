/** Persisted notification preferences (shared by guest + auth modes). */

const STORAGE_KEY = "ryocho.notification-prefs.v1";

export type CashbackThreshold = 80 | 95;

export interface NotificationPrefs {
  dailyReminderEnabled: boolean;
  /** 0-23, local time. */
  dailyReminderHour: number;
  cashbackWarningEnabled: boolean;
  cashbackWarningThreshold: CashbackThreshold;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  dailyReminderEnabled: false,
  dailyReminderHour: 21,
  cashbackWarningEnabled: false,
  cashbackWarningThreshold: 80,
};

export function loadPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      // Clamp hour into valid range in case of bad input.
      dailyReminderHour: clampHour(parsed.dailyReminderHour ?? DEFAULT_PREFS.dailyReminderHour),
      cashbackWarningThreshold:
        parsed.cashbackWarningThreshold === 95 ? 95 : 80,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: NotificationPrefs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function clampHour(hour: number): number {
  if (!Number.isFinite(hour)) return DEFAULT_PREFS.dailyReminderHour;
  return Math.max(0, Math.min(23, Math.floor(hour)));
}
