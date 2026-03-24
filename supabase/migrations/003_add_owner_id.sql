-- Add owner_id to expenses: who this expense belongs to (null = same as paid_by)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id);
