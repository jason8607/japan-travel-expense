-- Remove Notion integration columns (feature removed)
ALTER TABLE public.trips DROP COLUMN IF EXISTS notion_database_id;
ALTER TABLE public.trips DROP COLUMN IF EXISTS notion_token;
ALTER TABLE public.expenses DROP COLUMN IF EXISTS notion_page_id;
