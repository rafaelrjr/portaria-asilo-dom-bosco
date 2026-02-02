-- Allow all authenticated users to INSERT residents (enable viewers to register)
DROP POLICY IF EXISTS "Residents editable by operators" ON residents;

CREATE POLICY "Residents insertable by authenticated"
ON residents FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);