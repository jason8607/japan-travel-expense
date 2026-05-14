# Daily Budget 80% Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fire an immediate notification (iOS native / PWA / Web) when a trip member's personal daily spending crosses 80% (or 100%) of their personal daily budget. Add the underlying personal-total and personal-daily budget fields.

**Architecture:** Foreground-only trigger inside `useNotificationScheduler` hook. iOS native uses Capacitor `LocalNotifications`; Web/PWA uses the browser `Notification` API. No server push, no cron. Daily budget falls back to `total ÷ days` when daily is unset. See spec: [docs/superpowers/specs/2026-05-14-daily-budget-notification-design.md](../specs/2026-05-14-daily-budget-notification-design.md).

**Tech Stack:** Next.js 16 (App Router), TypeScript 5 strict, Supabase (PostgreSQL + RLS), Capacitor 6 (`@capacitor/local-notifications`), browser Notification API, Tailwind 4, shadcn/ui.

**Verification primitive:** This codebase has **no automated test suite**. Each task verifies via (a) `npx tsc --noEmit` for type correctness, and (b) named manual checks against the dev server / native build. TDD steps are replaced with explicit acceptance checks per task. Commit after each task passes.

**Migration numbering:** Existing migrations go up to `022_push_cashback_alert_enabled.sql`. The new migration is `023_personal_budgets.sql`.

---

## Phase 1 — Data Layer

### Task 1: Migration for personal budget columns

**Files:**
- Create: `supabase/migrations/023_personal_budgets.sql`

- [ ] **Step 1: Write migration**

```sql
-- 023_personal_budgets.sql
-- Adds optional personal budget fields to trip_members for daily budget notifications.

ALTER TABLE trip_members
  ADD COLUMN IF NOT EXISTS total_budget_jpy integer,
  ADD COLUMN IF NOT EXISTS daily_budget_jpy integer;

COMMENT ON COLUMN trip_members.total_budget_jpy IS 'Personal total budget for this trip in JPY';
COMMENT ON COLUMN trip_members.daily_budget_jpy IS 'Personal per-day budget for this trip in JPY';

-- Existing trip_members RLS policies cover update by self (auth.uid() = user_id).
-- If the project's current policy does NOT, add it:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trip_members'
      AND policyname = 'trip_members_update_self'
  ) THEN
    CREATE POLICY trip_members_update_self ON trip_members
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
```

- [ ] **Step 2: Apply migration to local Supabase**

