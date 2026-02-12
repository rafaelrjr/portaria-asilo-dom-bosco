
CREATE TABLE public.restricted_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text,
  data_nascimento date,
  resident_id uuid REFERENCES public.residents(id),
  motivo text NOT NULL,
  ativo boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.restricted_persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restricted readable by authenticated"
  ON public.restricted_persons FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Restricted insertable by admin and viewer"
  ON public.restricted_persons FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'visualizador')
  );

CREATE POLICY "Restricted updatable by admin and viewer"
  ON public.restricted_persons FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'visualizador')
  );

CREATE POLICY "Restricted deletable by admin"
  ON public.restricted_persons FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_restricted_persons_updated_at
  BEFORE UPDATE ON public.restricted_persons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
