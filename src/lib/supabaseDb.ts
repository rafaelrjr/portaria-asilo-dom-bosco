import { supabase } from '@/integrations/supabase/client';
import { Person, Resident, Visit, Vehicle, VehicleTrip, ResidentExit, InstitutionSettings, UserRole, VisitorType, VisitPurpose, DayOfWeek } from '@/types';

// ==================== RESIDENTS ====================
export async function getResidents(): Promise<Resident[]> {
  const { data, error } = await supabase
    .from('residents')
    .select('*')
    .order('nome');

  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    nome: row.nome,
    quarto: row.quarto,
    foto: row.foto,
    observacoes: row.observacoes,
    ativo: row.ativo ?? true,
    autorizadoSaidaTemporaria: row.autorizado_saida_temporaria ?? false,
    diasSaidaPermitidos: (row.dias_saida_permitidos || []) as DayOfWeek[],
    horarioSaidaPermitido: row.horario_saida_permitido,
    horarioRetornoPermitido: row.horario_retorno_permitido,
    createdAt: row.created_at,
  }));
}

export async function getResident(id: string): Promise<Resident | null> {
  const { data, error } = await supabase
    .from('residents')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  
  return {
    id: data.id,
    nome: data.nome,
    quarto: data.quarto,
    foto: data.foto,
    observacoes: data.observacoes,
    ativo: data.ativo ?? true,
    autorizadoSaidaTemporaria: data.autorizado_saida_temporaria ?? false,
    diasSaidaPermitidos: (data.dias_saida_permitidos || []) as DayOfWeek[],
    horarioSaidaPermitido: data.horario_saida_permitido,
    horarioRetornoPermitido: data.horario_retorno_permitido,
    createdAt: data.created_at,
  };
}

export async function saveResident(resident: Resident): Promise<void> {
  const { error } = await supabase.from('residents').upsert({
    id: resident.id,
    nome: resident.nome,
    quarto: resident.quarto,
    foto: resident.foto,
    observacoes: resident.observacoes,
    ativo: resident.ativo,
    autorizado_saida_temporaria: resident.autorizadoSaidaTemporaria,
    dias_saida_permitidos: resident.diasSaidaPermitidos,
    horario_saida_permitido: resident.horarioSaidaPermitido,
    horario_retorno_permitido: resident.horarioRetornoPermitido,
  });
  if (error) throw error;
}

export async function deleteResident(id: string): Promise<void> {
  const { error } = await supabase.from('residents').delete().eq('id', id);
  if (error) throw error;
}

