import { NextRequest, NextResponse } from "next/server";
import { syncExpenseToNotion } from "@/lib/notion";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { expenseId, notionToken, databaseId } = await request.json();

    if (!expenseId || !notionToken || !databaseId) {
      return NextResponse.json(
        { error: "缺少必要參數" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: expense, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", expenseId)
      .single();

    if (error || !expense) {
      return NextResponse.json(
        { error: "找不到消費紀錄" },
        { status: 404 }
      );
    }

    const notionPageId = await syncExpenseToNotion(
      expense,
      notionToken,
      databaseId
    );

    await supabase
      .from("expenses")
      .update({ notion_page_id: notionPageId })
      .eq("id", expenseId);

    return NextResponse.json({ success: true, notionPageId });
  } catch (error: unknown) {
    console.error("Notion sync error:", error);
    const message =
      error instanceof Error ? error.message : "Notion 同步失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
