import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "@/lib/supabase/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const admin = getAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "找不到個人資料" }, { status: 404 });
    }

    return NextResponse.json({ profile: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "伺服器錯誤";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const body = await req.json() as {
      display_name?: string;
      avatar_emoji?: string;
      avatar_url?: string | null;
    };

    const ALLOWED: (keyof typeof body)[] = ["display_name", "avatar_emoji", "avatar_url"];
    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "沒有可更新的欄位" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "更新失敗" }, { status: 500 });
    }

    return NextResponse.json({ profile: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "伺服器錯誤";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
