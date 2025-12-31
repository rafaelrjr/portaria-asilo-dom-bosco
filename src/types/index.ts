export type VisitorType = 'familiar' | 'prestador' | 'acao_social' | 'visita_geral' | 'outro';

export type VisitPurpose = 'idoso_especifico' | 'acao_social' | 'visita_geral';

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
  createdAt: string;
  updatedAt: string;
}

export interface Resident {
  id: string;
  nome: string;
  quarto: string;
  observacoes?: string;
  ativo: boolean;
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
  dataEntrada: string;
  horaEntrada: string;
  horaSaida?: string;
  etiquetaEmitida: boolean;
  etiquetaDevolvida: boolean;
  observacoes?: string;
  createdAt: string;
}

export interface DashboardStats {
  visitantesHoje: number;
  visitantesNoLocal: number;
  visitasMes: number;
  visitasSemana: number;
}
