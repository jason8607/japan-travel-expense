-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null default '',
  avatar_url text,
  avatar_emoji text not null default '🧑',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_emoji)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', '旅人'),
    coalesce(new.raw_user_meta_data->>'avatar_emoji', '🧑')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trips
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  currency text not null default 'JPY',
  cash_budget numeric,
  notion_database_id text,
  notion_token text,
  created_by uuid references public.profiles(id) not null,
  created_at timestamptz not null default now()
);

alter table public.trips enable row level security;

-- Trip Members
create table public.trip_members (
  trip_id uuid references public.trips(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  primary key (trip_id, user_id)
);

alter table public.trip_members enable row level security;

create policy "Members can view their trips" on public.trips
  for select using (
    created_by = auth.uid()
    or id in (select trip_id from public.trip_members where user_id = auth.uid())
  );
create policy "Owner can update trip" on public.trips
  for update using (created_by = auth.uid());
create policy "Authenticated users can create trips" on public.trips
  for insert with check (auth.uid() = created_by);
create policy "Owner can delete trip" on public.trips
  for delete using (created_by = auth.uid());

create policy "Members can view trip members" on public.trip_members
  for select using (
    trip_id in (select trip_id from public.trip_members where user_id = auth.uid())
  );
create policy "Owner can manage members" on public.trip_members
  for all using (
    trip_id in (select id from public.trips where created_by = auth.uid())
  );
create policy "Users can add themselves" on public.trip_members
  for insert with check (user_id = auth.uid());

-- Trip Schedule
create table public.trip_schedule (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade not null,
  date date not null,
  location text not null,
  region text not null default ''
);

alter table public.trip_schedule enable row level security;
create policy "Members can view schedule" on public.trip_schedule
  for select using (
    trip_id in (select trip_id from public.trip_members where user_id = auth.uid())
  );
create policy "Owner can manage schedule" on public.trip_schedule
  for all using (
    trip_id in (select id from public.trips where created_by = auth.uid())
  );

-- Expenses
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade not null,
  paid_by uuid references public.profiles(id) not null,
  title text not null,
  title_ja text,
  amount_jpy numeric not null default 0,
  amount_twd numeric not null default 0,
  exchange_rate numeric not null default 0.206,
  category text not null default '其他',
  payment_method text not null default '現金',
  location text,
  store_name text,
  store_name_ja text,
  expense_date date not null default current_date,
  receipt_image_url text,
  notion_page_id text,
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;
create policy "Members can view expenses" on public.expenses
  for select using (
    trip_id in (select trip_id from public.trip_members where user_id = auth.uid())
  );
create policy "Members can create expenses" on public.expenses
  for insert with check (
    trip_id in (select trip_id from public.trip_members where user_id = auth.uid())
  );
create policy "Creator can update expense" on public.expenses
  for update using (paid_by = auth.uid());
create policy "Creator can delete expense" on public.expenses
  for delete using (paid_by = auth.uid());

create index idx_expenses_trip_date on public.expenses(trip_id, expense_date desc);
create index idx_expenses_trip_category on public.expenses(trip_id, category);

-- Expense Items (receipt line items)
create table public.expense_items (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references public.expenses(id) on delete cascade not null,
  name text not null,
  name_ja text,
  quantity integer not null default 1,
  unit_price numeric not null default 0,
  tax_rate numeric not null default 0.1,
  tax_type text
);

alter table public.expense_items enable row level security;
create policy "Members can view items" on public.expense_items
  for select using (
    expense_id in (
      select id from public.expenses where trip_id in (
        select trip_id from public.trip_members where user_id = auth.uid()
      )
    )
  );
create policy "Members can manage items" on public.expense_items
  for all using (
    expense_id in (
      select id from public.expenses where paid_by = auth.uid()
    )
  );

-- Enable Realtime
alter publication supabase_realtime add table public.expenses;
