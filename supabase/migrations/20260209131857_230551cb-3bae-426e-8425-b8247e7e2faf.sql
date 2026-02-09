
-- Add column to track the actual return date (not just time)
ALTER TABLE public.resident_exits
ADD COLUMN data_retorno_real date;
