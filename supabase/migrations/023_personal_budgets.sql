-- 023_personal_budgets.sql
-- Adds optional personal budget fields to trip_members for daily budget notifications.

ALTER TABLE trip_members
  ADD COLUMN IF NOT EXISTS total_budget_jpy integer,
  ADD COLUMN IF NOT EXISTS daily_budget_jpy integer;

COMMENT ON COLUMN trip_members.total_budget_jpy IS 'Personal total budget for this trip in JPY';
COMMENT ON COLUMN trip_members.daily_budget_jpy IS 'Personal per-day budget for this trip in JPY';

-- Existing trip_members RLS policies cover update by self (auth.uid() = user_id).
-- If the project's current policy does NOT, add it:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trip_members'
      AND policyname = 'trip_members_update_self'
  ) THEN
    CREATE POLICY trip_members_update_self ON trip_members
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
