-- Tracks cashback threshold push notifications sent to users.
-- Used by the cashback-alert cron to avoid re-sending the same alert within 25 hours.
-- One row per (user, credit card, threshold). Cron inserts a row after each successful send.

create table public.cashback_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  credit_card_id uuid references public.credit_cards(id) on delete cascade not null,
  -- 80 = "approaching limit" alert, 100 = "limit reached" alert
  threshold_percent smallint not null check (threshold_percent in (80, 100)),
  sent_at timestamptz not null default now()
);

create index cashback_notifications_lookup_idx
  on public.cashback_notifications (user_id, credit_card_id, threshold_percent, sent_at desc);

alter table public.cashback_notifications enable row level security;

-- Only the service-role (admin) client writes to this table; deny all public access.
create policy "No public access" on public.cashback_notifications
  for all using (false);