Run: `supabase db push` (or your project's migration command).
Expected: migration `023_personal_budgets.sql` applied without error.

- [ ] **Step 3: Verify columns exist**

Run via Supabase SQL editor or psql:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'trip_members'
  AND column_name IN ('total_budget_jpy', 'daily_budget_jpy');
```
Expected: two rows, both `integer`, both `YES` nullable.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/023_personal_budgets.sql
git commit -m "feat(db): add personal total/daily budget columns to trip_members"
```

---

### Task 2: TypeScript type updates

**Files:**
- Modify: `types/index.ts` (`TripMember` interface)

- [ ] **Step 1: Locate TripMember interface**

Run: `grep -n "interface TripMember\|type TripMember" types/index.ts`
Open the file at the reported line.

- [ ] **Step 2: Add the two fields**

Add inside `TripMember`:
```ts
  total_budget_jpy: number | null;
  daily_budget_jpy: number | null;
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: PASS (zero errors). If errors appear because callers construct `TripMember` without the new fields, fix the callers in the same step — fields are nullable so missing literals should set them to `null` explicitly.

- [ ] **Step 4: Commit**

```bash
git add types/index.ts
git commit -m "feat(types): add total_budget_jpy and daily_budget_jpy to TripMember"
```

---

### Task 3: Guest mode storage support

**Files:**
- Modify: `lib/guest-storage.ts` (trip member persistence)

- [ ] **Step 1: Locate guest trip member structure**

Run: `grep -n "trip_members\|TripMember\|members" lib/guest-storage.ts`
Find where a guest trip member is created or loaded.

- [ ] **Step 2: Default both fields to null on load**

Wherever guest trip members are deserialized from localStorage, spread defaults so existing entries without the fields fall back to `null`:
```ts
const member: TripMember = {
  ...parsedMember,
  total_budget_jpy: parsedMember.total_budget_jpy ?? null,
  daily_budget_jpy: parsedMember.daily_budget_jpy ?? null,
};
```

Wherever a new guest member is created, explicitly set both to `null`.

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manual guest-mode smoke test**

Open dev server (`npm run dev`), enter guest mode, create a trip. Check browser DevTools → Application → Local Storage. The guest trip member entry must include `total_budget_jpy: null` and `daily_budget_jpy: null`.

- [ ] **Step 5: Commit**

```bash
git add lib/guest-storage.ts
git commit -m "feat(guest): persist personal budget fields with null defaults"
```

---

## Phase 2 — Budget Calculation Library

### Task 4: Create `lib/budget.ts`

**Files:**
- Create: `lib/budget.ts`

- [ ] **Step 1: Write the module**

```ts
import type { Expense, Trip, TripMember } from "@/types";

/** Number of inclusive days in the trip. Minimum 1 to avoid divide-by-zero. */
export function tripDays(trip: Pick<Trip, "start_date" | "end_date">): number {
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

/**
 * Returns the daily budget for notification / display purposes.
 * - If member.daily_budget_jpy is set (> 0), use it.
 * - Else if member.total_budget_jpy is set (> 0), use floor(total / tripDays).
 * - Else null (feature off for this member).
 */
export function effectiveDailyBudgetJpy(
  member: Pick<TripMember, "daily_budget_jpy" | "total_budget_jpy">,
  trip: Pick<Trip, "start_date" | "end_date">,
): number | null {
  if (member.daily_budget_jpy != null && member.daily_budget_jpy > 0) {
    return member.daily_budget_jpy;
  }
  if (member.total_budget_jpy != null && member.total_budget_jpy > 0) {
    const days = tripDays(trip);
    if (days > 0) return Math.floor(member.total_budget_jpy / days);
  }
  return null;
}

/** True if effectiveDailyBudgetJpy is auto-derived from total. Used by UI to show "(自動)". */
export function isDailyBudgetDerived(
  member: Pick<TripMember, "daily_budget_jpy" | "total_budget_jpy">,
): boolean {
  return (
    (member.daily_budget_jpy == null || member.daily_budget_jpy <= 0) &&
    member.total_budget_jpy != null &&
    member.total_budget_jpy > 0
  );
}

/** Today's date string in Asia/Tokyo as YYYY-MM-DD. */
export function todayInJapan(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

/**
 * Personal JPY share of a single expense for a given user.
 * - personal && owner = full amount
 * - split = pro-rata by expense_splits.shares (or .amount if that's the shape)
 *
 * NOTE: This depends on the actual shape of expense splits. Adjust the inner
 * branch to match the project's existing splitting math (see existing usage
 * in components/expense/settlement-view.tsx or lib/settlement.ts).
 */
export function personalShareJpy(expense: Expense, userId: string): number {
  if (expense.split_type === "personal") {
    return expense.owner_id === userId ? expense.amount_jpy : 0;
  }
  if (expense.split_type === "split") {
    return splitShareJpy(expense, userId);
  }
  return 0;
}

function splitShareJpy(expense: Expense, userId: string): number {
  // Inspect existing split shape during Task 5; adjust this body to match.
  // Common shapes:
  //   expense.expense_splits: { user_id, shares }[]
  //   expense.expense_participants: { user_id, amount_jpy }[]
  const anySplits = (expense as unknown as Record<string, unknown>).expense_splits;
  if (Array.isArray(anySplits) && anySplits.length > 0) {
    const total = anySplits.reduce((s: number, x: { shares?: number }) => s + (x.shares ?? 0), 0);
    const mine =
      (anySplits.find((x: { user_id?: string }) => x.user_id === userId) as { shares?: number } | undefined)
        ?.shares ?? 0;
    return total > 0 ? Math.round((expense.amount_jpy * mine) / total) : 0;
  }
  return 0;
}

/** Sum of personal JPY shares across all expenses dated `day` (YYYY-MM-DD). */
export function todaySpentJpy(
  expenses: Expense[],
  userId: string,
  day: string,
): number {
  return expenses
    .filter((e) => e.date === day)
    .reduce((sum, e) => sum + personalShareJpy(e, userId), 0);
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS. If `Expense` / `Trip` / `TripMember` fields used here don't exist, fix the import paths or adjust per the actual types in `types/index.ts`.

- [ ] **Step 3: Verify `personalShareJpy` against existing split logic**

Run: `grep -rn "split_type\s*===\|expense_splits\|expense_participants" components lib hooks | head -30`

Inspect 2-3 existing usages to confirm whether splits are stored as `expense_splits` or `expense_participants`, and whether shares are `shares` (relative weight) or `amount_jpy` (absolute). Adjust `splitShareJpy` to mirror the existing pattern exactly. **Do not invent a new convention.**

- [ ] **Step 4: Smoke-test with a temp script**

Create `/tmp/budget-smoke.ts`:
```ts
import { tripDays, effectiveDailyBudgetJpy, isDailyBudgetDerived, todayInJapan } from "@/lib/budget";

const trip = { start_date: "2026-05-10", end_date: "2026-05-16" };
console.log("days:", tripDays(trip)); // 7

console.log("derived from total:", effectiveDailyBudgetJpy(
  { daily_budget_jpy: null, total_budget_jpy: 70000 }, trip)); // 10000
console.log("daily wins:", effectiveDailyBudgetJpy(
  { daily_budget_jpy: 15000, total_budget_jpy: 70000 }, trip)); // 15000
console.log("both null:", effectiveDailyBudgetJpy(
  { daily_budget_jpy: null, total_budget_jpy: null }, trip)); // null
console.log("isDerived:", isDailyBudgetDerived({ daily_budget_jpy: null, total_budget_jpy: 70000 })); // true
console.log("isDerived (manual daily):", isDailyBudgetDerived({ daily_budget_jpy: 15000, total_budget_jpy: 70000 })); // false
console.log("today JP:", todayInJapan(new Date("2026-05-14T15:00:00Z"))); // "2026-05-15" (Asia/Tokyo)
```

Run: `npx tsx /tmp/budget-smoke.ts`
Expected output matches comments. Delete `/tmp/budget-smoke.ts` after.

- [ ] **Step 5: Commit**

```bash
git add lib/budget.ts
git commit -m "feat(budget): add personal budget + today's personal spend helpers"
```

---

## Phase 3 — Notification Primitives

### Task 5: Web notification helper

**Files:**
- Create: `lib/notifications-web.ts`

- [ ] **Step 1: Write the module**

```ts
/** Foreground-only web Notification API wrapper. PWA / Browser only. */

export function webNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function ensureWebPermission(): Promise<boolean> {
  if (!webNotificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showWebNotification(title: string, body: string, tag: string): void {
  if (!webNotificationsSupported()) return;
  if (Notification.permission !== "granted") return;
  new Notification(title, { body, tag, icon: "/icon-192.png" });
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Verify icon path exists**

Run: `ls public/icon-192.png 2>/dev/null || ls public/icons/ 2>/dev/null`
If `/icon-192.png` doesn't exist, replace the `icon` value with an actual PWA icon from `public/`. If no suitable icon exists at all, omit the `icon` property — browsers will fall back to a default.

- [ ] **Step 4: Commit**

```bash
git add lib/notifications-web.ts
git commit -m "feat(notifications): add foreground web Notification API wrapper"
```

---

### Task 6: Extend `lib/notifications.ts` with daily-budget dispatch

**Files:**
- Modify: `lib/notifications.ts`

- [ ] **Step 1: Add the new notification ID**

Locate `NOTIFICATION_IDS` (currently lines 5-9). Add a third entry:
```ts
export const NOTIFICATION_IDS = {
  dailyReminder: 1001,
  cashbackBase: 2000,
  dailyBudget: 3000,
};
```

- [ ] **Step 2: Add `notifyDailyBudget` function**

Append at the bottom of the file:

```ts
import { showWebNotification, ensureWebPermission } from "@/lib/notifications-web";

/**
 * Unified permission gate — native vs web. Returns true if notifications can fire.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (isNativeApp()) return ensurePermission();
  return ensureWebPermission();
}

export async function notifyDailyBudget(params: {
  tripName: string;
  spent: number;      // JPY
  budget: number;     // JPY
  threshold: 80 | 100;
}): Promise<void> {
  const { tripName, spent, budget, threshold } = params;
  const percent = Math.round((spent / budget) * 100);
  const title =
    threshold === 100
      ? `${tripName} 今日預算已超支`
      : `${tripName} 今日已用 ${percent}% 預算`;
  const body =
    `今日花費 ¥${spent.toLocaleString()} / ¥${budget.toLocaleString()}，` +
    (threshold === 100 ? "已超出預算。" : "接近上限了。");

  if (isNativeApp()) {
    await LocalNotifications.schedule({
      notifications: [{ id: NOTIFICATION_IDS.dailyBudget, title, body }],
    });
    return;
  }
  showWebNotification(title, body, `daily-budget-${threshold}`);
}
```

The `import` line for `showWebNotification` / `ensureWebPermission` goes with the other imports at the top of the file — do not leave it embedded mid-file.

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/notifications.ts
git commit -m "feat(notifications): add notifyDailyBudget cross-platform dispatch"
```

---

## Phase 4 — Preferences & Scheduler Hook

### Task 7: Extend notification prefs

**Files:**
- Modify: `lib/notification-prefs.ts`

- [ ] **Step 1: Add the threshold type and new prefs fields**

After the existing `CashbackThreshold` type, add:
```ts
export type BudgetThreshold = 80 | 100;
```

In the `NotificationPrefs` interface, add:
```ts
  dailyBudgetWarningEnabled: boolean;
  dailyBudgetWarningThreshold: BudgetThreshold;
```

In `DEFAULT_PREFS`, add:
```ts
  dailyBudgetWarningEnabled: false,
  dailyBudgetWarningThreshold: 80,
```

In `loadPrefs()`, inside the merged object that the function returns, add:
```ts
      dailyBudgetWarningEnabled:
        typeof parsed.dailyBudgetWarningEnabled === "boolean"
          ? parsed.dailyBudgetWarningEnabled
          : DEFAULT_PREFS.dailyBudgetWarningEnabled,
      dailyBudgetWarningThreshold:
        parsed.dailyBudgetWarningThreshold === 100 ? 100 : 80,
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Migration of existing localStorage entries**

Open dev server, ensure prefs in localStorage already exist (from prior daily-reminder usage). Reload the app — verify the page does not crash and `loadPrefs()` returns the new fields with defaults. Test in DevTools console:
```js
JSON.parse(localStorage.getItem("ryocho.notification-prefs.v1"))
```
After page load + any save action, the stored JSON should contain `dailyBudgetWarningEnabled: false`.

- [ ] **Step 4: Commit**

```bash
git add lib/notification-prefs.ts
git commit -m "feat(notifications): add daily budget warning preferences"
```

---

### Task 8: Wire scheduler hook for daily-budget warnings

**Files:**
- Modify: `hooks/use-notification-scheduler.ts`

- [ ] **Step 1: Add imports + helpers at top of file**

Add imports (keep existing imports):
```ts
import { effectiveDailyBudgetJpy, personalShareJpy, todayInJapan, todaySpentJpy } from "@/lib/budget";
import { notifyDailyBudget, ensureNotificationPermission } from "@/lib/notifications";
```

Below the existing `cashbackNotifiedKey` / `hasNotified` / `markNotified` helpers, add a parallel set for budget:

```ts
const BUDGET_NOTIFIED_PREFIX = "ryocho.notif.budget";

function budgetNotifiedKey(tripId: string, day: string, threshold: number): string {
  return `${BUDGET_NOTIFIED_PREFIX}.${tripId}.${day}.${threshold}`;
}

function hasBudgetNotified(tripId: string, day: string, threshold: number): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(budgetNotifiedKey(tripId, day, threshold)) === "1";
}

function markBudgetNotified(tripId: string, day: string, threshold: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(budgetNotifiedKey(tripId, day, threshold), "1");
}
```

- [ ] **Step 2: Identify current user id source**

Run: `grep -n "useApp\|user\|userId\|profile\b" hooks/use-notification-scheduler.ts`
Confirm where the current authenticated/guest user id is reachable. It should be available via `useApp()` (e.g., `user.id`). If not directly available, pull from `lib/context.tsx`:
```ts
const { currentTrip, user, profile, tripMembers } = useApp();
const currentUserId = user?.id ?? profile?.id ?? null;
```
Adjust to match the actual `AppContext` shape — check `lib/context.tsx` for the canonical field names.

- [ ] **Step 3: Add the daily-budget useEffect**

Below the existing cashback useEffect, add:

```ts
  // Daily personal budget threshold notification — fires foreground only,
  // cross-platform (native + web). Dedupes per trip + per day + per threshold.
  useEffect(() => {
    if (!currentTrip) return;
    if (!currentUserId) return;

    const prefs = loadPrefs();
    if (!prefs.dailyBudgetWarningEnabled) return;
    const threshold = prefs.dailyBudgetWarningThreshold;

    const member = tripMembers.find((m) => m.user_id === currentUserId);
    if (!member) return;
    const dailyBudget = effectiveDailyBudgetJpy(member, currentTrip);
    if (!dailyBudget) return;

    const day = todayInJapan();
    const spent = todaySpentJpy(expenses, currentUserId, day);
    const percent = (spent / dailyBudget) * 100;
    if (percent < threshold) return;
    if (hasBudgetNotified(currentTrip.id, day, threshold)) return;

    let cancelled = false;
    (async () => {
      const granted = await ensureNotificationPermission();
      if (cancelled || !granted) return;
      await notifyDailyBudget({
        tripName: currentTrip.name,
        spent,
        budget: dailyBudget,
        threshold,
      });
      markBudgetNotified(currentTrip.id, day, threshold);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentTrip, currentUserId, tripMembers, expenses]);
```

The list of dependencies in `useApp()` destructuring at the top of the hook must include `tripMembers` if it isn't already there.

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: PASS. If `tripMembers` isn't in `AppContext`, swap to `currentTrip.members` or whatever the project exposes — check `lib/context.tsx`.

- [ ] **Step 5: Commit**

```bash
git add hooks/use-notification-scheduler.ts
git commit -m "feat(notifications): trigger daily budget warning on expense changes"
```

---

## Phase 5 — API

### Task 9: PATCH endpoint for personal budgets

**Files:**
- Modify: `app/api/trip-members/route.ts`

- [ ] **Step 1: Append PATCH handler**

Append after the existing `DELETE` handler:

```ts
export async function PATCH(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const body = await req.json();
    const { trip_id, total_budget_jpy, daily_budget_jpy } = body as {
      trip_id?: string;
      total_budget_jpy?: number | null;
      daily_budget_jpy?: number | null;
    };

    if (!trip_id) {
      return NextResponse.json({ error: "缺少 trip_id" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: membership } = await admin
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", trip_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const updates: Record<string, number | null> = {};
    if (total_budget_jpy !== undefined) {
      if (total_budget_jpy !== null && (!Number.isFinite(total_budget_jpy) || total_budget_jpy < 0)) {
        return NextResponse.json({ error: "total_budget_jpy 必須為非負整數或 null" }, { status: 400 });
      }
      updates.total_budget_jpy = total_budget_jpy === null ? null : Math.floor(total_budget_jpy);
    }
    if (daily_budget_jpy !== undefined) {
      if (daily_budget_jpy !== null && (!Number.isFinite(daily_budget_jpy) || daily_budget_jpy < 0)) {
        return NextResponse.json({ error: "daily_budget_jpy 必須為非負整數或 null" }, { status: 400 });
      }
      updates.daily_budget_jpy = daily_budget_jpy === null ? null : Math.floor(daily_budget_jpy);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "沒有可更新的欄位" }, { status: 400 });
    }

    const { error } = await admin
      .from("trip_members")
      .update(updates)
      .eq("trip_id", trip_id)
      .eq("user_id", user.id);

    if (error) {
      console.error("trip-members PATCH error:", error.message);
      return NextResponse.json({ error: "更新個人預算失敗" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("trip-members PATCH error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Manual smoke test**

Start dev server (`npm run dev`). With a logged-in user in a trip with id `<TRIP_ID>`, run from DevTools console:
```js
await fetch("/api/trip-members", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ trip_id: "<TRIP_ID>", daily_budget_jpy: 10000 }),
}).then((r) => r.json());
```
Expected: `{ success: true }`. Verify in Supabase that the user's own `trip_members` row now has `daily_budget_jpy = 10000`.

- [ ] **Step 4: Commit**

```bash
git add app/api/trip-members/route.ts
git commit -m "feat(api): add PATCH /api/trip-members for personal budgets"
```

---

## Phase 6 — UI: Trip Settings Personal Budget

### Task 10: Personal budget form component

**Files:**
- Create: `components/trip/personal-budget-form.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  tripId: string;
  initialTotal: number | null;
  initialDaily: number | null;
  onSaved?: (next: { total: number | null; daily: number | null }) => void;
}

export function PersonalBudgetForm({ tripId, initialTotal, initialDaily, onSaved }: Props) {
  const [total, setTotal] = useState<string>(initialTotal == null ? "" : String(initialTotal));
  const [daily, setDaily] = useState<string>(initialDaily == null ? "" : String(initialDaily));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        trip_id: tripId,
        total_budget_jpy: total === "" ? null : Number(total),
        daily_budget_jpy: daily === "" ? null : Number(daily),
      };
      const res = await fetch("/api/trip-members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "儲存失敗");
        return;
      }
      toast.success("個人預算已更新");
      onSaved?.({ total: payload.total_budget_jpy, daily: payload.daily_budget_jpy });
    } catch {
      toast.error("儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          個人總預算 (¥) <span className="font-normal">(選填)</span>
        </Label>
        <Input
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          placeholder="例：70000"
          className="tabular-nums"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          個人每日預算 (¥) <span className="font-normal">(選填)</span>
        </Label>
        <Input
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={daily}
          onChange={(e) => setDaily(e.target.value)}
          placeholder="例：10000"
          className="tabular-nums"
        />
        <p className="text-[11px] text-muted-foreground">
          每日預算未填時，會自動取「個人總預算 ÷ 天數」。
        </p>
      </div>

      <Button type="button" className="w-full" disabled={saving} onClick={save}>
        {saving ? "儲存中…" : "儲存個人預算"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/trip/personal-budget-form.tsx
git commit -m "feat(ui): add personal budget form for trip members"
```

---

### Task 11: Mount the form in trip edit settings

**Files:**
- Modify: trip edit / settings page (locate in Step 1)

- [ ] **Step 1: Locate the trip settings page**

Run: `grep -rn "TripEditForm\|TripForm\b" app components | head -10`

Identify the page that renders trip edit (likely `app/(main)/trip/[id]/settings/page.tsx` or similar — confirm at this step). That page is the host.

- [ ] **Step 2: Mount `PersonalBudgetForm` below the existing TripForm**

Inside the host page, find the section rendering `<TripEditForm ... />` and add immediately after:

```tsx
{!isGuest && currentMember && (
  <div className="px-4 pt-2 pb-4 border-t mt-4 space-y-3">
    <h3 className="text-sm font-medium">個人預算（僅你看得到）</h3>
    <PersonalBudgetForm
      tripId={currentTrip.id}
      initialTotal={currentMember.total_budget_jpy}
      initialDaily={currentMember.daily_budget_jpy}
      onSaved={() => { /* trigger a refetch of trip members via existing context */ }}
    />
  </div>
)}
```

`currentMember` comes from `tripMembers.find(m => m.user_id === user.id)` — adjust to whatever field the page already exposes (it may have a `selfMember` ref already; reuse if present).

For guest mode (`isGuest === true`): show the same form but `onSaved` writes through `lib/guest-storage.ts` instead of the API. If guest-mode trip settings already use a different write path elsewhere, replicate that pattern; do not bypass the established guest write helpers.

- [ ] **Step 3: Type check + dev server smoke test**

Run: `npx tsc --noEmit`
Expected: PASS.

Then `npm run dev`, go to trip settings page as logged-in user, fill「個人每日預算」= 10000, save. Verify toast appears and a refresh keeps the value.

- [ ] **Step 4: Commit**

```bash
git add app components
git commit -m "feat(ui): mount personal budget form on trip settings page"
```

---

## Phase 7 — UI: Notification Settings Section

### Task 12: Add daily-budget section to notification settings

**Files:**
- Modify: `components/settings/notification-settings.tsx`

- [ ] **Step 1: Locate the existing cashback-warning section**

Run: `grep -n "cashbackWarning\|CashbackThreshold" components/settings/notification-settings.tsx`
Use that section as the structural template for the new daily-budget section (Switch + SegmentedControl).

- [ ] **Step 2: Add state for the new prefs**

Inside the existing prefs state setup, include reads/writes for `dailyBudgetWarningEnabled` and `dailyBudgetWarningThreshold`. Mirror the cashback pattern exactly.

- [ ] **Step 3: Add the section JSX**

Below the cashback warning section (before the closing wrapper), add:

```tsx
<section className="space-y-2">
  <div className="flex items-center justify-between">
    <div>
      <h4 className="text-sm font-medium">每日預算警示</h4>
      <p className="text-xs text-muted-foreground">
        今日個人花費達門檻時提醒
      </p>
    </div>
    <Switch
      checked={prefs.dailyBudgetWarningEnabled}
      onCheckedChange={(v) => updatePrefs({ dailyBudgetWarningEnabled: v })}
    />
  </div>

  {prefs.dailyBudgetWarningEnabled && (
    <>
      <div className="flex gap-1.5">
        {([80, 100] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => updatePrefs({ dailyBudgetWarningThreshold: value })}
            className={
              "flex-1 py-2 text-sm rounded-md ring-1 transition-colors " +
              (prefs.dailyBudgetWarningThreshold === value
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-background ring-border")
            }
          >
            {value}%
          </button>
        ))}
      </div>
      {!hasDailyBudgetForCurrentTrip && (
        <p className="text-[11px] text-muted-foreground">
          請先在旅程設定填寫個人每日或總預算
        </p>
      )}
      {hasOnlyTotalBudgetForCurrentTrip && (
        <p className="text-[11px] text-muted-foreground">
          目前使用 個人總 ÷ 天數 自動計算每日預算
        </p>
      )}
    </>
  )}
