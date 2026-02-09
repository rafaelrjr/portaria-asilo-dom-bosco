-- Fix: institution_settings needs a PERMISSIVE SELECT policy for public access (login page)
-- Currently both policies are restrictive, which blocks all access when no permissive policy exists

-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Settings readable by authenticated" ON public.institution_settings;

-- Create a PERMISSIVE policy allowing anyone to read settings (needed for login page logo)
CREATE POLICY "Settings readable by anyone"
ON public.institution_settings
FOR SELECT
USING (true);
