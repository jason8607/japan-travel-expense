import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendPush, type PushSubscriptionRow } from "@/lib/push-server";

interface PushSubscriptionRecord extends PushSubscriptionRow {
  user_id: string;
}

interface CreditCardRecord {
  id: string;
  name: string;
  cashback_limit: number;
}

interface ExpenseSumRecord {
  credit_card_id: string;
  total_twd: number;
}

const THRESHOLDS = [80, 100] as const;
type Threshold = (typeof THRESHOLDS)[number];

/** Dedupe window: don't re-send the same (user, card, threshold) within this many hours. */
const DEDUPE_HOURS = 25;

/**
 * Fired once daily via GitHub Actions (.github/workflows/cashback-alert.yml).
 * For each user with push subscriptions:
 *   1. Loads their credit cards that have a spending threshold (cashback_limit > 0).
 *   2. Sums expenses paid by that user per credit card (all trips, all time).
 *   3. Checks 80% and 100% thresholds.
 *   4. Sends a push if not already notified within DEDUPE_HOURS hours.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET 未設定" }, { status: 500 });
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const admin = getAdminClient();

  // 1. All active push subscriptions that have opted in to cashback alerts
  const { data: subs, error: subsErr } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .eq("cashback_alert_enabled", true);

  if (subsErr) return NextResponse.json({ error: subsErr.message }, { status: 500 });
  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0, skipped: 0 });

  const subsByUser = groupByUser(subs as PushSubscriptionRecord[]);
  const goneIds: string[] = [];
  let sent = 0;
  let skipped = 0;

  for (const [userId, userSubs] of Object.entries(subsByUser)) {
    // 2. Credit cards with a spending threshold for this user
    const { data: cards } = await admin
      .from("credit_cards")
      .select("id, name, cashback_limit")
      .eq("user_id", userId)
      .gt("cashback_limit", 0);

    if (!cards || cards.length === 0) continue;

    // 3. Total spending per credit card (all expenses paid by this user)
    const cardIds = (cards as CreditCardRecord[]).map((c) => c.id);
    const { data: expRows } = await admin
      .from("expenses")
      .select("credit_card_id, amount_twd")
      .eq("paid_by", userId)
      .in("credit_card_id", cardIds)
      .not("credit_card_id", "is", null);

    const spendingByCard = sumByCard(expRows as { credit_card_id: string; amount_twd: number }[] | null);

    // 4. For each card × threshold, check and optionally push
    for (const card of cards as CreditCardRecord[]) {
      const totalTwd = spendingByCard[card.id] ?? 0;
      const progress = totalTwd / card.cashback_limit; // 0–1+

      for (const threshold of THRESHOLDS) {
        if (progress * 100 < threshold) continue; // not reached

        const alreadySent = await wasRecentlySent(admin, userId, card.id, threshold);
        if (alreadySent) {
          skipped++;
          continue;
        }

        const payload = buildPayload(card.name, totalTwd, card.cashback_limit, threshold);
        let anySent = false;

        for (const sub of userSubs) {
          const result = await sendPush(sub, payload);
          if (result.ok) {
            anySent = true;
            sent++;
          } else if (result.gone) {
            goneIds.push(sub.id);
          }
        }

        if (anySent) {
          await admin.from("cashback_notifications").insert({
            user_id: userId,
            credit_card_id: card.id,
            threshold_percent: threshold,
          });
        }
      }
    }
  }

  // Clean up expired subscriptions
  if (goneIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", goneIds);
  }

  return NextResponse.json({ sent, skipped, cleaned: goneIds.length });
}

// ─── helpers ────────────────────────────────────────────────────────────────

function groupByUser(subs: PushSubscriptionRecord[]): Record<string, PushSubscriptionRecord[]> {
  return subs.reduce<Record<string, PushSubscriptionRecord[]>>((acc, s) => {
    (acc[s.user_id] ??= []).push(s);
    return acc;
  }, {});
}

function sumByCard(rows: { credit_card_id: string; amount_twd: number }[] | null): Record<string, number> {
  if (!rows) return {};
  return rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.credit_card_id] = (acc[r.credit_card_id] ?? 0) + r.amount_twd;
    return acc;
  }, {});
}

async function wasRecentlySent(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  cardId: string,
  threshold: Threshold
): Promise<boolean> {
  const since = new Date(Date.now() - DEDUPE_HOURS * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("cashback_notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("credit_card_id", cardId)
    .eq("threshold_percent", threshold)
    .gte("sent_at", since)
    .limit(1);
  return !!data && data.length > 0;
}

function buildPayload(
  cardName: string,
  totalTwd: number,
  limit: number,
  threshold: Threshold
) {
  const remaining = Math.max(limit - totalTwd, 0);
  if (threshold === 100) {
    return {
      title: `💳 ${cardName} 已達回饋上限`,
      body: `已刷 NT$${totalTwd.toLocaleString()}，超過上限後的消費將不再累積回饋。`,
      url: "/summary",
      tag: `cashback-maxed-${cardName}`,
    };
  }
  return {
    title: `💳 ${cardName} 回饋即將到頂`,
    body: `已達上限的 ${threshold}%，還能刷 NT$${remaining.toLocaleString()} 繼續累積回饋。`,
    url: "/summary",
    tag: `cashback-${threshold}-${cardName}`,
  };
}
