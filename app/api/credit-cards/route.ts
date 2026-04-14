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

    // Fetch plans for all cards
    const cardIds = (cards || []).map((c: { id: string }) => c.id);
    let plans: { id: string; credit_card_id: string; name: string; cashback_rate: number }[] = [];
    if (cardIds.length > 0) {
      try {
        const { data: planData, error: planError } = await admin
          .from("credit_card_plans")
          .select("*")
          .in("credit_card_id", cardIds)
          .order("created_at", { ascending: true });
        if (planError) {
          console.error("credit-card plans fetch error:", planError.message);
        } else {
          plans = planData || [];
        }
      } catch (planErr) {
        console.error("credit-card plans fetch error:", planErr);
      }
    }

    // Attach plans to cards
    const cardsWithPlans = (cards || []).map((card: { id: string }) => ({
      ...card,
      plans: plans.filter((p) => p.credit_card_id === card.id),
    }));

    return NextResponse.json({ cards: cardsWithPlans });
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
    const { name, cashback_rate, cashback_limit, plans } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "卡片名稱不得為空" }, { status: 400 });
    }
    if (typeof cashback_rate !== "number" || cashback_rate < 0) {
      return NextResponse.json({ error: "回饋 % 必須大於等於 0" }, { status: 400 });
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

    // Insert plans if provided
    let cardPlans: unknown[] = [];
    if (Array.isArray(plans) && plans.length > 0) {
      const planRows = plans
        .filter((p: { name?: string; cashback_rate?: number }) => p.name && typeof p.cashback_rate === "number")
        .map((p: { name: string; cashback_rate: number }) => ({
          credit_card_id: card.id,
          name: p.name.trim(),
          cashback_rate: p.cashback_rate,
        }));

      if (planRows.length > 0) {
        const { data: planData, error: planError } = await admin
          .from("credit_card_plans")
          .insert(planRows)
          .select();

        if (planError) {
          console.error("credit-card plans insert error:", planError.message);
        } else {
          cardPlans = planData || [];
        }
      }
    }

    return NextResponse.json({ card: { ...card, plans: cardPlans } });
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
    const { id, name, cashback_rate, cashback_limit, plans } = body;

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
    if (cashback_rate !== undefined && (typeof cashback_rate !== "number" || cashback_rate < 0)) {
      return NextResponse.json({ error: "回饋 % 必須大於等於 0" }, { status: 400 });
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

    // Sync plans if provided (upsert strategy to preserve IDs)
    let cardPlans: unknown[] = [];
    if (Array.isArray(plans)) {
      const validPlans = plans.filter(
        (p: { name?: string; cashback_rate?: number }) => p.name && typeof p.cashback_rate === "number"
      ) as { id?: string; name: string; cashback_rate: number }[];

      // Fetch existing plans
      const { data: existingPlans } = await admin
        .from("credit_card_plans")
        .select("id")
        .eq("credit_card_id", id);

      const existingIds = new Set((existingPlans || []).map((p: { id: string }) => p.id));
      const incomingIds = new Set(validPlans.filter((p) => p.id).map((p) => p.id!));

      // Delete removed plans
      const toDelete = [...existingIds].filter((eid) => !incomingIds.has(eid));
      if (toDelete.length > 0) {
        await admin.from("credit_card_plans").delete().in("id", toDelete);
      }

      // Update existing plans
      for (const p of validPlans.filter((p) => p.id && existingIds.has(p.id!))) {
        await admin
          .from("credit_card_plans")
          .update({ name: p.name.trim(), cashback_rate: p.cashback_rate })
          .eq("id", p.id!);
      }

      // Insert new plans (no id)
      const toInsert = validPlans
        .filter((p) => !p.id || !existingIds.has(p.id))
        .map((p) => ({ credit_card_id: id, name: p.name.trim(), cashback_rate: p.cashback_rate }));

      if (toInsert.length > 0) {
        await admin.from("credit_card_plans").insert(toInsert);
      }

      // Fetch final state
      const { data: finalPlans } = await admin
        .from("credit_card_plans")
        .select("*")
        .eq("credit_card_id", id)
        .order("created_at", { ascending: true });
      cardPlans = finalPlans || [];
    } else {
      // Plans not provided — fetch current plans
      const { data: existingPlans } = await admin
        .from("credit_card_plans")
        .select("*")
        .eq("credit_card_id", id)
        .order("created_at", { ascending: true });
      cardPlans = existingPlans || [];
    }

    return NextResponse.json({ card: { ...card, plans: cardPlans } });
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

    // Plans are cascade-deleted by FK constraint
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
