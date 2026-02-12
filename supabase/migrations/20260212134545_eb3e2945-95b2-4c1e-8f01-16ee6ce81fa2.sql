
-- Fix 1: residents SELECT - require authentication
DROP POLICY IF EXISTS "Residents readable by authenticated" ON public.residents;
CREATE POLICY "Residents readable by authenticated"
  ON public.residents FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix 2: profiles SELECT - require authentication
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix 3: visits SELECT - require authentication
DROP POLICY IF EXISTS "Visits readable by authenticated" ON public.visits;
CREATE POLICY "Visits readable by authenticated"
  ON public.visits FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix 4: resident_exits SELECT - require authentication
DROP POLICY IF EXISTS "Exits readable by authenticated" ON public.resident_exits;
CREATE POLICY "Exits readable by authenticated"
  ON public.resident_exits FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix 5: weekend_exits SELECT - require authentication
DROP POLICY IF EXISTS "Weekend exits readable by authenticated" ON public.weekend_exits;
CREATE POLICY "Weekend exits readable by authenticated"
  ON public.weekend_exits FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix 6: vehicle_trips SELECT - require authentication (same pattern)
DROP POLICY IF EXISTS "Trips readable by authenticated" ON public.vehicle_trips;
CREATE POLICY "Trips readable by authenticated"
  ON public.vehicle_trips FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix 7: vehicles SELECT - require authentication (same pattern)
DROP POLICY IF EXISTS "Vehicles readable by authenticated" ON public.vehicles;
CREATE POLICY "Vehicles readable by authenticated"
  ON public.vehicles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix 8: residents UPDATE - restore proper RBAC (admin + operador only)
DROP POLICY IF EXISTS "Residents updatable by authenticated" ON public.residents;
CREATE POLICY "Residents updatable by operators"
  ON public.residents FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));
