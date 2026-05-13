-- Web Push subscriptions. One row per (user, endpoint) pair. Endpoint is unique
-- per browser install, so a user may have multiple rows (phone Safari, desktop Chrome).
-- Used by the daily reminder cron and by ad-hoc server-triggered notifications.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  -- Local hour (0-23) the user wants the daily reminder. Cron picks rows where this matches the current local hour.
  daily_reminder_hour smallint,
  -- IANA tz so the cron can resolve "local hour" without storing offset directly.
  timezone text not null default 'Asia/Tokyo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index push_subscriptions_user_endpoint_idx
  on public.push_subscriptions (user_id, endpoint);

create index push_subscriptions_daily_hour_idx
  on public.push_subscriptions (daily_reminder_hour)
  where daily_reminder_hour is not null;

alter table public.push_subscriptions enable row level security;

create policy "Users can view own subscriptions" on public.push_subscriptions
  for select using (user_id = auth.uid());

create policy "Users can insert own subscriptions" on public.push_subscriptions
  for insert with check (user_id = auth.uid());

create policy "Users can update own subscriptions" on public.push_subscriptions
  for update using (user_id = auth.uid());

create policy "Users can delete own subscriptions" on public.push_subscriptions
  for delete using (user_id = auth.uid());
