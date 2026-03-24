import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "@/lib/supabase/auth-helper";

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const { trip_id } = await req.json();
    if (!trip_id) {
      return NextResponse.json({ error: "缺少旅程 ID" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: trip } = await admin
      .from("trips")
      .select("id, name")
      .eq("id", trip_id)
      .single();

    if (!trip) {
      return NextResponse.json({ error: "找不到旅程" }, { status: 404 });
    }

    const { data: existing } = await admin
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", trip_id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "你已是此旅程的成員" }, { status: 409 });
    }

    const { error } = await admin.from("trip_members").insert({
      trip_id,
      user_id: user.id,
      role: "member",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, trip_name: trip.name });
  } catch (err) {
    const message = err instanceof Error ? err.message : "伺服器錯誤";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
