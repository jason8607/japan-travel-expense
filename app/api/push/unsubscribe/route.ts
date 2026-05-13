import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "@/lib/supabase/auth-helper";

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const body = (await req.json()) as { endpoint?: string };
    if (!body.endpoint) return NextResponse.json({ error: "缺少 endpoint" }, { status: 400 });

    const admin = getAdminClient();
    const { error } = await admin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", body.endpoint);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "取消訂閱失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
