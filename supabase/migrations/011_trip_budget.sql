-- Total trip budget (all payment methods)
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS budget_jpy numeric DEFAULT NULL;
