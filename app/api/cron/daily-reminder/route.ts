import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendPush, type PushSubscriptionRow } from "@/lib/push-server";

interface SubscriptionRow extends PushSubscriptionRow {
  user_id: string;
  daily_reminder_hour: number | null;
  timezone: string;
}

/**
 * Fires hourly via GitHub Actions cron (.github/workflows/daily-reminder.yml). Vercel Hobby
 * cron caps at once-per-day, so we host the schedule on GitHub Actions instead — it pings
 * this endpoint every hour with the CRON_SECRET bearer token. We then find subscriptions
 * whose configured local hour matches the current local hour in their timezone and push.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET 未設定" }, { status: 500 });
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, daily_reminder_hour, timezone")
    .not("daily_reminder_hour", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ sent: 0, skipped: 0 });

  const subs = data as SubscriptionRow[];
  const nowUtc = new Date();
  let sent = 0;
  let skipped = 0;
  const goneIds: string[] = [];

  for (const sub of subs) {
    try {
      const localHour = getHourInTimeZone(nowUtc, sub.timezone || "Asia/Tokyo");
      if (localHour !== sub.daily_reminder_hour) {
        skipped++;
        continue;
      }
      const result = await sendPush(sub, {
        title: "今日花費整理一下？",
        body: "點開記下今天還沒登錄的消費，讓帳本不漏單。",
        url: "/records/new",
        tag: "daily-reminder",
      });
      if (result.ok) {
        sent++;
      } else if (result.gone) {
        goneIds.push(sub.id);
      }
    } catch (err) {
      console.error("daily-reminder: skipping bad subscription", sub.id, err);
    }
  }

  if (goneIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", goneIds);
  }

  return NextResponse.json({ sent, skipped, cleaned: goneIds.length });
}

function getHourInTimeZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hourPart = parts.find((p) => p.type === "hour");
  const hour = hourPart ? Number(hourPart.value) : NaN;
  // Intl returns "24" at midnight in some locales; normalize to 0.
  return hour === 24 ? 0 : hour;
}
