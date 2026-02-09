-- Fix: persons INSERT and UPDATE policies are RESTRICTIVE with no PERMISSIVE policies
-- PostgreSQL denies access when only RESTRICTIVE policies exist (no PERMISSIVE baseline)
-- Recreate them as PERMISSIVE so operators/admins can actually write

-- Drop restrictive INSERT policy
DROP POLICY IF EXISTS "Persons editable by operators" ON public.persons;

-- Create PERMISSIVE INSERT policy
CREATE POLICY "Persons insertable by operators"
ON public.persons
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role)
);

-- Drop restrictive UPDATE policy
DROP POLICY IF EXISTS "Persons updatable by operators" ON public.persons;

-- Create PERMISSIVE UPDATE policy
CREATE POLICY "Persons updatable by operators"
ON public.persons
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role)
);

-- Also fix DELETE policy (same issue)
DROP POLICY IF EXISTS "Persons deletable by admin" ON public.persons;

CREATE POLICY "Persons deletable by admin"
ON public.persons
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix SELECT policy too if it's still restrictive
DROP POLICY IF EXISTS "Persons readable by authenticated" ON public.persons;

CREATE POLICY "Persons readable by authenticated"
ON public.persons
FOR SELECT
USING (auth.uid() IS NOT NULL);
