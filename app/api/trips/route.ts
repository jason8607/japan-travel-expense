import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "@/lib/supabase/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: memberRows } = await admin
      .from("trip_members")
      .select("trip_id")
      .eq("user_id", user.id);

    const tripIds = memberRows?.map((r: { trip_id: string }) => r.trip_id) || [];

    if (tripIds.length === 0) {
      return NextResponse.json({ trips: [] });
    }

    const { data: trips } = await admin
      .from("trips")
      .select("*")
      .in("id", tripIds)
      .order("start_date", { ascending: false });

    return NextResponse.json({ trips: trips || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
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

    const admin = createAdminClient();

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
      return NextResponse.json({ error: tripError.message }, { status: 500 });
    }

    const { error: memberError } = await admin.from("trip_members").insert({
      trip_id: trip.id,
      user_id: user.id,
      role: "owner",
    });

    if (memberError) {
      await admin.from("trips").delete().eq("id", trip.id);
      return NextResponse.json(
        { error: memberError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ trip });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
