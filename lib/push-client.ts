/** Browser-side helpers for Web Push subscription management. */

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  // ServiceWorkerRegister mounts in root layout but may not have resolved yet.
  return navigator.serviceWorker.ready;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const reg = await getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function subscribePush(hour: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return { ok: false, error: "缺少 VAPID public key 設定" };
  if (!isPushSupported()) return { ok: false, error: "此瀏覽器不支援推播（iOS 需先加入主畫面）" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "通知權限未授權" };

  const reg = await getRegistration();
  if (!reg) return { ok: false, error: "Service Worker 尚未註冊" };

  const existing = await reg.pushManager.getSubscription();
  const subscription =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo";
  const json = subscription.toJSON();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      daily_reminder_hour: hour,
      timezone: tz,
    }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "訂閱失敗" }));
    return { ok: false, error };
  }
  return { ok: true };
}

export async function unsubscribePush(): Promise<{ ok: true } | { ok: false; error: string }> {
  const reg = await getRegistration();
  if (!reg) return { ok: true };
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return { ok: true };
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  const res = await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "取消訂閱失敗" }));
    return { ok: false, error };
  }
  return { ok: true };
}

export async function updateDailyHour(hour: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const reg = await getRegistration();
  if (!reg) return { ok: false, error: "Service Worker 尚未註冊" };
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return { ok: false, error: "尚未訂閱推播" };

  const res = await fetch("/api/push/subscribe", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint, daily_reminder_hour: hour }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "更新失敗" }));
    return { ok: false, error };
  }
  return { ok: true };
}
