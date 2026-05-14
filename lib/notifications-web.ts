/** Foreground-only web Notification API wrapper. PWA / Browser only. */

export function webNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function ensureWebPermission(): Promise<boolean> {
  if (!webNotificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showWebNotification(title: string, body: string, tag: string): void {
  if (!webNotificationsSupported()) return;
  if (Notification.permission !== "granted") return;
  new Notification(title, { body, tag, icon: "/icon-192.png" });
}
