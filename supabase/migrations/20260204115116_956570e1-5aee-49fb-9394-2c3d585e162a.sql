-- Fix: Restrict SELECT access on persons table to only admin and operador roles
-- This protects sensitive PII (CPF, RG, phone numbers, photos) from unauthorized access

-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Persons readable by authenticated" ON public.persons;

-- Create new restricted SELECT policy - only admin and operador can read person data
CREATE POLICY "Persons readable by operators"
ON public.persons
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));