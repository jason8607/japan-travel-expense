import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "@/lib/supabase/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const tripId = req.nextUrl.searchParams.get("trip_id");
    if (!tripId) {
      return NextResponse.json({ error: "缺少 trip_id" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: member } = await admin
      .from("trip_members")
      .select("trip_id")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const { data: expenses, error } = await admin
      .from("expenses")
      .select("*")
      .eq("trip_id", tripId)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ expenses: expenses || [] });
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
    const { trip_id, ...expenseData } = body;

    if (!trip_id) {
      return NextResponse.json({ error: "缺少 trip_id" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: member } = await admin
      .from("trip_members")
      .select("trip_id")
      .eq("trip_id", trip_id)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const { data: expense, error } = await admin
      .from("expenses")
      .insert({
        ...expenseData,
        trip_id,
        paid_by: expenseData.paid_by || user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ expense });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