// ==================== PERSONS ====================
export async function getPersons(): Promise<Person[]> {
  const { data, error } = await supabase
    .from('persons')
    .select('*')
    .order('nome');

  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    nome: row.nome,
    cpf: row.cpf,
    rg: row.rg,
    telefone: row.telefone,
    tipo: row.tipo as VisitorType,
    parentesco: row.parentesco,
    idosoVinculado: row.idoso_vinculado,
    observacoes: row.observacoes,
    foto: row.foto,
    horarioEspecial: row.horario_especial ?? false,
    horarioEspecialInicio: row.horario_especial_inicio,
    horarioEspecialFim: row.horario_especial_fim,
    diasPermitidos: (row.dias_permitidos || []) as DayOfWeek[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getPersonByCpf(cpf: string): Promise<Person | null> {
  const { data, error } = await supabase
    .from('persons')
    .select('*')
    .eq('cpf', cpf)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    nome: data.nome,
    cpf: data.cpf,
    rg: data.rg,
    telefone: data.telefone,
    tipo: data.tipo as VisitorType,
    parentesco: data.parentesco,
    idosoVinculado: data.idoso_vinculado,
    observacoes: data.observacoes,
    foto: data.foto,
    horarioEspecial: data.horario_especial ?? false,
    horarioEspecialInicio: data.horario_especial_inicio,
    horarioEspecialFim: data.horario_especial_fim,
    diasPermitidos: (data.dias_permitidos || []) as DayOfWeek[],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function savePerson(person: Person): Promise<void> {
  const { error } = await supabase.from('persons').upsert({
    id: person.id,
    nome: person.nome,
    cpf: person.cpf,
    rg: person.rg,
    telefone: person.telefone,
    tipo: person.tipo,
    parentesco: person.parentesco,
    idoso_vinculado: person.idosoVinculado,
    observacoes: person.observacoes,
    foto: person.foto,
    horario_especial: person.horarioEspecial,
    horario_especial_inicio: person.horarioEspecialInicio,
    horario_especial_fim: person.horarioEspecialFim,
    dias_permitidos: person.diasPermitidos,
  });
  if (error) throw error;
}

export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase.from('persons').delete().eq('id', id);
  if (error) throw error;
}

// ==================== VISITS ====================
export async function getVisits(): Promise<Visit[]> {
  const { data, error } = await supabase
    .from('visits')
    .select(`
      *,
      pessoa:persons(*),
      idoso:residents(*)
    `)
    .order('data_entrada', { ascending: false });

  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    pessoaId: row.pessoa_id,
    proposito: row.proposito as VisitPurpose,
    idosoId: row.idoso_id,
    descricaoAcaoSocial: row.descricao_acao_social,
    pessoaDepartamento: row.pessoa_departamento,
    dataEntrada: row.data_entrada,
    horaEntrada: row.hora_entrada,
    horaSaida: row.hora_saida,
    etiquetaEmitida: row.etiqueta_emitida ?? false,
    etiquetaDevolvida: row.etiqueta_devolvida ?? false,
    observacoes: row.observacoes,
    createdAt: row.created_at,
    pessoa: row.pessoa ? {
      id: row.pessoa.id,
      nome: row.pessoa.nome,
      cpf: row.pessoa.cpf,
      rg: row.pessoa.rg,
      telefone: row.pessoa.telefone,
      tipo: row.pessoa.tipo as VisitorType,
      parentesco: row.pessoa.parentesco,
      idosoVinculado: row.pessoa.idoso_vinculado,
      observacoes: row.pessoa.observacoes,
      foto: row.pessoa.foto,
      horarioEspecial: row.pessoa.horario_especial ?? false,
      horarioEspecialInicio: row.pessoa.horario_especial_inicio,
      horarioEspecialFim: row.pessoa.horario_especial_fim,
      diasPermitidos: (row.pessoa.dias_permitidos || []) as DayOfWeek[],
      createdAt: row.pessoa.created_at,
      updatedAt: row.pessoa.updated_at,
    } : undefined,
    idoso: row.idoso ? {
      id: row.idoso.id,
      nome: row.idoso.nome,
      quarto: row.idoso.quarto,
      foto: row.idoso.foto,
      observacoes: row.idoso.observacoes,
      ativo: row.idoso.ativo ?? true,
      autorizadoSaidaTemporaria: row.idoso.autorizado_saida_temporaria ?? false,
      diasSaidaPermitidos: (row.idoso.dias_saida_permitidos || []) as DayOfWeek[],
      horarioSaidaPermitido: row.idoso.horario_saida_permitido,
      horarioRetornoPermitido: row.idoso.horario_retorno_permitido,
      createdAt: row.idoso.created_at,
    } : undefined,
  }));
}

export async function getActiveVisits(): Promise<Visit[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('visits')
    .select(`
      *,
      pessoa:persons(*),
      idoso:residents(*)
    `)
    .eq('data_entrada', today)
    .is('hora_saida', null)
    .order('hora_entrada', { ascending: false });

  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    pessoaId: row.pessoa_id,
    proposito: row.proposito as VisitPurpose,
    idosoId: row.idoso_id,
    descricaoAcaoSocial: row.descricao_acao_social,
    pessoaDepartamento: row.pessoa_departamento,
    dataEntrada: row.data_entrada,
    horaEntrada: row.hora_entrada,
    horaSaida: row.hora_saida,
    etiquetaEmitida: row.etiqueta_emitida ?? false,
    etiquetaDevolvida: row.etiqueta_devolvida ?? false,
    observacoes: row.observacoes,
    createdAt: row.created_at,
    pessoa: row.pessoa ? {
      id: row.pessoa.id,
      nome: row.pessoa.nome,
      cpf: row.pessoa.cpf,
      rg: row.pessoa.rg,
      telefone: row.pessoa.telefone,
      tipo: row.pessoa.tipo as VisitorType,
      parentesco: row.pessoa.parentesco,
      idosoVinculado: row.pessoa.idoso_vinculado,
      observacoes: row.pessoa.observacoes,
      foto: row.pessoa.foto,
      horarioEspecial: row.pessoa.horario_especial ?? false,
      horarioEspecialInicio: row.pessoa.horario_especial_inicio,
      horarioEspecialFim: row.pessoa.horario_especial_fim,
      diasPermitidos: (row.pessoa.dias_permitidos || []) as DayOfWeek[],
      createdAt: row.pessoa.created_at,
      updatedAt: row.pessoa.updated_at,
    } : undefined,
    idoso: row.idoso ? {
      id: row.idoso.id,
      nome: row.idoso.nome,
      quarto: row.idoso.quarto,
      foto: row.idoso.foto,
      observacoes: row.idoso.observacoes,
      ativo: row.idoso.ativo ?? true,
      autorizadoSaidaTemporaria: row.idoso.autorizado_saida_temporaria ?? false,
      diasSaidaPermitidos: (row.idoso.dias_saida_permitidos || []) as DayOfWeek[],
      horarioSaidaPermitido: row.idoso.horario_saida_permitido,
      horarioRetornoPermitido: row.idoso.horario_retorno_permitido,
      createdAt: row.idoso.created_at,
    } : undefined,
  }));
}

