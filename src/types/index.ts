export type VisitorType = 'familiar' | 'prestador' | 'visita_geral' | 'voluntario' | 'diretoria' | 'psc' | 'acao_social' | 'visita_religiosa' | 'voluntariado' | 'outro';

export type VisitPurpose = 'idoso_especifico' | 'acao_social' | 'visita_geral' | 'reuniao' | 'prestacao_servico' | 'visita_religiosa' | 'psc' | 'voluntariado';

export type UserRole = 'admin' | 'operador' | 'visualizador';

export type DayOfWeek = 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab';

export const DAYS_OF_WEEK: { value: DayOfWeek; label: string }[] = [
  { value: 'dom', label: 'Domingo' },
  { value: 'seg', label: 'Segunda' },
  { value: 'ter', label: 'Terça' },
  { value: 'qua', label: 'Quarta' },
  { value: 'qui', label: 'Quinta' },
  { value: 'sex', label: 'Sexta' },
  { value: 'sab', label: 'Sábado' },
];

export interface User {
  id: string;
  username: string;
  password: string; // PBKDF2 hash para sistema offline
  salt?: string; // Salt for PBKDF2 password hashing
  nome: string;
  role: UserRole;
  email?: string; // Obrigatório apenas para admin
  ativo: boolean;
  createdAt: string;
}

export interface InstitutionSettings {
  id?: string;
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  logo?: string; // Base64
  responsavel?: string;
  observacoes?: string;
  horarioVisitaInicio?: string;
  horarioVisitaFim?: string;
  horarioEnfermariaInicio?: string;
  horarioEnfermariaFim?: string;
}

export interface WeekendExit {
  id: string;
  residentId: string;
  resident?: Resident;
  dataSaida: string;
  horaSaida: string;
  dataRetornoPrevista?: string;
  horaRetornoPrevista?: string;
  horaRetornoReal?: string;
  acompanhante: string;
  observacoes?: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  ano: string;
  placa: string;
  cor: string;
  kmInicial: number;
  kmAtual?: number;
  ativo: boolean;
  createdAt: string;
}

export interface Person {
  id: string;
  nome: string;
  cpf: string;
  rg: string;
  telefone: string;
  tipo: VisitorType;
  parentesco?: string;
  idosoVinculado?: string;
  observacoes?: string;
  foto?: string; // Base64 da foto
  horarioEspecial?: boolean; // Se tem horário diferenciado
  horarioEspecialInicio?: string; // Horário de início permitido
  horarioEspecialFim?: string; // Horário de fim permitido
  diasPermitidos?: DayOfWeek[]; // Dias da semana permitidos para horário diferenciado
  createdAt: string;
  updatedAt: string;
}

export interface Resident {
  id: string;
  nome: string;
  cpf?: string;
  dataNascimento?: string;
  quarto: string;
  foto?: string; // Base64 da foto
  observacoes?: string;
  ativo: boolean;
  autorizadoSaidaTemporaria: boolean; // Pode fazer saída temporária
  diasSaidaPermitidos?: DayOfWeek[]; // Dias permitidos para saída
  horarioSaidaPermitido?: string; // Horário de saída permitido
  horarioRetornoPermitido?: string; // Horário de retorno permitido
  createdAt: string;
}

export interface Visit {
  id: string;
  pessoaId: string;
  pessoa?: Person;
  proposito: VisitPurpose;
  idosoId?: string;
  idoso?: Resident;
  descricaoAcaoSocial?: string;
  pessoaDepartamento?: string; // Para reuniões
  dataEntrada: string;
  horaEntrada: string;
  horaSaida?: string;
  etiquetaEmitida: boolean;
  etiquetaDevolvida: boolean;
  observacoes?: string;
  createdAt: string;
}

export interface ResidentExit {
  id: string;
  residentId: string;
  resident?: Resident;
  dataSaida: string;
  horaSaida: string;
  horaRetornoPrevista: string;
  horaRetornoReal?: string;
  motivoSaida: string;
  acompanhante?: string;
  observacoes?: string;
  createdAt: string;
}

export interface VehicleTrip {
  id: string;
  vehicleId?: string; // Referência ao veículo cadastrado
  veiculo: string;
  placa: string;
  motorista: string;
  dataSaida: string;
  horaSaida: string;
  kmSaida: number;
  horaChegada?: string;
  kmChegada?: number;
  destino?: string;
  observacoes?: string;
  createdAt: string;
}

export interface DashboardStats {
  visitantesHoje: number;
  visitantesNoLocal: number;
  visitasMes: number;
  visitasSemana: number;
}

export interface VisitingHours {
  inicio: string; // "13:30"
  fim: string; // "16:30"
}

export const VISITING_HOURS: VisitingHours = {
  inicio: '13:30',
  fim: '16:30',
};

export interface AuditLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  tableName: string;
  recordId: string;
  oldData: Record<string, any> | null;
  newData: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
