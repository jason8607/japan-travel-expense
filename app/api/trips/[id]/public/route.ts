import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    const { data: trip, error } = await admin
      .from("trips")
      .select("id, name, start_date, end_date")
      .eq("id", id)
      .single();

    if (error || !trip) {
      return NextResponse.json({ error: "找不到旅程" }, { status: 404 });
    }

    return NextResponse.json({ trip });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
