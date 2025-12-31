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
  foto?: string; // Base64 da foto
  horarioEspecial?: boolean; // Se tem horário diferenciado
  horarioEspecialInicio?: string; // Horário de início permitido
  horarioEspecialFim?: string; // Horário de fim permitido
  createdAt: string;
  updatedAt: string;
}

export interface Resident {
  id: string;
  nome: string;
  quarto: string;
  observacoes?: string;
  ativo: boolean;
  autorizadoSaidaTemporaria: boolean; // Pode fazer saída temporária
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
