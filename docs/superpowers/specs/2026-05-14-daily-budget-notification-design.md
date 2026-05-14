# Daily Budget 80% Notification — Design Spec

**Date**: 2026-05-14
**Status**: Approved — ready for implementation plan
**Platforms**: iOS native (Capacitor), PWA (web push-installed), Web (browser)

## Goal

When a trip member's personal daily spending crosses 80% (or 100%) of their personal daily budget, fire an immediate notification on whichever platform they are currently using. The notification fires when they record the expense — no background server cron.

## Non-Goals

- Server-side push delivery (no Web Push subscription, no cron — A approach, see §6).
- Trip-wide or personal-total budget notifications (data fields exist but only daily layer is wired up in this round).
- Cross-validating that the three budget layers (trip / personal-total / personal-daily) add up — they are independent by design.

## 1. Data Model

### Migration `019_personal_budgets.sql`

```sql
ALTER TABLE trip_members
  ADD COLUMN total_budget_jpy integer,
  ADD COLUMN daily_budget_jpy integer;

COMMENT ON COLUMN trip_members.total_budget_jpy IS 'Personal total budget for this trip in JPY';
COMMENT ON COLUMN trip_members.daily_budget_jpy IS 'Personal per-day budget for this trip in JPY';
```

- Both columns nullable.
- No cross-validation between the three layers (`trips.budget_jpy`, `trip_members.total_budget_jpy`, `trip_members.daily_budget_jpy`). Each represents a different psychological anchor:
  - `trips.budget_jpy` — group-level cap / split reference
  - `trip_members.total_budget_jpy` — personal willingness-to-spend for the trip
  - `trip_members.daily_budget_jpy` — daily discipline unit
- **Fallback rule (daily only)**: if `daily_budget_jpy` is null but `total_budget_jpy` is set, the daily budget used by notifications and the summary daily bar is derived as `floor(total_budget_jpy / tripDays)` where `tripDays = daysBetween(start_date, end_date) + 1` (inclusive). No fallback from personal-total to trip-total — the group budget never substitutes for a personal budget.
- `daily_budget_jpy = null && total_budget_jpy = null` → daily notification and daily bar are off for that member.

### Effective daily budget helper

```ts
function effectiveDailyBudgetJpy(
  member: TripMember,
  trip: Trip,
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

function tripDays(trip: Trip): number {
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}
```

Single source of truth — used by both §4 trigger and §6.3 UI.

### Type updates

`types/index.ts` — `TripMember` interface:

```ts
interface TripMember {
  // ...existing
  total_budget_jpy: number | null;
  daily_budget_jpy: number | null;
}
```

### Guest mode

`lib/guest-storage.ts` — trip member structure mirrors the new fields with `null` defaults. Existing localStorage entries without the fields fall back to `null` via spread-default pattern (no migration script needed).

### RLS

Existing `trip_members` UPDATE policy must already allow `auth.uid() = user_id`. Verify during implementation; add if missing.

## 2. Today's Personal Spending Calculation

```ts
function todaySpentJpy(expenses: Expense[], userId: string, today: string): number {
  return expenses
    .filter(e => e.date === today)
    .reduce((sum, e) => sum + personalShareJpy(e, userId), 0);
}

function personalShareJpy(e: Expense, userId: string): number {
  if (e.split_type === "personal" && e.owner_id === userId) return e.amount_jpy;
  if (e.split_type === "split") {
    const splits = e.expense_splits ?? [];
    const total = splits.reduce((s, x) => s + x.shares, 0);
    const mine = splits.find(x => x.user_id === userId)?.shares ?? 0;
    return total > 0 ? (e.amount_jpy * mine) / total : 0;
  }
  return 0;
}
```

**"Today"**: computed in `Asia/Tokyo` (no `trips.timezone` column — this is a Japan-only app by product scope).

```ts
function todayInJapan(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());  // "YYYY-MM-DD"
}
```

## 3. Notification Preferences

`lib/notification-prefs.ts` extension:

