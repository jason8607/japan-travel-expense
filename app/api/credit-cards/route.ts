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
    const { data: cards, error } = await admin
      .from("credit_cards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("credit-cards GET error:", error.message);
      return NextResponse.json({ error: "載入信用卡失敗" }, { status: 500 });
    }

    return NextResponse.json({ cards: cards || [] });
  } catch (err) {
    console.error("credit-cards GET error:", err);
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
    const { name, cashback_rate, cashback_limit } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "卡片名稱不得為空" }, { status: 400 });
    }
    if (typeof cashback_rate !== "number" || cashback_rate <= 0) {
      return NextResponse.json({ error: "回饋 % 必須大於 0" }, { status: 400 });
    }
    if (typeof cashback_limit !== "number" || cashback_limit <= 0) {
      return NextResponse.json({ error: "回饋上限必須大於 0" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data: card, error } = await admin
      .from("credit_cards")
      .insert({
        user_id: user.id,
        name: name.trim(),
        cashback_rate,
        cashback_limit,
      })
      .select()
      .single();

    if (error) {
      console.error("credit-cards POST error:", error.message);
      return NextResponse.json({ error: "新增信用卡失敗" }, { status: 500 });
    }

    return NextResponse.json({ card });
  } catch (err) {
    console.error("credit-cards POST error:", err);
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
    const { id, name, cashback_rate, cashback_limit } = body;

    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: existing } = await admin
      .from("credit_cards")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json({ error: "卡片名稱不得為空" }, { status: 400 });
    }
    if (cashback_rate !== undefined && (typeof cashback_rate !== "number" || cashback_rate <= 0)) {
      return NextResponse.json({ error: "回饋 % 必須大於 0" }, { status: 400 });
    }
    if (cashback_limit !== undefined && (typeof cashback_limit !== "number" || cashback_limit <= 0)) {
      return NextResponse.json({ error: "回饋上限必須大於 0" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (cashback_rate !== undefined) updates.cashback_rate = cashback_rate;
    if (cashback_limit !== undefined) updates.cashback_limit = cashback_limit;

    const { data: card, error } = await admin
      .from("credit_cards")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("credit-cards PUT error:", error.message);
      return NextResponse.json({ error: "更新信用卡失敗" }, { status: 500 });
    }

    return NextResponse.json({ card });
  } catch (err) {
    console.error("credit-cards PUT error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: existing } = await admin
      .from("credit_cards")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const { error } = await admin
      .from("credit_cards")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("credit-cards DELETE error:", error.message);
      return NextResponse.json({ error: "刪除信用卡失敗" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("credit-cards DELETE error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
