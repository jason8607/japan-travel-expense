import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "@/lib/supabase/auth-helper";

interface CreditCardRow {
  id: string;
  user_id: string;
  name: string;
  cashback_rate: number;
  cashback_limit: number;
  created_at: string;
}

interface CreditCardPlanRow {
  id: string;
  credit_card_id: string;
  name: string;
  cashback_rate: number;
  created_at: string;
}

interface ProfileRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  avatar_emoji: string;
  created_at: string;
}

// Returns credit cards (with plans) grouped by trip member.
// Used by the stats page to show per-member cashback progress.
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

    const admin = getAdminClient();

    const { data: membership } = await admin
      .from("trip_members")
      .select("trip_id")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const { data: memberRows, error: memberError } = await admin
      .from("trip_members")
      .select("user_id, role, profile:profiles(*)")
      .eq("trip_id", tripId);

    if (memberError) {
      console.error("trip-cashback members error:", memberError.message);
      return NextResponse.json({ error: "載入成員失敗" }, { status: 500 });
    }

    const members = (memberRows || []) as unknown as {
      user_id: string;
      role: string;
      profile: ProfileRow | null;
    }[];

    const userIds = members.map((m) => m.user_id);

    if (userIds.length === 0) {
      return NextResponse.json({ members: [] });
    }

    const { data: cardRows } = await admin
      .from("credit_cards")
      .select("*")
      .in("user_id", userIds)
      .order("created_at", { ascending: true });

    const cards = (cardRows || []) as CreditCardRow[];
    const cardIds = cards.map((c) => c.id);

    let plans: CreditCardPlanRow[] = [];
    if (cardIds.length > 0) {
      const { data: planRows } = await admin
        .from("credit_card_plans")
        .select("*")
        .in("credit_card_id", cardIds)
        .order("created_at", { ascending: true });
      plans = (planRows || []) as CreditCardPlanRow[];
    }

    const result = members.map((m) => {
      const userCards = cards
        .filter((c) => c.user_id === m.user_id)
        .map((c) => ({
          id: c.id,
          name: c.name,
          cashback_rate: c.cashback_rate,
          cashback_limit: c.cashback_limit,
          plans: plans
            .filter((p) => p.credit_card_id === c.id)
            .map((p) => ({
              id: p.id,
              credit_card_id: p.credit_card_id,
              name: p.name,
              cashback_rate: p.cashback_rate,
            })),
        }));

      return {
        user_id: m.user_id,
        role: m.role,
        profile: m.profile,
        cards: userCards,
      };
    });

    return NextResponse.json({ members: result });
  } catch (err) {
    console.error("trip-cashback GET error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
