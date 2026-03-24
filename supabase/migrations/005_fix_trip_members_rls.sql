-- Helper function to get current user's trip IDs without triggering RLS
create or replace function public.my_trip_ids()
returns setof uuid as $$
  select trip_id from public.trip_members where user_id = auth.uid()
$$ language sql security definer stable;

-- Drop old policies that cause infinite recursion
drop policy if exists "Members can view trip members" on public.trip_members;
drop policy if exists "Owner can manage members" on public.trip_members;
drop policy if exists "Users can add themselves" on public.trip_members;

-- Recreated policies using the helper function (no self-reference)
create policy "Members can view trip members" on public.trip_members
  for select using (trip_id in (select public.my_trip_ids()));

create policy "Owner can manage members" on public.trip_members
  for all using (
    trip_id in (select id from public.trips where created_by = auth.uid())
  );

create policy "Users can add themselves" on public.trip_members
  for insert with check (user_id = auth.uid());

-- Also fix trips select policy (it references trip_members too)
drop policy if exists "Members can view their trips" on public.trips;
create policy "Members can view their trips" on public.trips
  for select using (
    created_by = auth.uid()
    or id in (select public.my_trip_ids())
  );
