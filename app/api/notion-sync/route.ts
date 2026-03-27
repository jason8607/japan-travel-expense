import { NextRequest, NextResponse } from "next/server";
import { syncExpenseToNotion } from "@/lib/notion";
import { getAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "@/lib/supabase/auth-helper";

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const { expenseId, notionToken, databaseId } = await request.json();

    if (!expenseId || !notionToken || !databaseId) {
      return NextResponse.json(
        { error: "缺少必要參數" },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

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

    // 確認用戶是此消費所屬旅程的成員
    const { data: member } = await supabase
      .from("trip_members")
      .select("trip_id")
      .eq("trip_id", expense.trip_id)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const notionPageId = await syncExpenseToNotion(
      expense,
      notionToken,
      databaseId
    );

    const { error: dbError } = await supabase
      .from("expenses")
      .update({ notion_page_id: notionPageId })
      .eq("id", expenseId)
      .eq("trip_id", expense.trip_id);

    if (dbError) {
      console.error("Failed to save notion_page_id:", dbError.message);
      return NextResponse.json(
        { error: "Notion 同步成功但儲存 ID 失敗" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, notionPageId });
  } catch (error: unknown) {
    console.error("Notion sync error:", error);
    return NextResponse.json({ error: "Notion 同步失敗" }, { status: 500 });
  }
}
