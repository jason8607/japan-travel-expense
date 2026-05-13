import { LocalNotifications, type PermissionStatus, type ScheduleOptions } from "@capacitor/local-notifications";
import { isNativeApp } from "@/lib/capacitor";

/** Stable IDs so we can re-schedule / cancel by intent. */
export const NOTIFICATION_IDS = {
  dailyReminder: 1001,
  /** Cashback warnings use a deterministic offset per card hash so the same card never duplicates. */
  cashbackBase: 2000,
};

export async function notificationsAvailable(): Promise<boolean> {
  return isNativeApp();
}

export async function getPermissionStatus(): Promise<PermissionStatus | null> {
  if (!isNativeApp()) return null;
  return LocalNotifications.checkPermissions();
}

export async function ensurePermission(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const current = await LocalNotifications.checkPermissions();
  if (current.display === "granted") return true;
  const requested = await LocalNotifications.requestPermissions();
  return requested.display === "granted";
}

export async function scheduleDailyReminder(hour: number): Promise<void> {
  if (!isNativeApp()) return;
  await cancelDailyReminder();
  const options: ScheduleOptions = {
    notifications: [
      {
        id: NOTIFICATION_IDS.dailyReminder,
        title: "今日花費整理一下？",
        body: "點開記下今天還沒登錄的消費，讓帳本不漏單。",
        schedule: {
          on: { hour, minute: 0 },
          allowWhileIdle: true,
        },
      },
    ],
  };
  await LocalNotifications.schedule(options);
}

export async function cancelDailyReminder(): Promise<void> {
  if (!isNativeApp()) return;
  await LocalNotifications.cancel({
    notifications: [{ id: NOTIFICATION_IDS.dailyReminder }],
  });
}

/** Hash a card id into a stable per-card notification id. */
function cardNotificationId(cardId: string): number {
  let hash = 0;
  for (let i = 0; i < cardId.length; i++) {
    hash = (hash * 31 + cardId.charCodeAt(i)) | 0;
  }
  return NOTIFICATION_IDS.cashbackBase + Math.abs(hash % 9000);
}

export async function sendCashbackWarning(params: {
  cardId: string;
  cardName: string;
  spent: number;
  limit: number;
  threshold: number;
}): Promise<void> {
  if (!isNativeApp()) return;
  const { cardId, cardName, spent, limit, threshold } = params;
  const percent = Math.round((spent / limit) * 100);
  await LocalNotifications.schedule({
    notifications: [
      {
        id: cardNotificationId(cardId),
        title: `${cardName} 已刷 ${percent}% 刷卡上限`,
        body: `本旅程已刷 NT$${spent.toLocaleString()}/${limit.toLocaleString()}（達 ${threshold}% 門檻），快接近上限了。`,
      },
    ],
  });
}
