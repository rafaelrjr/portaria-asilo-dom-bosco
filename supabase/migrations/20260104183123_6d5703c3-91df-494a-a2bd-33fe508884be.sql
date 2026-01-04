-- Enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'operador', 'visualizador');

-- Tabela de roles de usuários (separada para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função de segurança para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  email TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tabela de idosos (residents)
CREATE TABLE public.residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  quarto TEXT NOT NULL,
  foto TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  autorizado_saida_temporaria BOOLEAN DEFAULT false,
  dias_saida_permitidos TEXT[],
  horario_saida_permitido TEXT,
  horario_retorno_permitido TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;

-- Tabela de visitantes (persons)
CREATE TABLE public.persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  rg TEXT,
  telefone TEXT,
  tipo TEXT CHECK (tipo IN ('familiar', 'prestador', 'acao_social', 'visita_geral', 'voluntario', 'diretoria', 'outro')),
  parentesco TEXT,
  idoso_vinculado UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  observacoes TEXT,
  foto TEXT,
  horario_especial BOOLEAN DEFAULT false,
  horario_especial_inicio TEXT,
  horario_especial_fim TEXT,
  dias_permitidos TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;

-- Tabela de visitas
CREATE TABLE public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID REFERENCES public.persons(id) ON DELETE CASCADE NOT NULL,
  proposito TEXT CHECK (proposito IN ('idoso_especifico', 'acao_social', 'visita_geral', 'reuniao', 'prestacao_servico')),
  idoso_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  descricao_acao_social TEXT,
  pessoa_departamento TEXT,
  data_entrada DATE NOT NULL,
  hora_entrada TIME NOT NULL,
  hora_saida TIME,
  etiqueta_emitida BOOLEAN DEFAULT false,
  etiqueta_devolvida BOOLEAN DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Tabela de veículos
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  ano TEXT,
  placa TEXT UNIQUE NOT NULL,
  cor TEXT,
  km_inicial INTEGER DEFAULT 0,
  km_atual INTEGER,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Tabela de viagens de veículos
CREATE TABLE public.vehicle_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  veiculo TEXT NOT NULL,
  placa TEXT NOT NULL,
  motorista TEXT NOT NULL,
  data_saida DATE NOT NULL,
  hora_saida TIME NOT NULL,
  km_saida INTEGER NOT NULL,
  hora_chegada TIME,
  km_chegada INTEGER,
  destino TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.vehicle_trips ENABLE ROW LEVEL SECURITY;

-- Tabela de saídas temporárias de idosos
CREATE TABLE public.resident_exits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE NOT NULL,
  data_saida DATE NOT NULL,
  hora_saida TIME NOT NULL,
  hora_retorno_prevista TIME NOT NULL,
  hora_retorno_real TIME,
  motivo_saida TEXT NOT NULL,
  acompanhante TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.resident_exits ENABLE ROW LEVEL SECURITY;

-- Tabela de configurações da instituição
CREATE TABLE public.institution_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  nome TEXT,
  endereco TEXT,
  telefone TEXT,
  cnpj TEXT,
  email TEXT,
  logo TEXT,
  horario_visita_inicio TEXT DEFAULT '08:00',
  horario_visita_fim TEXT DEFAULT '17:00',
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies para user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para profiles
CREATE POLICY "Profiles viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para residents (todos autenticados podem ler, apenas admin/operador podem escrever)
CREATE POLICY "Residents readable by authenticated" ON public.residents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Residents editable by operators" ON public.residents
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  );

CREATE POLICY "Residents updatable by operators" ON public.residents
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  );

CREATE POLICY "Residents deletable by admin" ON public.residents
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para persons
CREATE POLICY "Persons readable by authenticated" ON public.persons
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Persons editable by operators" ON public.persons
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  );

CREATE POLICY "Persons updatable by operators" ON public.persons
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  );

CREATE POLICY "Persons deletable by admin" ON public.persons
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para visits
CREATE POLICY "Visits readable by authenticated" ON public.visits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Visits editable by operators" ON public.visits
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  );

CREATE POLICY "Visits updatable by operators" ON public.visits
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  );

CREATE POLICY "Visits deletable by admin" ON public.visits
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para vehicles
CREATE POLICY "Vehicles readable by authenticated" ON public.vehicles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Vehicles manageable by operators" ON public.vehicles
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  );

-- RLS Policies para vehicle_trips
CREATE POLICY "Trips readable by authenticated" ON public.vehicle_trips
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Trips editable by operators" ON public.vehicle_trips
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  );

CREATE POLICY "Trips updatable by operators" ON public.vehicle_trips
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  );

CREATE POLICY "Trips deletable by admin" ON public.vehicle_trips
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para resident_exits
CREATE POLICY "Exits readable by authenticated" ON public.resident_exits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Exits editable by operators" ON public.resident_exits
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  );

CREATE POLICY "Exits updatable by operators" ON public.resident_exits
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  );

CREATE POLICY "Exits deletable by admin" ON public.resident_exits
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para institution_settings
CREATE POLICY "Settings readable by authenticated" ON public.institution_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Settings manageable by admin" ON public.institution_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_persons_updated_at
  BEFORE UPDATE ON public.persons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.institution_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();