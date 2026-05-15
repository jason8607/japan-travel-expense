import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "@/lib/supabase/auth-helper";

interface SubscribeBody {
  endpoint?: string;
  p256dh?: string;
  auth?: string;
  daily_reminder_hour?: number;
  timezone?: string;
  cashback_alert_enabled?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const body = (await req.json()) as SubscribeBody;
    if (!body.endpoint || !body.p256dh || !body.auth) {
      return NextResponse.json({ error: "缺少訂閱資訊" }, { status: 400 });
    }

    const hour = clampHour(body.daily_reminder_hour);
    const tz = validateTimezone(body.timezone);
    const cashbackEnabled = body.cashback_alert_enabled ?? true;

    const admin = getAdminClient();
    const { error } = await admin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint: body.endpoint,
          p256dh: body.p256dh,
          auth: body.auth,
          daily_reminder_hour: hour,
          timezone: tz,
          cashback_alert_enabled: cashbackEnabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,endpoint" }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "訂閱失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const body = (await req.json()) as {
      endpoint?: string;
      daily_reminder_hour?: number;
      cashback_alert_enabled?: boolean;
    };
    if (!body.endpoint) return NextResponse.json({ error: "缺少 endpoint" }, { status: 400 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.daily_reminder_hour !== undefined) {
      updates.daily_reminder_hour = clampHour(body.daily_reminder_hour);
    }
    if (body.cashback_alert_enabled !== undefined) {
      updates.cashback_alert_enabled = body.cashback_alert_enabled;
    }

    const admin = getAdminClient();
    const { error } = await admin
      .from("push_subscriptions")
      .update(updates)
      .eq("user_id", user.id)
      .eq("endpoint", body.endpoint);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function clampHour(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(23, Math.floor(n)));
}

function validateTimezone(tz: string | undefined): string {
  const candidate = tz || "Asia/Tokyo";
  try {
    new Intl.DateTimeFormat("en", { timeZone: candidate });
    return candidate;
  } catch {
    return "Asia/Tokyo";
  }
}
