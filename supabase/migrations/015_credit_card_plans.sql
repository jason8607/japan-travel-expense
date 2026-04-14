-- Credit card plans (multiple cashback schemes per card, shared limit)
create table public.credit_card_plans (
  id uuid primary key default gen_random_uuid(),
  credit_card_id uuid references public.credit_cards(id) on delete cascade not null,
  name text not null,
  cashback_rate numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.credit_card_plans enable row level security;

create policy "Users can view own card plans" on public.credit_card_plans
  for select using (
    credit_card_id in (select id from public.credit_cards where user_id = auth.uid())
  );
create policy "Users can insert own card plans" on public.credit_card_plans
  for insert with check (
    credit_card_id in (select id from public.credit_cards where user_id = auth.uid())
  );
create policy "Users can update own card plans" on public.credit_card_plans
  for update using (
    credit_card_id in (select id from public.credit_cards where user_id = auth.uid())
  );
create policy "Users can delete own card plans" on public.credit_card_plans
  for delete using (
    credit_card_id in (select id from public.credit_cards where user_id = auth.uid())
  );

create index idx_credit_card_plans_card on public.credit_card_plans(credit_card_id);

-- Add plan reference to expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS credit_card_plan_id uuid references public.credit_card_plans(id) on delete set null;
