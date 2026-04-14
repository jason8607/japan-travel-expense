import type { Expense, TripMember } from "@/types";

export interface Settlement {
  from: string;
  fromName: string;
  fromEmoji: string;
  fromAvatarUrl: string | null;
  to: string;
  toName: string;
  toEmoji: string;
  toAvatarUrl: string | null;
  amount: number;
}

export interface MemberBalance {
  userId: string;
  name: string;
  emoji: string;
  avatarUrl: string | null;
  paid: number;
  owed: number;
  balance: number;
}

export function calculateSettlements(
  expenses: Expense[],
  members: TripMember[]
): { balances: MemberBalance[]; settlements: Settlement[] } {
  if (members.length < 2) return { balances: [], settlements: [] };

  const memberCount = members.length;

  // Track how much each member paid and how much they owe
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();

  for (const m of members) {
    paid.set(m.user_id, 0);
    owed.set(m.user_id, 0);
  }

  const memberIds = new Set(members.map((m) => m.user_id));

  for (const expense of expenses) {
    // Skip expenses whose payer is no longer a member
    if (!memberIds.has(expense.paid_by)) continue;

    // Add to paid
    paid.set(expense.paid_by, (paid.get(expense.paid_by) || 0) + expense.amount_jpy);

    if (expense.split_type === "split") {
      // Split evenly among all members, last member absorbs remainder
      const share = Math.floor(expense.amount_jpy / memberCount);
      const remainder = expense.amount_jpy - share * (memberCount - 1);
      for (let i = 0; i < members.length; i++) {
        const amount = i === members.length - 1 ? remainder : share;
        owed.set(members[i].user_id, (owed.get(members[i].user_id) || 0) + amount);
      }
    } else {
      // Personal expense: owner owes the full amount
      const owner = expense.owner_id || expense.paid_by;
      // If owner is no longer a member, fall back to payer
      const effectiveOwner = memberIds.has(owner) ? owner : expense.paid_by;
      owed.set(effectiveOwner, (owed.get(effectiveOwner) || 0) + expense.amount_jpy);
    }
  }

  // Calculate balance (positive = should receive, negative = should pay)
  const balances: MemberBalance[] = members.map((m) => {
    const p = paid.get(m.user_id) || 0;
    const o = owed.get(m.user_id) || 0;
    return {
      userId: m.user_id,
      name: m.profile?.display_name || "成員",
      emoji: m.profile?.avatar_emoji || "🧑",
      avatarUrl: m.profile?.avatar_url || null,
      paid: Math.round(p),
      owed: Math.round(o),
      balance: Math.round(p - o),
    };
  });

  // Minimize number of transfers using greedy algorithm
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  for (const b of balances) {
    if (b.balance > 0) creditors.push({ id: b.userId, amount: b.balance });
    else if (b.balance < 0) debtors.push({ id: b.userId, amount: -b.balance });
  }

  // Sort by amount descending for optimal matching
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].amount, debtors[di].amount);
    if (amount > 0) {
      const fromMember = members.find((m) => m.user_id === debtors[di].id)!;
      const toMember = members.find((m) => m.user_id === creditors[ci].id)!;
      settlements.push({
        from: debtors[di].id,
        fromName: fromMember.profile?.display_name || "成員",
        fromEmoji: fromMember.profile?.avatar_emoji || "🧑",
        fromAvatarUrl: fromMember.profile?.avatar_url || null,
        to: creditors[ci].id,
        toName: toMember.profile?.display_name || "成員",
        toEmoji: toMember.profile?.avatar_emoji || "🧑",
        toAvatarUrl: toMember.profile?.avatar_url || null,
        amount: Math.round(amount),
      });
    }

    creditors[ci].amount -= amount;
    debtors[di].amount -= amount;

    if (creditors[ci].amount === 0) ci++;
    if (debtors[di].amount === 0) di++;
  }

  return { balances, settlements };
}
