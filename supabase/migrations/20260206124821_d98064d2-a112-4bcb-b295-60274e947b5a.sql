-- Drop the old check constraint and recreate with all valid proposito values
ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS visits_proposito_check;

ALTER TABLE public.visits ADD CONSTRAINT visits_proposito_check CHECK (
  proposito IN (
    'idoso_especifico',
    'acao_social',
    'visita_geral',
    'reuniao',
    'prestacao_servico',
    'visita_religiosa',
    'psc',
    'voluntariado'
  )
);