-- RPC function to find a user by email (searches auth.users)
-- security definer: runs with the privileges of the function creator (bypasses RLS)
create or replace function public.find_user_by_email(target_email text)
returns table (id uuid) as $$
begin
  return query
    select au.id
    from auth.users au
    where au.email = lower(target_email);
end;
$$ language plpgsql security definer;

-- Only authenticated users can call this function
revoke execute on function public.find_user_by_email from anon;
grant execute on function public.find_user_by_email to authenticated;