export async function saveVisit(visit: Visit): Promise<void> {
  const { error } = await supabase.from('visits').upsert({
    id: visit.id,
    pessoa_id: visit.pessoaId,
    proposito: visit.proposito,
    idoso_id: visit.idosoId,
    descricao_acao_social: visit.descricaoAcaoSocial,
    pessoa_departamento: visit.pessoaDepartamento,
    data_entrada: visit.dataEntrada,
    hora_entrada: visit.horaEntrada,
    hora_saida: visit.horaSaida,
    etiqueta_emitida: visit.etiquetaEmitida,
    etiqueta_devolvida: visit.etiquetaDevolvida,
    observacoes: visit.observacoes,
  });
  if (error) throw error;
}

export async function deleteVisit(id: string): Promise<void> {
  const { error } = await supabase.from('visits').delete().eq('id', id);
  if (error) throw error;
}

// ==================== VEHICLES ====================
export async function getVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('marca');

  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    marca: row.marca,
    modelo: row.modelo,
    ano: row.ano,
    placa: row.placa,
    cor: row.cor,
    kmInicial: row.km_inicial ?? 0,
    kmAtual: row.km_atual,
    ativo: row.ativo ?? true,
    createdAt: row.created_at,
  }));
}

export async function saveVehicle(vehicle: Vehicle): Promise<void> {
  const { error } = await supabase.from('vehicles').upsert({
    id: vehicle.id,
    marca: vehicle.marca,
    modelo: vehicle.modelo,
    ano: vehicle.ano,
    placa: vehicle.placa,
    cor: vehicle.cor,
    km_inicial: vehicle.kmInicial,
    km_atual: vehicle.kmAtual,
    ativo: vehicle.ativo,
  });
  if (error) throw error;
}

export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) throw error;
}

// ==================== VEHICLE TRIPS ====================
export async function getVehicleTrips(): Promise<VehicleTrip[]> {
  const { data, error } = await supabase
    .from('vehicle_trips')
    .select('*')
    .order('data_saida', { ascending: false });

  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    vehicleId: row.vehicle_id,
    veiculo: row.veiculo,
    placa: row.placa,
    motorista: row.motorista,
    dataSaida: row.data_saida,
    horaSaida: row.hora_saida,
    kmSaida: row.km_saida,
    horaChegada: row.hora_chegada,
    kmChegada: row.km_chegada,
    destino: row.destino,
    observacoes: row.observacoes,
    createdAt: row.created_at,
  }));
}

export async function saveVehicleTrip(trip: VehicleTrip): Promise<void> {
  const { error } = await supabase.from('vehicle_trips').upsert({
    id: trip.id,
    vehicle_id: trip.vehicleId,
    veiculo: trip.veiculo,
    placa: trip.placa,
    motorista: trip.motorista,
    data_saida: trip.dataSaida,
    hora_saida: trip.horaSaida,
    km_saida: trip.kmSaida,
    hora_chegada: trip.horaChegada,
    km_chegada: trip.kmChegada,
    destino: trip.destino,
    observacoes: trip.observacoes,
  });
  if (error) throw error;
}

export async function deleteVehicleTrip(id: string): Promise<void> {
  const { error } = await supabase.from('vehicle_trips').delete().eq('id', id);
  if (error) throw error;
}

// ==================== RESIDENT EXITS ====================
export async function getResidentExits(): Promise<ResidentExit[]> {
  const { data, error } = await supabase
    .from('resident_exits')
    .select(`
      *,
      resident:residents(*)
    `)
    .order('data_saida', { ascending: false });

  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    residentId: row.resident_id,
    dataSaida: row.data_saida,
    horaSaida: row.hora_saida,
    horaRetornoPrevista: row.hora_retorno_prevista,
    horaRetornoReal: row.hora_retorno_real,
    motivoSaida: row.motivo_saida,
    acompanhante: row.acompanhante,
    observacoes: row.observacoes,
    createdAt: row.created_at,
    resident: row.resident ? {
      id: row.resident.id,
      nome: row.resident.nome,
      quarto: row.resident.quarto,
      foto: row.resident.foto,
      observacoes: row.resident.observacoes,
      ativo: row.resident.ativo ?? true,
      autorizadoSaidaTemporaria: row.resident.autorizado_saida_temporaria ?? false,
      diasSaidaPermitidos: (row.resident.dias_saida_permitidos || []) as DayOfWeek[],
      horarioSaidaPermitido: row.resident.horario_saida_permitido,
      horarioRetornoPermitido: row.resident.horario_retorno_permitido,
      createdAt: row.resident.created_at,
    } : undefined,
  }));
}

