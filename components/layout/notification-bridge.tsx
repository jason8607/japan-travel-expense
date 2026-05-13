"use client";

import { useNotificationScheduler } from "@/hooks/use-notification-scheduler";

/** Schedules local notifications inside the iOS app (daily reminder + cashback limit warning). */
export function NotificationBridge() {
  useNotificationScheduler();
  return null;
}
