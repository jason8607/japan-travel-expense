-- Expense participants (subset split): when an expense is split among only some
-- of the trip members rather than the whole trip. Empty participants for a
-- split expense is interpreted by the app as "all members" (legacy fallback).
create table public.expense_participants (
  expense_id uuid references public.expenses(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  primary key (expense_id, user_id)
);

alter table public.expense_participants enable row level security;

-- Members of the parent expense's trip can view participants
create policy "Members can view participants" on public.expense_participants
  for select using (
    expense_id in (
      select id from public.expenses where trip_id in (select public.my_trip_ids())
    )
  );

-- Only the expense creator (paid_by) can manage participants
create policy "Creator can insert participants" on public.expense_participants
  for insert with check (
    expense_id in (
      select id from public.expenses where paid_by = auth.uid()
    )
  );

create policy "Creator can update participants" on public.expense_participants
  for update using (
    expense_id in (
      select id from public.expenses where paid_by = auth.uid()
    )
  );

create policy "Creator can delete participants" on public.expense_participants
  for delete using (
    expense_id in (
      select id from public.expenses where paid_by = auth.uid()
    )
  );

create index idx_expense_participants_expense on public.expense_participants(expense_id);
create index idx_expense_participants_user on public.expense_participants(user_id);

-- Realtime
alter publication supabase_realtime add table public.expense_participants;
