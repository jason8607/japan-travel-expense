-- Custom categories (per-user)
create table public.custom_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  value text not null,
  label text not null,
  icon text not null default '📦',
  color text not null default '#6B7280',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.custom_categories enable row level security;

create policy "Users can view own categories" on public.custom_categories
  for select using (user_id = auth.uid());
create policy "Users can insert own categories" on public.custom_categories
  for insert with check (user_id = auth.uid());
create policy "Users can update own categories" on public.custom_categories
  for update using (user_id = auth.uid());
create policy "Users can delete own categories" on public.custom_categories
  for delete using (user_id = auth.uid());

create unique index idx_custom_categories_user_value on public.custom_categories(user_id, value);
create index idx_custom_categories_user on public.custom_categories(user_id, sort_order);
