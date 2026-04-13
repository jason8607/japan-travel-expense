alter table public.expenses
  add column if not exists input_currency text not null default 'JPY';