```ts
export type BudgetThreshold = 80 | 100;

export interface NotificationPrefs {
  // existing
  dailyReminderEnabled: boolean;
  dailyReminderHour: number;
  cashbackWarningEnabled: boolean;
  cashbackWarningThreshold: CashbackThreshold;
  // new
  dailyBudgetWarningEnabled: boolean;
  dailyBudgetWarningThreshold: BudgetThreshold;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  // ...existing
  dailyBudgetWarningEnabled: false,
  dailyBudgetWarningThreshold: 80,
};
```

`loadPrefs()` adds clamping: `dailyBudgetWarningThreshold: parsed.dailyBudgetWarningThreshold === 100 ? 100 : 80`. Reuses existing localStorage key `ryocho.notification-prefs.v1`; old entries merge with new defaults via spread.

## 4. Trigger and Dedup

### Trigger location

`hooks/use-notification-scheduler.ts` — same hook that handles `dailyReminder` and `cashbackWarning`. Add a third `useEffect` watching `[currentTrip, expenses, currentUserId]`. Drop the file-level `if (!isNativeApp()) return;` in favor of per-notifier platform dispatch (§5).

### Dedup keys

```
ryocho.notif.budget.{tripId}.{YYYY-MM-DD}.{threshold}
```

- Per-day reset (date in key).
- 80 and 100 are independent keys — crossing 100% does not unfire a missed 80%; crossing 80% does not pre-fire 100%. User's chosen threshold is the only one that ever fires.

### Check logic

```ts
const member = currentTrip.members.find(m => m.user_id === currentUserId);
if (!member) return;
const dailyBudget = effectiveDailyBudgetJpy(member, currentTrip);
if (!dailyBudget) return;  // both daily and total are unset

const prefs = loadPrefs();
if (!prefs.dailyBudgetWarningEnabled) return;
const threshold = prefs.dailyBudgetWarningThreshold;

const today = todayInJapan();
const spent = todaySpentJpy(expenses, currentUserId, today);
const percent = (spent / dailyBudget) * 100;
if (percent < threshold) return;
if (hasNotified(currentTrip.id, today, threshold)) return;

await notifyDailyBudget({
  tripName: currentTrip.name,
  spent,
  budget: dailyBudget,
  threshold,
});
markNotified(currentTrip.id, today, threshold);
```

## 5. Platform Dispatch

### New `lib/notifications-web.ts`

```ts
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

### `lib/notifications.ts` additions

```ts
// NOTIFICATION_IDS gains:
dailyBudget: 3000,