</section>
```

`hasDailyBudgetForCurrentTrip` and `hasOnlyTotalBudgetForCurrentTrip` are computed inside the component:
```ts
import { effectiveDailyBudgetJpy, isDailyBudgetDerived } from "@/lib/budget";

const currentMember = currentTrip
  ? tripMembers.find((m) => m.user_id === user?.id)
  : undefined;
const hasDailyBudgetForCurrentTrip = !!(
  currentTrip && currentMember && effectiveDailyBudgetJpy(currentMember, currentTrip)
);
const hasOnlyTotalBudgetForCurrentTrip = !!(
  currentTrip && currentMember && isDailyBudgetDerived(currentMember)
);
```

Adjust `tripMembers` / `user` access to whatever the file already uses (it may already destructure from `useApp()`).

- [ ] **Step 4: Type check + manual smoke test**

Run: `npx tsc --noEmit` (expect PASS).

In dev server: open settings page. Verify the new section appears below cashback warning. Toggle on, switch 80 / 100, see inline hints reflect the trip's actual budget state.

- [ ] **Step 5: Commit**

```bash
git add components/settings/notification-settings.tsx
git commit -m "feat(ui): add daily budget warning section to notification settings"
```

---

## Phase 8 — UI: Summary Page Daily Bar

### Task 13: Add personal daily progress bar to summary 自己 tab

**Files:**
- Modify: `app/(main)/summary/page.tsx`

- [ ] **Step 1: Identify the existing budget-progress JSX**

The trip-mode progress bar lives around the block that uses `tripTotalJpy / currentTrip.budget_jpy` (search for `budgetUsed` near line 188-216 in the current file). Find the JSX rendering it.

- [ ] **Step 2: Add imports**

```ts
import {
  effectiveDailyBudgetJpy,
  isDailyBudgetDerived,
  todayInJapan,
  todaySpentJpy,
} from "@/lib/budget";
```

- [ ] **Step 3: Compute personal totals in the existing stats useMemo**

Inside the existing `useMemo` that builds the summary view-model (around lines 73-216), add — guarded by `effectiveMode === "mine"`:

```ts
const currentUserIdForBudget = isGuest ? "guest" : (user?.id ?? null);
const selfMember =
  currentUserIdForBudget && currentTrip
    ? tripMembers.find((m) => m.user_id === currentUserIdForBudget)
    : null;

