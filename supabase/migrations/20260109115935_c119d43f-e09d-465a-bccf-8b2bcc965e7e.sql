-- Add CPF and birth date to residents table
ALTER TABLE public.residents 
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS data_nascimento date;