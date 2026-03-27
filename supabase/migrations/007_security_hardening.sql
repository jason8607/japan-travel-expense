-- #3: Restrict profiles visibility to same-trip members or self
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Users can view profiles of trip members" on public.profiles
  for select using (
    id = auth.uid()
    or id in (
      select tm.user_id from public.trip_members tm
      where tm.trip_id in (select public.my_trip_ids())
    )
  );

-- #1: Restrict self-add to trip_members — require invite token or owner action
-- Since the app uses admin client for joins, this RLS policy is a defense-in-depth measure
drop policy if exists "Users can add themselves" on public.trip_members;
create policy "Users can add themselves to trips they were invited to" on public.trip_members
  for insert with check (
    user_id = auth.uid()
    and trip_id in (select public.my_trip_ids())
  );

-- #2: Restrict find_user_by_email — only callable by service role (admin client)
-- The API route already uses admin client, so this removes direct client-side access
revoke execute on function public.find_user_by_email from authenticated;

-- #4: Add ocr_usage RLS policy — users can only read their own usage
create policy "Users can view own OCR usage" on public.ocr_usage
  for select using (user_id = auth.uid());

-- #5: Limit display_name length to prevent abuse
alter table public.profiles
  add constraint profiles_display_name_length check (length(display_name) <= 50);
