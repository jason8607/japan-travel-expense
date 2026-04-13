-- Credit cards (per-user setting)
create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  cashback_rate numeric not null default 0,
  cashback_limit numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.credit_cards enable row level security;

create policy "Users can view own cards" on public.credit_cards
  for select using (user_id = auth.uid());
create policy "Users can insert own cards" on public.credit_cards
  for insert with check (user_id = auth.uid());
create policy "Users can update own cards" on public.credit_cards
  for update using (user_id = auth.uid());
create policy "Users can delete own cards" on public.credit_cards
  for delete using (user_id = auth.uid());

create index idx_credit_cards_user on public.credit_cards(user_id);

-- Add credit_card_id to expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS credit_card_id uuid references public.credit_cards(id) on delete set null;
