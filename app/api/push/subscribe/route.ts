import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "@/lib/supabase/auth-helper";

interface SubscribeBody {
  endpoint?: string;
  p256dh?: string;
  auth?: string;
  daily_reminder_hour?: number;
  timezone?: string;
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
    const tz = body.timezone || "Asia/Tokyo";

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

    const body = (await req.json()) as { endpoint?: string; daily_reminder_hour?: number };
    if (!body.endpoint) return NextResponse.json({ error: "缺少 endpoint" }, { status: 400 });

    const hour = clampHour(body.daily_reminder_hour);
    const admin = getAdminClient();
    const { error } = await admin
      .from("push_subscriptions")
      .update({ daily_reminder_hour: hour, updated_at: new Date().toISOString() })
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
