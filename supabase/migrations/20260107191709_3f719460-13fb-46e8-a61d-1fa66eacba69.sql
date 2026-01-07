-- Criar tabela de logs de auditoria
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informações do usuário
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  
  -- Informações da ação
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  
  -- Dados alterados
  old_data JSONB,
  new_data JSONB,
  
  -- Metadados
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas eficientes
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_record ON public.audit_logs(record_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Habilitar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem visualizar os logs
CREATE POLICY "Audit logs viewable by admin"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Usuários autenticados podem inserir logs (para registrar suas próprias ações)
CREATE POLICY "Audit logs insertable by authenticated"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);