import { supabase } from '@/integrations/supabase/client';
import { Person, Resident, Visit, Vehicle, VehicleTrip, ResidentExit, WeekendExit, InstitutionSettings, UserRole, VisitorType, VisitPurpose, DayOfWeek, AuditLog } from '@/types';
import { formatCPF } from '@/lib/utils';

// ==================== AUDIT LOGS ====================
export async function createAuditLog(params: {
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  tableName: string;
  recordId: string;
  oldData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_email: user?.email,
      user_name: user?.user_metadata?.nome || user?.email?.split('@')[0],
      action: params.action,
      table_name: params.tableName,
      record_id: params.recordId,
      old_data: params.oldData || null,
      new_data: params.newData || null,
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw - audit log failures shouldn't block main operations
  }
}

export async function getAuditLogs(filters?: {
  startDate?: string;
  endDate?: string;
  tableName?: string;
  action?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: AuditLog[]; count: number }> {
  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters?.startDate) {
    query = query.gte('created_at', `${filters.startDate}T00:00:00`);
  }
  if (filters?.endDate) {
    query = query.lte('created_at', `${filters.endDate}T23:59:59`);
  }
  if (filters?.tableName) {
    query = query.eq('table_name', filters.tableName);
  }
  if (filters?.action) {
    query = query.eq('action', filters.action);
  }
  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }

  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email,
      userName: row.user_name,
      action: row.action as 'INSERT' | 'UPDATE' | 'DELETE',
      tableName: row.table_name,
      recordId: row.record_id,
      oldData: row.old_data as Record<string, any> | null,
      newData: row.new_data as Record<string, any> | null,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    })),
    count: count || 0,
  };
}

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
    cpf: row.cpf,
    dataNascimento: row.data_nascimento,
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

// Backwards-compatible alias used by some UI modules
export async function getResidentById(id: string): Promise<Resident | undefined> {
  const resident = await getResident(id);
  return resident ?? undefined;
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
    cpf: data.cpf,
    dataNascimento: data.data_nascimento,
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
  const existing = await getResident(resident.id);
  const isUpdate = !!existing;
  
  const dbData = {
    id: resident.id,
    nome: resident.nome,
    cpf: resident.cpf,
    data_nascimento: resident.dataNascimento,
    quarto: resident.quarto,
    foto: resident.foto,
    observacoes: resident.observacoes,
    ativo: resident.ativo,
    autorizado_saida_temporaria: resident.autorizadoSaidaTemporaria,
    dias_saida_permitidos: resident.diasSaidaPermitidos,
    horario_saida_permitido: resident.horarioSaidaPermitido,
    horario_retorno_permitido: resident.horarioRetornoPermitido,
  };
  
  const { error } = await supabase.from('residents').upsert(dbData);
  if (error) throw error;
  
  await createAuditLog({
    action: isUpdate ? 'UPDATE' : 'INSERT',
    tableName: 'residents',
    recordId: resident.id,
    oldData: existing ? { nome: existing.nome, quarto: existing.quarto, ativo: existing.ativo } : null,
    newData: { nome: resident.nome, quarto: resident.quarto, ativo: resident.ativo },
  });
}

