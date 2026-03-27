import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "@/lib/supabase/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const admin = getAdminClient();

    const { data: memberRows, error: memberError } = await admin
      .from("trip_members")
      .select("trip_id")
      .eq("user_id", user.id);

    if (memberError) {
      console.error("trips GET member query error:", memberError.message);
      return NextResponse.json({ error: "載入旅程失敗" }, { status: 500 });
    }

    const tripIds = memberRows?.map((r: { trip_id: string }) => r.trip_id) || [];

    if (tripIds.length === 0) {
      return NextResponse.json({ trips: [] });
    }

    const { data: trips } = await admin
      .from("trips")
      .select("id, name, start_date, end_date, currency, cash_budget, notion_database_id, created_by, created_at")
      .in("id", tripIds)
      .order("start_date", { ascending: false });

    return NextResponse.json({ trips: trips || [] });
  } catch (err) {
    console.error("trips GET error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, start_date, end_date, cash_budget } = body;

    if (!id) {
      return NextResponse.json({ error: "缺少旅程 ID" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: member } = await admin
      .from("trip_members")
      .select("role")
      .eq("trip_id", id)
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "owner") {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (start_date !== undefined) updates.start_date = start_date;
    if (end_date !== undefined) updates.end_date = end_date;
    if (cash_budget !== undefined) updates.cash_budget = cash_budget || null;

    const { data: trip, error } = await admin
      .from("trips")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("trips PUT error:", error.message);
      return NextResponse.json({ error: "更新旅程失敗" }, { status: 500 });
    }

    return NextResponse.json({ trip });
  } catch (err) {
    console.error("trips PUT error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const body = await req.json();
    const { name, start_date, end_date, cash_budget } = body;

    if (!name || !start_date || !end_date) {
      return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
    }

    if (end_date < start_date) {
      return NextResponse.json({ error: "結束日期不可早於開始日期" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: trip, error: tripError } = await admin
      .from("trips")
      .insert({
        name,
        start_date,
        end_date,
        cash_budget: cash_budget || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (tripError) {
      console.error("trips POST error:", tripError.message);
      return NextResponse.json({ error: "建立旅程失敗" }, { status: 500 });
    }

    const { error: memberError } = await admin.from("trip_members").insert({
      trip_id: trip.id,
      user_id: user.id,
      role: "owner",
    });

    if (memberError) {
      console.error("trips POST member error:", memberError.message);
      await admin.from("trips").delete().eq("id", trip.id);
      return NextResponse.json(
        { error: "建立旅程成員失敗" },
        { status: 500 }
      );
    }

    return NextResponse.json({ trip });
  } catch (err) {
    console.error("trips POST error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