export async function notifyDailyBudget(params: {
  tripName: string;
  spent: number;     // JPY
  budget: number;    // JPY
  threshold: 80 | 100;
}): Promise<void> {
  const { tripName, spent, budget, threshold } = params;
  const percent = Math.round((spent / budget) * 100);
  const title = threshold === 100
    ? `${tripName} 今日預算已超支`
    : `${tripName} 今日已用 ${percent}% 預算`;
  const body = `今日花費 ¥${spent.toLocaleString()} / ¥${budget.toLocaleString()}，` +
               (threshold === 100 ? "已超出預算。" : "接近上限了。");

  if (isNativeApp()) {
    await LocalNotifications.schedule({
      notifications: [{ id: NOTIFICATION_IDS.dailyBudget, title, body }],
    });
  } else {
    showWebNotification(title, body, `daily-budget-${threshold}`);
  }
}
```

### Permission flow refactor

`useNotificationScheduler` currently early-returns on `!isNativeApp()`. Refactor:

- Each notifier (`dailyReminder`, `cashbackWarning`, `dailyBudget`) handles its own permission check.
- Helper `ensureNotificationPermission()` in `lib/notifications.ts` that internally branches: native → `ensurePermission()`, web → `ensureWebPermission()`.
- This unblocks cashback warnings on web/PWA as a side benefit, but that migration is out of scope for this spec; the cashback `useEffect` keeps its native-only guard for now, only `dailyBudget` is cross-platform.

## 6. UI Integration

### 6.1 Trip form — budget input

`components/trip/trip-form.tsx` (or wherever trip create/edit lives) adds two optional fields visible only to the current authenticated/guest user (writes go to their own `trip_members` row):

- 「個人總預算（JPY，選填）」
- 「個人每日預算（JPY，選填）」

Each member sees and edits only their own. Trip-wide `budget_jpy` stays at the trip level (unchanged).

### 6.2 Notification settings

`components/settings/notification-settings.tsx` gains a new section **「每日預算警示」** below the existing cashback section:

- Switch: enable / disable
- Threshold SegmentedControl: `80%` / `100%` (same component used for cashback)
- When `effectiveDailyBudgetJpy()` returns null (both `daily_budget_jpy` and `total_budget_jpy` unset for current member) → show inline hint: 「請先在旅程設定填寫個人每日或總預算」 with link to trip settings
- When `daily_budget_jpy` is null but `total_budget_jpy` is set → show smaller hint: 「目前使用 個人總 ÷ 天數 自動計算每日預算」 (informational, not blocking)

### 6.3 Summary page — `自己` tab

`/summary` already separates 「旅程 / 自己」 views. Within the 自己 tab:

- Top progress bar: `trip_members.total_budget_jpy` vs my-trip-cumulative personal burden (only if `total_budget_jpy` is non-null)
- Below it: `effectiveDailyBudgetJpy()` vs today's personal burden (shown if either `daily_budget_jpy` or `total_budget_jpy` is set; falls back to `total ÷ days` when daily is unset). When using the fallback, the bar's label shows 「每日預算 ¥X,XXX（自動）」 to disambiguate from a user-set value.

Color rule for the daily bar only (matches notification thresholds):
- < 80%: neutral blue (existing token)
- ≥ 80%, < 100%: amber tonal ramp
- ≥ 100%: destructive tonal ramp

Total bar stays neutral blue regardless of fill (no traffic-light differentiation, per [feedback_cta_keep_primary]-style minimalism).

旅程 tab is **not** touched — keeps the existing `trips.budget_jpy` progress bar.

### 6.4 API route

`app/api/trips/[tripId]/members/[memberId]/route.ts` — `PATCH` supports `total_budget_jpy` and `daily_budget_jpy`. Authorization: only allow if `member.user_id === requestUser.id`. Validation: integer ≥ 0 or null.

If the route does not exist yet, create it. Follow existing pattern: `getRequestUser()` + `getAdminClient()` + `{ data } | { error }` response shape.

## 7. Testing

Manual verification checklist (no automated tests exist in the codebase for this surface area):

- Set `daily_budget_jpy = 10000`, threshold = 80%, record expenses totaling ¥7,999 → no notification. Record ¥1 more → notification fires.
- Record another expense same day → no second notification (dedup).
- Advance system clock to next day (or wait) → record expense crossing 80% → notification fires again (new day key).
- Threshold = 100%: ¥9,999 → no fire; ¥10,001 → fire.
- iOS native (TestFlight / dev build): notification shows in notification tray.
- PWA installed: notification shows via browser Notification API.
- Browser (no install): `Notification.requestPermission()` triggers on first save; subsequent fires use granted permission.
- Permission denied → silent no-op, no error toast.
- `daily_budget_jpy = null && total_budget_jpy = null` → no notification ever, no console errors.
- `daily_budget_jpy = null && total_budget_jpy = 70000`, 7-day trip → effective daily = 10000; crossing 8000 fires 80% notification.
- `daily_budget_jpy = 15000 && total_budget_jpy = 70000` → daily wins, total is ignored for notification logic.
- Multi-member trip: each member's spending tracked independently — Bob's expenses do not trigger Alice's notification.

## 8. Open Questions / Risks

- **Web Notification on iOS Safari**: Safari only fires web Notifications for PWAs installed to home screen. Plain Safari tab on iOS will silently fail `ensureWebPermission()`. Acceptable degradation — Capacitor native build covers iOS users who installed the app.
- **`expense_splits` shape**: Spec assumes `expense_splits: { user_id, shares }[]`. Verify during implementation; adjust `personalShareJpy()` if the actual structure differs (e.g., `amount` instead of `shares`).
- **`currentUserId` source**: For guest mode this is the synthetic guest id from `lib/context.tsx`. Confirm `trip_members` in guest storage carries a matching `user_id` field, otherwise the filter never matches.

## 9. Out of Scope

- Server-side web push for offline notification delivery (rejected as approach B in brainstorming).
- Notifications for trip-wide or personal-total budget crossing.
- Migrating cashback warning to web/PWA (cleanup follow-up, separate ticket).
- Localization beyond `zh-TW`.
- Notification sound / vibration customization.
