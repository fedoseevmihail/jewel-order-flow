
-- Add new columns to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS work_type text NOT NULL DEFAULT 'growth',
  ADD COLUMN IF NOT EXISTS gallery_folder text,
  ADD COLUMN IF NOT EXISTS tariff text;
