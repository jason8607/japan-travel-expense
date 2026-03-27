import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "@/lib/supabase/auth-helper";

async function verifyTripAccess(admin: ReturnType<typeof getAdminClient>, tripId: string, userId: string) {
  const { data } = await admin
    .from("trip_members")
    .select("trip_id")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .single();
  return !!data;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const admin = getAdminClient();
    const expenseId = req.nextUrl.searchParams.get("id");

    if (expenseId) {
      const { data: expense, error } = await admin
        .from("expenses")
        .select("*")
        .eq("id", expenseId)
        .single();

      if (error || !expense) {
        return NextResponse.json({ error: "找不到消費" }, { status: 404 });
      }

      const hasAccess = await verifyTripAccess(admin, expense.trip_id, user.id);
      if (!hasAccess) {
        return NextResponse.json({ error: "無權限" }, { status: 403 });
      }

      return NextResponse.json({ expense });
    }

    const tripId = req.nextUrl.searchParams.get("trip_id");
    if (!tripId) {
      return NextResponse.json({ error: "缺少 trip_id 或 id" }, { status: 400 });
    }

    const hasAccess = await verifyTripAccess(admin, tripId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 200, 500);
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;

    const { data: expenses, error } = await admin
      .from("expenses")
      .select("*, profile:profiles!paid_by(*)")
      .eq("trip_id", tripId)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("expenses GET list error:", error.message);
      return NextResponse.json({ error: "載入消費紀錄失敗" }, { status: 500 });
    }

    return NextResponse.json({ expenses: expenses || [] });
  } catch (err) {
    console.error("expenses GET error:", err);
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
    const {
      trip_id,
      paid_by: rawPaidBy,
      title,
      title_ja,
      amount_jpy,
      amount_twd,
      exchange_rate,
      category,
      payment_method,
      location,
      store_name,
      store_name_ja,
      expense_date,
      receipt_image_url,
      split_type,
      owner_id,
    } = body;

    if (!trip_id) {
      return NextResponse.json({ error: "缺少 trip_id" }, { status: 400 });
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "標題不得為空" }, { status: 400 });
    }

    if (typeof amount_jpy !== "number" || amount_jpy < 0) {
      return NextResponse.json({ error: "金額必須為非負數" }, { status: 400 });
    }

    const VALID_CATEGORIES = ["餐飲", "交通", "購物", "住宿", "門票", "藥品", "美妝", "衣服", "其他"];
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "無效的分類" }, { status: 400 });
    }

    const VALID_PAYMENTS = ["現金", "信用卡", "PayPay", "Suica", "其他"];
    if (payment_method && !VALID_PAYMENTS.includes(payment_method)) {
      return NextResponse.json({ error: "無效的付款方式" }, { status: 400 });
    }

    if (expense_date && !/^\d{4}-\d{2}-\d{2}$/.test(expense_date)) {
      return NextResponse.json({ error: "日期格式錯誤" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: member } = await admin
      .from("trip_members")
      .select("trip_id")
      .eq("trip_id", trip_id)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const paidBy = rawPaidBy || user.id;
    if (paidBy !== user.id) {
      const { data: paidByMember } = await admin
        .from("trip_members")
        .select("user_id")
        .eq("trip_id", trip_id)
        .eq("user_id", paidBy)
        .single();
      if (!paidByMember) {
        return NextResponse.json({ error: "paid_by 必須是旅程成員" }, { status: 400 });
      }
    }

    if (owner_id && owner_id !== user.id && owner_id !== paidBy) {
      const { data: ownerMember } = await admin
        .from("trip_members")
        .select("user_id")
        .eq("trip_id", trip_id)
        .eq("user_id", owner_id)
        .single();
      if (!ownerMember) {
        return NextResponse.json({ error: "owner_id 必須是旅程成員" }, { status: 400 });
      }
    }

    const { data: expense, error } = await admin
      .from("expenses")
      .insert({
        trip_id,
        paid_by: paidBy,
        title,
        title_ja,
        amount_jpy,
        amount_twd,
        exchange_rate,
        category,
        payment_method,
        location,
        store_name,
        store_name_ja,
        expense_date,
        receipt_image_url,
        split_type,
        owner_id,
      })
      .select()
      .single();

    if (error) {
      console.error("expenses POST error:", error.message);
      return NextResponse.json({ error: "新增消費失敗" }, { status: 500 });
    }

    return NextResponse.json({ expense });
  } catch (err) {
    console.error("expenses POST error:", err);
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
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: existing } = await admin
      .from("expenses")
      .select("trip_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "找不到消費" }, { status: 404 });
    }

    const hasAccess = await verifyTripAccess(admin, existing.trip_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const { paid_by: rawPaidBy } = updates;
    if (rawPaidBy && rawPaidBy !== user.id) {
      const { data: paidByMember } = await admin
        .from("trip_members")
        .select("user_id")
        .eq("trip_id", existing.trip_id)
        .eq("user_id", rawPaidBy)
        .single();
      if (!paidByMember) {
        return NextResponse.json({ error: "paid_by 必須是旅程成員" }, { status: 400 });
      }
    }

    if ("amount_jpy" in updates && (typeof updates.amount_jpy !== "number" || updates.amount_jpy < 0)) {
      return NextResponse.json({ error: "金額必須為非負數" }, { status: 400 });
    }

    const { owner_id: updateOwnerId } = updates;
    if (updateOwnerId && updateOwnerId !== user.id && updateOwnerId !== updates.paid_by) {
      const { data: ownerMember } = await admin
        .from("trip_members")
        .select("user_id")
        .eq("trip_id", existing.trip_id)
        .eq("user_id", updateOwnerId)
        .single();
      if (!ownerMember) {
        return NextResponse.json({ error: "owner_id 必須是旅程成員" }, { status: 400 });
      }
    }

    const ALLOWED_FIELDS = [
      "title", "title_ja", "amount_jpy", "amount_twd", "exchange_rate",
      "category", "payment_method", "location", "store_name", "store_name_ja",
      "expense_date", "receipt_image_url", "split_type", "owner_id", "paid_by",
    ];
    const safeUpdates: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in updates) safeUpdates[field] = updates[field];
    }

    const { data: expense, error } = await admin
      .from("expenses")
      .update(safeUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("expenses PUT error:", error.message);
      return NextResponse.json({ error: "更新消費失敗" }, { status: 500 });
    }

    return NextResponse.json({ expense });
  } catch (err) {
    console.error("expenses PUT error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const expenseId = req.nextUrl.searchParams.get("id");
    if (!expenseId) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: existing } = await admin
      .from("expenses")
      .select("trip_id")
      .eq("id", expenseId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "找不到消費" }, { status: 404 });
    }

    const hasAccess = await verifyTripAccess(admin, existing.trip_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const { error } = await admin
      .from("expenses")
      .delete()
      .eq("id", expenseId);

    if (error) {
      console.error("expenses DELETE error:", error.message);
      return NextResponse.json({ error: "刪除消費失敗" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("expenses DELETE error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
