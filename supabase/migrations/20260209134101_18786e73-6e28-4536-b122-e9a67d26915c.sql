
-- First drop ALL existing policies on persons table to start clean
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'persons' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.persons', pol.policyname);
  END LOOP;
END $$;

-- Recreate all policies as PERMISSIVE
CREATE POLICY "Persons readable by authenticated"
ON public.persons
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Persons insertable by operators"
ON public.persons
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role)
);

CREATE POLICY "Persons updatable by operators"
ON public.persons
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role)
);

CREATE POLICY "Persons deletable by admin"
ON public.persons
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
