import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = getAdminClient();

    const { data: trip, error } = await admin
      .from("trips")
      .select("id, name, start_date, end_date, created_by")
      .eq("id", id)
      .single();

    if (error || !trip) {
      return NextResponse.json({ error: "找不到旅程" }, { status: 404 });
    }

    const { data: owner } = await admin
      .from("profiles")
      .select("display_name, avatar_url, avatar_emoji")
      .eq("id", trip.created_by)
      .single();

    return NextResponse.json({
      trip: {
        id: trip.id,
        name: trip.name,
        start_date: trip.start_date,
        end_date: trip.end_date,
      },
      owner: owner ?? null,
    });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