const personalTotalBudget = selfMember?.total_budget_jpy ?? null;
const personalTotalSpent = effectiveMode === "mine"
  ? sourceExpenses.reduce((s, e) => s + e.amount_jpy, 0)
  : 0;

const personalDailyBudget =
  selfMember && currentTrip ? effectiveDailyBudgetJpy(selfMember, currentTrip) : null;
const personalDailyDerived = selfMember ? isDailyBudgetDerived(selfMember) : false;
const today = todayInJapan();
const personalDailySpent =
  effectiveMode === "mine" && currentUserIdForBudget
    ? todaySpentJpy(expenses, currentUserIdForBudget, today)
    : 0;
```

Add to the returned object: `personalTotalBudget, personalTotalSpent, personalDailyBudget, personalDailyDerived, personalDailySpent`.

- [ ] **Step 4: Render the bars in the 自己 view**

In the `effectiveMode === "mine"` branch of the JSX (where the existing「我的總花費」card is), add two cards/rows after the totals:

```tsx
{stats.personalTotalBudget != null && (
  <div className="rounded-xl ring-1 ring-border bg-card p-3 space-y-1.5">
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>個人總預算</span>
      <span>
        ¥{stats.personalTotalSpent.toLocaleString()} / ¥{stats.personalTotalBudget.toLocaleString()}
      </span>
    </div>
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary"
        style={{ width: `${Math.min(100, (stats.personalTotalSpent / stats.personalTotalBudget) * 100)}%` }}
      />
    </div>
  </div>
)}

