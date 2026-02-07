-- Allow all authenticated users (including visualizador) to update residents
DROP POLICY IF EXISTS "Residents updatable by operators" ON public.residents;
CREATE POLICY "Residents updatable by authenticated" ON public.residents
FOR UPDATE USING (auth.uid() IS NOT NULL);