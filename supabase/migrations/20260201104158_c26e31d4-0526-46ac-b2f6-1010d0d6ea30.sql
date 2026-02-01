-- Create weekend_exits table for weekend family outings
CREATE TABLE public.weekend_exits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  data_saida DATE NOT NULL,
  hora_saida TIME NOT NULL,
  data_retorno_prevista DATE,
  hora_retorno_prevista TIME,
  hora_retorno_real TIME,
  acompanhante TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekend_exits ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users can view
CREATE POLICY "Weekend exits readable by authenticated"
ON public.weekend_exits
FOR SELECT
USING (true);

-- INSERT: all authenticated users can insert (including visualizadores)
CREATE POLICY "Weekend exits insertable by authenticated"
ON public.weekend_exits
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: only admin and operador
CREATE POLICY "Weekend exits updatable by operators"
ON public.weekend_exits
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

-- DELETE: only admin
CREATE POLICY "Weekend exits deletable by admin"
ON public.weekend_exits
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add infirmary visiting hours columns to institution_settings
ALTER TABLE public.institution_settings
ADD COLUMN IF NOT EXISTS horario_enfermaria_inicio TEXT DEFAULT '14:30',
ADD COLUMN IF NOT EXISTS horario_enfermaria_fim TEXT DEFAULT '16:00';