
-- Allow all authenticated users to read persons (so visualizador can see visitor names/CPFs in history)
DROP POLICY IF EXISTS "Persons readable by operators" ON public.persons;

CREATE POLICY "Persons readable by authenticated"
ON public.persons
FOR SELECT
USING (auth.uid() IS NOT NULL);
