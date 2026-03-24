-- Add split_type to expenses: 'personal' (只記自己) or 'split' (均分)
alter table public.expenses
  add column split_type text not null default 'personal'
  check (split_type in ('personal', 'split'));