export async function getPendingResidentExits(): Promise<ResidentExit[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('resident_exits')
    .select(`
      *,
      resident:residents(*)
    `)
    .eq('data_saida', today)
    .is('hora_retorno_real', null)
    .order('hora_saida', { ascending: false });

  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    residentId: row.resident_id,
    dataSaida: row.data_saida,
    horaSaida: row.hora_saida,
    horaRetornoPrevista: row.hora_retorno_prevista,
    horaRetornoReal: row.hora_retorno_real,
    motivoSaida: row.motivo_saida,
    acompanhante: row.acompanhante,
    observacoes: row.observacoes,
    createdAt: row.created_at,
    resident: row.resident ? {
      id: row.resident.id,
      nome: row.resident.nome,
      quarto: row.resident.quarto,
      foto: row.resident.foto,
      observacoes: row.resident.observacoes,
      ativo: row.resident.ativo ?? true,
      autorizadoSaidaTemporaria: row.resident.autorizado_saida_temporaria ?? false,
      diasSaidaPermitidos: (row.resident.dias_saida_permitidos || []) as DayOfWeek[],
      horarioSaidaPermitido: row.resident.horario_saida_permitido,
      horarioRetornoPermitido: row.resident.horario_retorno_permitido,
      createdAt: row.resident.created_at,
    } : undefined,
  }));
}

export async function saveResidentExit(exit: ResidentExit): Promise<void> {
  const { error } = await supabase.from('resident_exits').upsert({
    id: exit.id,
    resident_id: exit.residentId,
    data_saida: exit.dataSaida,
    hora_saida: exit.horaSaida,
    hora_retorno_prevista: exit.horaRetornoPrevista,
    hora_retorno_real: exit.horaRetornoReal,
    motivo_saida: exit.motivoSaida,
    acompanhante: exit.acompanhante,
    observacoes: exit.observacoes,
  });
  if (error) throw error;
}

export async function deleteResidentExit(id: string): Promise<void> {
  const { error } = await supabase.from('resident_exits').delete().eq('id', id);
  if (error) throw error;
}

// ==================== INSTITUTION SETTINGS ====================
export async function getInstitutionSettings(): Promise<InstitutionSettings | null> {
  const { data, error } = await supabase
    .from('institution_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    nome: data.nome,
    endereco: data.endereco,
    telefone: data.telefone,
    cnpj: data.cnpj,
    email: data.email,
    logo: data.logo,
    horarioVisitaInicio: data.horario_visita_inicio || '08:00',
    horarioVisitaFim: data.horario_visita_fim || '17:00',
  };
}

export async function saveInstitutionSettings(settings: InstitutionSettings): Promise<void> {
  const { error } = await supabase.from('institution_settings').upsert({
    id: 'default',
    nome: settings.nome,
    endereco: settings.endereco,
    telefone: settings.telefone,
    cnpj: settings.cnpj,
    email: settings.email,
    logo: settings.logo,
    horario_visita_inicio: settings.horarioVisitaInicio,
    horario_visita_fim: settings.horarioVisitaFim,
  });
  if (error) throw error;
}

// ==================== USER PROFILES & ROLES ====================
export async function getCurrentUserProfile(): Promise<{ profile: { nome: string; username: string; email: string | null } | null; role: UserRole | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { profile: null, role: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  return {
    profile: profile ? { nome: profile.nome, username: profile.username, email: profile.email } : null,
    role: roleData?.role as UserRole | null,
  };
}

export async function assignUserRole(userId: string, role: UserRole): Promise<void> {
  const { error } = await supabase.from('user_roles').upsert({
    user_id: userId,
    role: role,
  });
  if (error) throw error;
}

// ==================== DASHBOARD STATS ====================
export async function getDashboardStats() {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [todayVisits, activeVisits, weekVisits, monthVisits] = await Promise.all([
    supabase.from('visits').select('id', { count: 'exact' }).eq('data_entrada', today),
    supabase.from('visits').select('id', { count: 'exact' }).eq('data_entrada', today).is('hora_saida', null),
    supabase.from('visits').select('id', { count: 'exact' }).gte('data_entrada', weekAgo),
    supabase.from('visits').select('id', { count: 'exact' }).gte('data_entrada', monthAgo),
  ]);

  return {
    visitantesHoje: todayVisits.count || 0,
    visitantesNoLocal: activeVisits.count || 0,
    visitasSemana: weekVisits.count || 0,
    visitasMes: monthVisits.count || 0,
    date: today,
  };
}