export async function deleteResident(id: string): Promise<void> {
  const existing = await getResident(id);
  
  const { error } = await supabase.from('residents').delete().eq('id', id);
  if (error) throw error;
  
  await createAuditLog({
    action: 'DELETE',
    tableName: 'residents',
    recordId: id,
    oldData: existing ? { nome: existing.nome, quarto: existing.quarto } : null,
  });
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

export async function getPersonById(id: string): Promise<Person | null> {
  const { data, error } = await supabase
    .from('persons')
    .select('*')
    .eq('id', id)
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

export async function searchPersons(query: string, limit = 10): Promise<Person[]> {
  const q = query.trim();
  if (!q) return [];

  // Help CPF searching when user types only digits
  const digitsOnly = q.replace(/\D/g, '');
  const cpfFormatted = digitsOnly.length >= 11 ? formatCPF(digitsOnly) : undefined;

  const orParts = [
    `nome.ilike.%${q}%`,
    `cpf.ilike.%${q}%`,
    `rg.ilike.%${q}%`,
  ];
  if (cpfFormatted && cpfFormatted !== q) {
    orParts.push(`cpf.ilike.%${cpfFormatted}%`);
  }

  const { data, error } = await supabase
    .from('persons')
    .select('*')
    .or(orParts.join(','))
    .order('nome')
    .limit(limit);

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
  const existing = await getPersonByCpf(person.cpf);
  const isUpdate = existing && existing.id === person.id;
  
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
  
  await createAuditLog({
    action: isUpdate ? 'UPDATE' : 'INSERT',
    tableName: 'persons',
    recordId: person.id,
    oldData: existing && isUpdate ? { nome: existing.nome, cpf: existing.cpf, tipo: existing.tipo } : null,
    newData: { nome: person.nome, cpf: person.cpf, tipo: person.tipo },
  });
}

export async function deletePerson(id: string): Promise<void> {
  const persons = await getPersons();
  const existing = persons.find(p => p.id === id);
  
  const { error } = await supabase.from('persons').delete().eq('id', id);
  if (error) throw error;
  
  await createAuditLog({
    action: 'DELETE',
    tableName: 'persons',
    recordId: id,
    oldData: existing ? { nome: existing.nome, cpf: existing.cpf } : null,
  });
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
  const { data, error } = await supabase
    .from('visits')
    .select(`
      *,
      pessoa:persons(*),
      idoso:residents(*)
    `)
    .is('hora_saida', null)
    .order('data_entrada', { ascending: false })
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
  const { data: existingData } = await supabase.from('visits').select('*').eq('id', visit.id).maybeSingle();
  const isUpdate = !!existingData;
  
  const { error } = await supabase.from('visits').upsert({
    id: visit.id,
    pessoa_id: visit.pessoaId,
    proposito: visit.proposito,
    idoso_id: visit.idosoId || null,
    descricao_acao_social: visit.descricaoAcaoSocial || null,
    pessoa_departamento: visit.pessoaDepartamento || null,
    data_entrada: visit.dataEntrada,
    hora_entrada: visit.horaEntrada,
    hora_saida: visit.horaSaida,
    etiqueta_emitida: visit.etiquetaEmitida,
    etiqueta_devolvida: visit.etiquetaDevolvida,
    observacoes: visit.observacoes,
  });
  if (error) throw error;
  
  await createAuditLog({
    action: isUpdate ? 'UPDATE' : 'INSERT',
    tableName: 'visits',
    recordId: visit.id,
    oldData: existingData ? { data_entrada: existingData.data_entrada, hora_saida: existingData.hora_saida } : null,
    newData: { data_entrada: visit.dataEntrada, hora_entrada: visit.horaEntrada, hora_saida: visit.horaSaida },
  });
}

export async function deleteVisit(id: string): Promise<void> {
  const { data: existing } = await supabase.from('visits').select('*').eq('id', id).maybeSingle();
  
  const { error } = await supabase.from('visits').delete().eq('id', id);
  if (error) throw error;
  
  await createAuditLog({
    action: 'DELETE',
    tableName: 'visits',
    recordId: id,
    oldData: existing ? { data_entrada: existing.data_entrada } : null,
  });
}

// Helper visit query functions for Dashboard
export async function getVisitsByDate(date: string): Promise<Visit[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('id')
    .eq('data_entrada', date);

  if (error) throw error;
  return (data || []).map(row => ({ id: row.id } as Visit));
}

export async function getVisitsByPeriod(startDate: string, endDate: string): Promise<Visit[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('id')
    .gte('data_entrada', startDate)
    .lte('data_entrada', endDate);

  if (error) throw error;
  return (data || []).map(row => ({ id: row.id } as Visit));
}

export async function getVisitsByResident(residentId: string, startDate?: string, endDate?: string): Promise<Visit[]> {
  let query = supabase
    .from('visits')
    .select('id')
    .eq('idoso_id', residentId);

  if (startDate) query = query.gte('data_entrada', startDate);
  if (endDate) query = query.lte('data_entrada', endDate);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(row => ({ id: row.id } as Visit));
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
  const { data: existingData } = await supabase.from('vehicles').select('*').eq('id', vehicle.id).maybeSingle();
  const isUpdate = !!existingData;
  
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
  
  await createAuditLog({
    action: isUpdate ? 'UPDATE' : 'INSERT',
    tableName: 'vehicles',
    recordId: vehicle.id,
    oldData: existingData ? { marca: existingData.marca, modelo: existingData.modelo, placa: existingData.placa } : null,
    newData: { marca: vehicle.marca, modelo: vehicle.modelo, placa: vehicle.placa },
  });
}

export async function deleteVehicle(id: string): Promise<void> {
  const { data: existing } = await supabase.from('vehicles').select('*').eq('id', id).maybeSingle();
  
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) throw error;
  
  await createAuditLog({
    action: 'DELETE',
    tableName: 'vehicles',
    recordId: id,
    oldData: existing ? { marca: existing.marca, modelo: existing.modelo, placa: existing.placa } : null,
  });
}

export async function getActiveVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('ativo', true)
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

export async function getActiveVehicleTrips(): Promise<VehicleTrip[]> {
  const { data, error } = await supabase
    .from('vehicle_trips')
    .select('*')
    .is('hora_chegada', null)
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

export async function getLastKmChegadaForVehicle(vehicleId: string): Promise<number | undefined> {
  const { data, error } = await supabase
    .from('vehicle_trips')
    .select('km_chegada')
    .eq('vehicle_id', vehicleId)
    .not('km_chegada', 'is', null)
    .order('data_saida', { ascending: false })
    .order('hora_saida', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.km_chegada ?? undefined;
}

export async function saveVehicleTrip(trip: VehicleTrip): Promise<void> {
  const { data: existingData } = await supabase.from('vehicle_trips').select('*').eq('id', trip.id).maybeSingle();
  const isUpdate = !!existingData;
  
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
  
  await createAuditLog({
    action: isUpdate ? 'UPDATE' : 'INSERT',
    tableName: 'vehicle_trips',
    recordId: trip.id,
    oldData: existingData ? { motorista: existingData.motorista, destino: existingData.destino, hora_chegada: existingData.hora_chegada } : null,
    newData: { motorista: trip.motorista, destino: trip.destino, hora_chegada: trip.horaChegada },
  });
}

export async function deleteVehicleTrip(id: string): Promise<void> {
  const { data: existing } = await supabase.from('vehicle_trips').select('*').eq('id', id).maybeSingle();
  
  const { error } = await supabase.from('vehicle_trips').delete().eq('id', id);
  if (error) throw error;
  
  await createAuditLog({
    action: 'DELETE',
    tableName: 'vehicle_trips',
    recordId: id,
    oldData: existing ? { veiculo: existing.veiculo, motorista: existing.motorista, destino: existing.destino } : null,
  });
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

export async function getActiveResidentExits(): Promise<ResidentExit[]> {
  const { data, error } = await supabase
    .from('resident_exits')
    .select(`
      *,
      resident:residents(*)
    `)
    .is('hora_retorno_real', null)
    .order('data_saida', { ascending: false })
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

export async function importResidentsFromJSON(jsonData: string): Promise<{ success: number; errors: number }> {
  try {
    const data = JSON.parse(jsonData);
    const residents = Array.isArray(data) ? data : data.residents || [];
    let success = 0;
    let errors = 0;

    for (const r of residents) {
      try {
        if (r.nome) {
          const resident: Resident = {
            id: r.id || crypto.randomUUID(),
            nome: r.nome,
            quarto: r.quarto || '',
            cpf: r.cpf,
            dataNascimento: r.dataNascimento,
            foto: r.foto,
            observacoes: r.observacoes,
            ativo: r.ativo !== undefined ? r.ativo : true,
            autorizadoSaidaTemporaria: r.autorizadoSaidaTemporaria || false,
            diasSaidaPermitidos: r.diasSaidaPermitidos,
            horarioSaidaPermitido: r.horarioSaidaPermitido,
            horarioRetornoPermitido: r.horarioRetornoPermitido,
            createdAt: r.createdAt || new Date().toISOString(),
          };
          await saveResident(resident);
          success++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    return { success, errors };
  } catch {
    return { success: 0, errors: 1 };
  }
}

export async function importResidentsFromCSV(csvData: string): Promise<{ success: number; errors: number }> {
  try {
    const lines = csvData.split('\n').filter(l => l.trim());
    if (lines.length < 2) return { success: 0, errors: 0 };

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    let success = 0;
    let errors = 0;

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const record: Record<string, string> = {};
        headers.forEach((h, idx) => {
          record[h] = values[idx] || '';
        });

        const nome = record.nome || record.name || record['nome completo'];
        if (nome) {
          const resident: Resident = {
            id: crypto.randomUUID(),
            nome,
            quarto: record.quarto || record.room || '',
            observacoes: record.observacoes || record.obs || '',
            ativo: true,
            autorizadoSaidaTemporaria: false,
            createdAt: new Date().toISOString(),
          };
          await saveResident(resident);
          success++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    return { success, errors };
  } catch {
    return { success: 0, errors: 1 };
  }
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
  const { data: existingData } = await supabase.from('resident_exits').select('*').eq('id', exit.id).maybeSingle();
  const isUpdate = !!existingData;
  
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
  
  await createAuditLog({
    action: isUpdate ? 'UPDATE' : 'INSERT',
    tableName: 'resident_exits',
    recordId: exit.id,
    oldData: existingData ? { data_saida: existingData.data_saida, hora_retorno_real: existingData.hora_retorno_real } : null,
    newData: { data_saida: exit.dataSaida, hora_saida: exit.horaSaida, hora_retorno_real: exit.horaRetornoReal },
  });
}

export async function deleteResidentExit(id: string): Promise<void> {
  const { data: existing } = await supabase.from('resident_exits').select('*').eq('id', id).maybeSingle();
  
  const { error } = await supabase.from('resident_exits').delete().eq('id', id);
  if (error) throw error;
  
  await createAuditLog({
    action: 'DELETE',
    tableName: 'resident_exits',
    recordId: id,
    oldData: existing ? { data_saida: existing.data_saida, motivo_saida: existing.motivo_saida } : null,
  });
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
    horarioEnfermariaInicio: (data as any).horario_enfermaria_inicio || '14:30',
    horarioEnfermariaFim: (data as any).horario_enfermaria_fim || '16:00',
  };
}

export async function saveInstitutionSettings(settings: InstitutionSettings): Promise<void> {
  const existing = await getInstitutionSettings();
  
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
    horario_enfermaria_inicio: settings.horarioEnfermariaInicio,
    horario_enfermaria_fim: settings.horarioEnfermariaFim,
  });
  if (error) throw error;
  
  await createAuditLog({
    action: 'UPDATE',
    tableName: 'institution_settings',
    recordId: 'default',
    oldData: existing ? { nome: existing.nome, horarioVisitaInicio: existing.horarioVisitaInicio, horarioVisitaFim: existing.horarioVisitaFim } : null,
    newData: { nome: settings.nome, horarioVisitaInicio: settings.horarioVisitaInicio, horarioVisitaFim: settings.horarioVisitaFim },
  });
}

// ==================== WEEKEND EXITS ====================
export async function getWeekendExits(): Promise<WeekendExit[]> {
  const { data, error } = await supabase
    .from('weekend_exits')
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
    dataRetornoPrevista: row.data_retorno_prevista,
    horaRetornoPrevista: row.hora_retorno_prevista,
    horaRetornoReal: row.hora_retorno_real,
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

export async function saveWeekendExit(exit: WeekendExit): Promise<void> {
  const { data: existingData } = await supabase.from('weekend_exits').select('*').eq('id', exit.id).maybeSingle();
  const isUpdate = !!existingData;
  
  const { error } = await supabase.from('weekend_exits').upsert({
    id: exit.id,
    resident_id: exit.residentId,
    data_saida: exit.dataSaida,
    hora_saida: exit.horaSaida,
    data_retorno_prevista: exit.dataRetornoPrevista || null,
    hora_retorno_prevista: exit.horaRetornoPrevista || null,
    hora_retorno_real: exit.horaRetornoReal || null,
    acompanhante: exit.acompanhante,
    observacoes: exit.observacoes,
  });
  if (error) throw error;
  
  await createAuditLog({
    action: isUpdate ? 'UPDATE' : 'INSERT',
    tableName: 'weekend_exits',
    recordId: exit.id,
    oldData: existingData ? { data_saida: existingData.data_saida, hora_retorno_real: existingData.hora_retorno_real } : null,
    newData: { data_saida: exit.dataSaida, hora_saida: exit.horaSaida, acompanhante: exit.acompanhante },
  });
}

export async function deleteWeekendExit(id: string): Promise<void> {
  const { data: existing } = await supabase.from('weekend_exits').select('*').eq('id', id).maybeSingle();
  
  const { error } = await supabase.from('weekend_exits').delete().eq('id', id);
  if (error) throw error;
  
  await createAuditLog({
    action: 'DELETE',
    tableName: 'weekend_exits',
    recordId: id,
    oldData: existing ? { data_saida: existing.data_saida, acompanhante: existing.acompanhante } : null,
  });
}

export async function getActiveWeekendExits(): Promise<WeekendExit[]> {
  const { data, error } = await supabase
    .from('weekend_exits')
    .select(`
      *,
      resident:residents(*)
    `)
    .is('hora_retorno_real', null)
    .order('data_saida', { ascending: false });

  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    residentId: row.resident_id,
    dataSaida: row.data_saida,
    horaSaida: row.hora_saida,
    dataRetornoPrevista: row.data_retorno_prevista,
    horaRetornoPrevista: row.hora_retorno_prevista,
    horaRetornoReal: row.hora_retorno_real,
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
