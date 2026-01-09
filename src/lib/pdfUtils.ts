import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Visit, VehicleTrip, ResidentExit, Person, Resident, InstitutionSettings } from '@/types';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

function addHeader(doc: jsPDF, title: string, settings?: InstitutionSettings | null) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 15;
  const hasLogo = !!settings?.logo;
  const xOffset = hasLogo ? 50 : 14;

  // Logo
  if (hasLogo) {
    try {
      doc.addImage(settings!.logo!, 'PNG', 14, 10, 30, 30);
    } catch (e) {
      console.warn('Erro ao carregar logo:', e);
    }
  }

  // Institution name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(settings?.nome || 'Sistema de Portaria', xOffset, yPos);
  yPos += 6;

  // Institution details
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (settings?.endereco) {
    doc.text(settings.endereco, xOffset, yPos);
    yPos += 4;
  }
  if (settings?.cnpj) {
    doc.text(`CNPJ: ${settings.cnpj}`, xOffset, yPos);
    yPos += 4;
  }
  if (settings?.telefone || settings?.email) {
    const contact = [settings.telefone, settings.email].filter(Boolean).join(' | ');
    doc.text(contact, xOffset, yPos);
  }

  // Report title - positioned after header content
  const titleY = hasLogo ? 48 : 38;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, titleY, { align: 'center' });

  // Date
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, titleY + 5, { align: 'center' });

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(14, titleY + 8, pageWidth - 14, titleY + 8);

  return titleY + 14;
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
}

export function generateVisitsReportPDF(visits: Visit[], settings?: InstitutionSettings | null) {
  const doc = new jsPDF();
  const startY = addHeader(doc, 'Relatório de Visitas', settings);

  const tableData = visits.map((v) => [
    v.dataEntrada,
    v.horaEntrada,
    v.horaSaida || 'Em andamento',
    v.pessoa?.nome || '-',
    v.pessoa?.cpf || '-',
    v.idoso?.nome || '-',
    v.proposito === 'idoso_especifico' ? 'Visita a Idoso' :
    v.proposito === 'acao_social' ? 'Ação Social' :
    v.proposito === 'visita_geral' ? 'Visita Geral' :
    v.proposito === 'reuniao' ? 'Reunião' :
    v.proposito === 'prestacao_servico' ? 'Prestação de Serviço' : v.proposito,
  ]);

  autoTable(doc, {
    startY,
    head: [['Data', 'Entrada', 'Saída', 'Visitante', 'CPF', 'Idoso', 'Propósito']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  addFooter(doc);
  doc.save(`relatorio_visitas_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function generateVehicleTripsReportPDF(trips: VehicleTrip[], settings?: InstitutionSettings | null) {
  const doc = new jsPDF();
  const startY = addHeader(doc, 'Relatório de Viagens de Veículos', settings);

  const tableData = trips.map((t) => [
    t.dataSaida,
    t.veiculo,
    t.placa,
    t.motorista,
    t.horaSaida,
    t.horaChegada || 'Em viagem',
    t.kmSaida.toString(),
    t.kmChegada?.toString() || '-',
    t.destino || '-',
  ]);

  autoTable(doc, {
    startY,
    head: [['Data', 'Veículo', 'Placa', 'Motorista', 'Saída', 'Chegada', 'Km Saída', 'Km Chegada', 'Destino']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  addFooter(doc);
  doc.save(`relatorio_veiculos_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function generateResidentExitsReportPDF(exits: ResidentExit[], settings?: InstitutionSettings | null) {
  const doc = new jsPDF();
  const startY = addHeader(doc, 'Relatório de Saídas Temporárias de Idosos', settings);

  const tableData = exits.map((e) => [
    e.dataSaida,
    e.resident?.nome || '-',
    e.resident?.quarto || '-',
    e.horaSaida,
    e.horaRetornoPrevista,
    e.horaRetornoReal || 'Não retornou',
    e.motivoSaida,
    e.acompanhante || '-',
  ]);

  autoTable(doc, {
    startY,
    head: [['Data', 'Idoso', 'Quarto', 'Saída', 'Retorno Previsto', 'Retorno Real', 'Motivo', 'Acompanhante']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  addFooter(doc);
  doc.save(`relatorio_saidas_idosos_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function generatePersonsReportPDF(persons: Person[], residents: Resident[], settings?: InstitutionSettings | null) {
  const doc = new jsPDF('landscape');
  const startY = addHeader(doc, 'Cadastro de Visitantes', settings);

  const tipoLabels: Record<string, string> = {
    familiar: 'Familiar',
    prestador: 'Prestador',
    acao_social: 'Ação Social',
    visita_geral: 'Visita Geral',
    voluntario: 'Voluntário',
    diretoria: 'Diretoria',
    outro: 'Outro',
  };

  const tableData = persons.map((p) => {
    const idosoVinculado = residents.find(r => r.id === p.idosoVinculado);
    return [
      p.nome,
      p.cpf,
      p.rg || '-',
      p.telefone,
      tipoLabels[p.tipo] || p.tipo,
      p.parentesco || '-',
      idosoVinculado?.nome || '-',
      idosoVinculado?.quarto || '-',
    ];
  });

  autoTable(doc, {
    startY,
    head: [['Nome', 'CPF', 'RG', 'Telefone', 'Tipo', 'Parentesco', 'Idoso Vinculado', 'Quarto']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  addFooter(doc);
  doc.save(`cadastro_visitantes_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function generateResidentsReportPDF(residents: Resident[], settings?: InstitutionSettings | null) {
  const doc = new jsPDF();
  const startY = addHeader(doc, 'Cadastro de Idosos Residentes', settings);

  const tableData = residents.map((r) => [
    r.nome,
    r.quarto,
    r.ativo ? 'Sim' : 'Não',
    r.autorizadoSaidaTemporaria ? 'Sim' : 'Não',
    r.horarioSaidaPermitido || '-',
    r.horarioRetornoPermitido || '-',
  ]);

  autoTable(doc, {
    startY,
    head: [['Nome', 'Quarto', 'Ativo', 'Saída Temp.', 'Horário Saída', 'Horário Retorno']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  addFooter(doc);
  doc.save(`cadastro_idosos_${new Date().toISOString().split('T')[0]}.pdf`);
}
