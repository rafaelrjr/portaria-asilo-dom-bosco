import { Visit, VehicleTrip, ResidentExit, Person, Resident } from '@/types';
import { formatDate, getVisitorTypeLabel, getVisitPurposeLabel } from './utils';

// Export to CSV
export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        const stringValue = value === null || value === undefined ? '' : String(value);
        // Escape quotes and wrap in quotes if contains comma
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    ),
  ].join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

// Export Visits Report
export function exportVisitsReport(visits: Visit[], filename = 'relatorio_visitas'): void {
  const data = visits.map(v => ({
    'Data': formatDate(v.dataEntrada),
    'Hora Entrada': v.horaEntrada,
    'Hora Saída': v.horaSaida || 'Em andamento',
    'Visitante': v.pessoa?.nome || 'N/A',
    'CPF': v.pessoa?.cpf || 'N/A',
    'Tipo': v.pessoa ? getVisitorTypeLabel(v.pessoa.tipo) : 'N/A',
    'Propósito': getVisitPurposeLabel(v.proposito),
    'Idoso Visitado': v.idoso?.nome || 'N/A',
    'Quarto': v.idoso?.quarto || 'N/A',
    'Observações': v.observacoes || '',
  }));
  exportToCSV(data, filename);
}

// Export Vehicle Trips Report
export function exportVehicleTripsReport(trips: VehicleTrip[], filename = 'relatorio_veiculos'): void {
  const data = trips.map(t => ({
    'Data': formatDate(t.dataSaida),
    'Veículo': t.veiculo,
    'Placa': t.placa,
    'Motorista': t.motorista,
    'Hora Saída': t.horaSaida,
    'KM Saída': t.kmSaida,
    'Hora Chegada': t.horaChegada || 'Em andamento',
    'KM Chegada': t.kmChegada || 'N/A',
    'KM Percorrido': t.kmChegada ? t.kmChegada - t.kmSaida : 'N/A',
    'Destino': t.destino || '',
    'Observações': t.observacoes || '',
  }));
  exportToCSV(data, filename);
}

// Export Resident Exits Report
export function exportResidentExitsReport(exits: ResidentExit[], filename = 'relatorio_saidas_idosos'): void {
  const data = exits.map(e => ({
    'Data': formatDate(e.dataSaida),
    'Idoso': e.resident?.nome || 'N/A',
    'Quarto': e.resident?.quarto || 'N/A',
    'Hora Saída': e.horaSaida,
    'Retorno Previsto': e.horaRetornoPrevista,
    'Retorno Real': e.horaRetornoReal || 'Não retornou',
    'Status': e.horaRetornoReal ? 
      (e.horaRetornoReal > e.horaRetornoPrevista ? 'Atrasado' : 'No horário') : 
      'Pendente',
    'Motivo': e.motivoSaida,
    'Acompanhante': e.acompanhante || '',
    'Observações': e.observacoes || '',
  }));
  exportToCSV(data, filename);
}

// Export Persons Report
export function exportPersonsReport(persons: Person[], residents: Resident[], filename = 'cadastro_visitantes'): void {
  const data = persons.map(p => {
    const idosoVinculado = residents.find(r => r.id === p.idosoVinculado);
    return {
      'Nome': p.nome,
      'CPF': p.cpf,
      'RG': p.rg || '',
      'Telefone': p.telefone,
      'Tipo': getVisitorTypeLabel(p.tipo),
      'Parentesco': p.parentesco || '',
      'Idoso Vinculado': idosoVinculado?.nome || '-',
      'Quarto do Idoso': idosoVinculado?.quarto || '-',
      'Horário Especial': p.horarioEspecial ? 'Sim' : 'Não',
      'Horário Início': p.horarioEspecialInicio || '',
      'Horário Fim': p.horarioEspecialFim || '',
      'Observações': p.observacoes || '',
      'Cadastrado em': formatDate(p.createdAt.split('T')[0]),
    };
  });
  exportToCSV(data, filename);
}

// Export Residents Report
export function exportResidentsReport(residents: Resident[], filename = 'cadastro_idosos'): void {
  const data = residents.map(r => ({
    'Nome': r.nome,
    'Quarto': r.quarto,
    'Status': r.ativo ? 'Ativo' : 'Inativo',
    'Saída Temporária': r.autorizadoSaidaTemporaria ? 'Autorizado' : 'Não autorizado',
    'Observações': r.observacoes || '',
    'Cadastrado em': formatDate(r.createdAt.split('T')[0]),
  }));
  exportToCSV(data, filename);
}

// Dashboard Stats Export
export function exportDashboardStats(stats: {
  visitantesHoje: number;
  visitantesNoLocal: number;
  visitasSemana: number;
  visitasMes: number;
  date: string;
}): void {
  const data = [{
    'Data do Relatório': formatDate(stats.date),
    'Visitantes Hoje': stats.visitantesHoje,
    'Visitantes no Local': stats.visitantesNoLocal,
    'Visitas na Semana': stats.visitasSemana,
    'Visitas no Mês': stats.visitasMes,
  }];
  exportToCSV(data, `dashboard_${stats.date}`);
}

// Helper function to download file
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob(['\ufeff' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Backup download
export function downloadBackup(jsonData: string): void {
  const date = new Date().toISOString().split('T')[0];
  downloadFile(jsonData, `backup_asilo_dom_bosco_${date}.json`, 'application/json');
}
