-- Drop trip_schedule table
-- The /trip/[id]/schedule page was never wired up to any UI entry point,
-- and the expense form does not auto-fill location from this table.
-- Removing the dead route and its table to reduce surface area.

drop policy if exists "Members can view schedule" on public.trip_schedule;
drop policy if exists "Owner can manage schedule" on public.trip_schedule;

drop table if exists public.trip_schedule;