{stats.personalDailyBudget != null && (
  <div className="rounded-xl ring-1 ring-border bg-card p-3 space-y-1.5">
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>
        今日預算
        {stats.personalDailyDerived && <span className="ml-1">（自動）</span>}
      </span>
      <span>
        ¥{stats.personalDailySpent.toLocaleString()} / ¥{stats.personalDailyBudget.toLocaleString()}
      </span>
    </div>
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      {(() => {
        const pct = (stats.personalDailySpent / stats.personalDailyBudget) * 100;
        const tone =
          pct >= 100
            ? "bg-destructive"
            : pct >= 80
              ? "bg-amber-500"
              : "bg-primary";
        return (
          <div
            className={`h-full ${tone}`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        );
      })()}
    </div>
  </div>
)}
```

- [ ] **Step 5: Type check + manual smoke test**

Run: `npx tsc --noEmit` (expect PASS).

`npm run dev`. With a trip member having `daily_budget_jpy = 10000` and today's expenses totaling ¥9,000 personally, switch summary to 自己 → daily bar appears at 90%, amber tone. Set `daily_budget_jpy = null, total_budget_jpy = 70000`, 7-day trip → daily bar appears with「（自動）」label and budget reads 10000.

- [ ] **Step 6: Commit**

```bash
git add 'app/(main)/summary/page.tsx'
git commit -m "feat(ui): show personal total/daily budget bars on summary 自己 tab"
```

---

## Phase 9 — End-to-End Verification

### Task 14: Full notification flow verification

This is verification only — no code changes. If any check fails, file a fix as a follow-up commit.

- [ ] **Step 1: Web/PWA path — 80% threshold**

In a browser with no granted Notification permission yet:
1. Log in, ensure current trip has the current user with `daily_budget_jpy = 10000`
2. Settings page: enable 「每日預算警示」, threshold = 80%
3. Records page: add a personal expense for today: amount ¥8,000 JPY
4. Browser prompts for Notification permission → grant
5. A web notification fires with title「{tripName} 今日已用 80% 預算」

- [ ] **Step 2: Dedup**

Add another ¥500 expense for today. Verify **no** new notification (dedup key for 80%/today already set).

Check `localStorage`:
```js
Object.keys(localStorage).filter((k) => k.startsWith("ryocho.notif.budget"))
```
Expected: one key like `ryocho.notif.budget.<tripId>.<YYYY-MM-DD>.80` with value `"1"`.

- [ ] **Step 3: Per-day reset**

Manually delete that key, advance "today" by faking it via DevTools (or by waiting / adjusting system clock) — adding another expense crossing 80% on the new day fires again.

- [ ] **Step 4: 100% threshold**

Change preference to 100%. Delete the 80% key. Add expenses totaling ¥10,001 today. Verify notification fires with title「{tripName} 今日預算已超支」.

- [ ] **Step 5: Daily fallback from total**

Set `daily_budget_jpy = null, total_budget_jpy = 70000`, 7-day trip. Today's spending ¥8,001 → 80% notification fires (effective daily = 10000).

- [ ] **Step 6: Off-state**

Set both `daily_budget_jpy = null, total_budget_jpy = null`. Add ¥99,999 expense → no notification, no console error.

- [ ] **Step 7: iOS native build**

Build the Capacitor iOS app (`npx cap sync ios && open ios/App/App.xcworkspace` → run on device or simulator). Repeat Step 1 — verify notification appears in iOS notification tray with the same title/body.

- [ ] **Step 8: Multi-member isolation**

Two-member trip. Alice has `daily_budget_jpy = 10000`, Bob has `daily_budget_jpy = 5000`. Bob records ¥4,001 personal expense. Alice (different session) should NOT receive a notification.

- [ ] **Step 9: Commit verification notes (optional)**

If the verification surfaced fixes that needed committing, they're already in. No extra commit needed for the verification itself.

---

## Done Criteria

- All 14 tasks above are checked off.
- `npx tsc --noEmit` PASS.
- Phase 9 end-to-end checks all pass on both web and iOS native builds.
- Final commit log shows ~14 well-scoped commits, one per task.
