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

// Flatten the nested expense_participants relation into a string[] of user_ids.
// Supabase returns related rows as an array of objects; we collapse them so the
// frontend can treat `expense.participants` as a plain id list.
type ExpenseRow = Record<string, unknown> & {
  expense_participants?: { user_id: string }[];
};

function flattenParticipants<T extends ExpenseRow>(row: T): T & { participants: string[] } {
  const { expense_participants, ...rest } = row;
  return {
    ...(rest as T),
    participants: (expense_participants ?? []).map((p) => p.user_id),
  };
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
        .select("*, expense_participants(user_id)")
        .eq("id", expenseId)
        .single();

      if (error || !expense) {
        return NextResponse.json({ error: "找不到消費" }, { status: 404 });
      }

      const hasAccess = await verifyTripAccess(admin, expense.trip_id, user.id);
      if (!hasAccess) {
        return NextResponse.json({ error: "無權限" }, { status: 403 });
      }

      return NextResponse.json({ expense: flattenParticipants(expense) });
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
      .select("*, profile:profiles!paid_by(*), expense_participants(user_id)")
      .eq("trip_id", tripId)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("expenses GET list error:", error.message);
      return NextResponse.json({ error: "載入消費紀錄失敗" }, { status: 500 });
    }

    return NextResponse.json({
      expenses: (expenses || []).map(flattenParticipants),
    });
  } catch (err) {
    console.error("expenses GET error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

// Validate participants array: must be string[] of trip member user_ids.
// Returns the deduped, validated array, or an error message.
async function validateParticipants(
  admin: ReturnType<typeof getAdminClient>,
  tripId: string,
  participants: unknown
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  if (participants === undefined || participants === null) {
    return { ok: true, ids: [] };
  }
  if (!Array.isArray(participants)) {
    return { ok: false, error: "participants 必須為陣列" };
  }
  const unique = Array.from(
    new Set(
      participants.filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );
  if (unique.length === 0) {
    return { ok: true, ids: [] };
  }
  const { data: members, error } = await admin
    .from("trip_members")
    .select("user_id")
    .eq("trip_id", tripId)
    .in("user_id", unique);
  if (error) {
    return { ok: false, error: "驗證 participants 失敗" };
  }
  if (!members || members.length !== unique.length) {
    return { ok: false, error: "participants 必須全部是旅程成員" };
  }
  return { ok: true, ids: unique };
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
      credit_card_id,
      credit_card_plan_id,
      input_currency,
      note,
      participants,
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

    if (category && (typeof category !== "string" || category.trim().length === 0)) {
      return NextResponse.json({ error: "分類不得為空" }, { status: 400 });
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

    if (credit_card_id) {
      const { data: card } = await admin
        .from("credit_cards")
        .select("user_id")
        .eq("id", credit_card_id)
        .single();
      if (!card || card.user_id !== user.id) {
        return NextResponse.json({ error: "無效的信用卡" }, { status: 400 });
      }
    }

    // Only validate/store participants for split expenses; ignored otherwise.
    let participantIds: string[] = [];
    if (split_type === "split") {
      const result = await validateParticipants(admin, trip_id, participants);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      participantIds = result.ids;
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
        credit_card_id: credit_card_id || null,
        credit_card_plan_id: credit_card_plan_id || null,
        input_currency: input_currency || "JPY",
        note: note || null,
      })
      .select()
      .single();

    if (error || !expense) {
      console.error("expenses POST error:", error?.message);
      return NextResponse.json({ error: "新增消費失敗" }, { status: 500 });
    }

    // Insert participant rows in a separate statement. If this fails we roll
    // back the parent expense to keep the two stores consistent.
    if (participantIds.length > 0) {
      const { error: participantErr } = await admin
        .from("expense_participants")
        .insert(participantIds.map((user_id) => ({ expense_id: expense.id, user_id })));
      if (participantErr) {
        console.error("expense_participants insert error:", participantErr.message);
        await admin.from("expenses").delete().eq("id", expense.id);
        return NextResponse.json({ error: "新增分帳人選失敗" }, { status: 500 });
      }
    }

    return NextResponse.json({ expense: { ...expense, participants: participantIds } });
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
      "credit_card_id",
      "credit_card_plan_id",
      "input_currency",
      "note",
    ];
    const safeUpdates: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in updates) safeUpdates[field] = updates[field];
    }

    if (safeUpdates.credit_card_id) {
      const { data: card } = await admin
        .from("credit_cards")
        .select("user_id")
        .eq("id", safeUpdates.credit_card_id as string)
        .single();
      if (!card || card.user_id !== user.id) {
        return NextResponse.json({ error: "無效的信用卡" }, { status: 400 });
      }
    }

    // Resolve the effective split_type for participant handling (use the new
    // value if updating, otherwise the existing one).
    const effectiveSplitType =
      "split_type" in safeUpdates
        ? (safeUpdates.split_type as string)
        : undefined;

    let participantIds: string[] | null = null;
    if ("participants" in updates) {
      // Caller is explicitly setting participants. If we're switching away from
      // 'split' (or already not split and not switching to it), force empty.
      const finalSplitType =
        effectiveSplitType ??
        (await admin.from("expenses").select("split_type").eq("id", id).single())
          .data?.split_type;
      if (finalSplitType === "split") {
        const result = await validateParticipants(admin, existing.trip_id, updates.participants);
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        participantIds = result.ids;
      } else {
        participantIds = [];
      }
    } else if (effectiveSplitType && effectiveSplitType !== "split") {
      // split_type changed away from 'split' without explicit participants:
      // clear participant rows so stale data doesn't leak into settlement.
      participantIds = [];
    }

    const { data: expense, error } = await admin
      .from("expenses")
      .update(safeUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error || !expense) {
      console.error("expenses PUT error:", error?.message);
      return NextResponse.json({ error: "更新消費失敗" }, { status: 500 });
    }

    // Upsert participants by delete-then-insert (small row count, safe).
    if (participantIds !== null) {
      const { error: deleteErr } = await admin
        .from("expense_participants")
        .delete()
        .eq("expense_id", id);
      if (deleteErr) {
        console.error("expense_participants delete error:", deleteErr.message);
        return NextResponse.json({ error: "更新分帳人選失敗" }, { status: 500 });
      }
      if (participantIds.length > 0) {
        const { error: insertErr } = await admin
          .from("expense_participants")
          .insert(participantIds.map((user_id) => ({ expense_id: id, user_id })));
        if (insertErr) {
          console.error("expense_participants insert error:", insertErr.message);
          return NextResponse.json({ error: "更新分帳人選失敗" }, { status: 500 });
        }
      }
    }

    // Re-fetch the participant ids so the response always reflects current state.
    const { data: participantRows } = await admin
      .from("expense_participants")
      .select("user_id")
      .eq("expense_id", id);

    return NextResponse.json({
      expense: {
        ...expense,
        participants: (participantRows ?? []).map((r) => r.user_id),
      },
    });
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
