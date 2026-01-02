import { useState, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { exportAllData, importAllData, getPersons, getResidents, getVisits, getVehicleTrips, getResidentExits, getInstitutionSettings } from '@/lib/db';
import { downloadBackup, exportVisitsReport, exportVehicleTripsReport, exportResidentExitsReport, exportPersonsReport, exportResidentsReport } from '@/lib/exportUtils';
import { generateVisitsReportPDF, generateVehicleTripsReportPDF, generateResidentExitsReportPDF, generatePersonsReportPDF, generateResidentsReportPDF } from '@/lib/pdfUtils';
import { Download, Upload, Database, Users, Home, History, Truck, DoorOpen, FileDown, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { InstitutionSettings } from '@/types';

export default function Backup() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  async function handleExportBackup() {
    const data = await exportAllData();
    downloadBackup(data);
    toast.success('Backup exportado com sucesso!');
  }

  function handleImportBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (await importAllData(content)) {
        toast.success('Dados importados com sucesso!');
      } else {
        toast.error('Erro ao importar dados. Arquivo inválido.');
      }
      setImporting(false);
    };
    reader.readAsText(file);
  }

  async function handleExportPersons() {
    const persons = await getPersons();
    exportPersonsReport(persons);
  }

  async function handleExportPersonsPDF() {
    const [persons, settings] = await Promise.all([getPersons(), getInstitutionSettings()]);
    generatePersonsReportPDF(persons, settings);
    toast.success('Relatório PDF gerado com sucesso!');
  }

  async function handleExportResidents() {
    const residents = await getResidents();
    exportResidentsReport(residents);
  }

  async function handleExportResidentsPDF() {
    const [residents, settings] = await Promise.all([getResidents(), getInstitutionSettings()]);
    generateResidentsReportPDF(residents, settings);
    toast.success('Relatório PDF gerado com sucesso!');
  }

  async function handleExportVisits() {
    const visits = await getVisits();
    exportVisitsReport(visits);
  }

  async function handleExportVisitsPDF() {
    const [visits, settings] = await Promise.all([getVisits(), getInstitutionSettings()]);
    generateVisitsReportPDF(visits, settings);
    toast.success('Relatório PDF gerado com sucesso!');
  }

  async function handleExportVehicleTrips() {
    const trips = await getVehicleTrips();
    exportVehicleTripsReport(trips);
  }

  async function handleExportVehicleTripsPDF() {
    const [trips, settings] = await Promise.all([getVehicleTrips(), getInstitutionSettings()]);
    generateVehicleTripsReportPDF(trips, settings);
    toast.success('Relatório PDF gerado com sucesso!');
  }

  async function handleExportResidentExits() {
    const exits = await getResidentExits();
    exportResidentExitsReport(exits);
  }

  async function handleExportResidentExitsPDF() {
    const [exits, settings] = await Promise.all([getResidentExits(), getInstitutionSettings()]);
    generateResidentExitsReportPDF(exits, settings);
    toast.success('Relatório PDF gerado com sucesso!');
  }

  const exports = [
    { label: 'Visitantes Cadastrados', icon: Users, actionCSV: handleExportPersons, actionPDF: handleExportPersonsPDF },
    { label: 'Idosos Residentes', icon: Home, actionCSV: handleExportResidents, actionPDF: handleExportResidentsPDF },
    { label: 'Histórico de Visitas', icon: History, actionCSV: handleExportVisits, actionPDF: handleExportVisitsPDF },
    { label: 'Viagens de Veículos', icon: Truck, actionCSV: handleExportVehicleTrips, actionPDF: handleExportVehicleTripsPDF },
    { label: 'Saídas Temporárias', icon: DoorOpen, actionCSV: handleExportResidentExits, actionPDF: handleExportResidentExitsPDF },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Backup e Exportação</h1>
          <p className="text-muted-foreground">Faça backup dos dados e exporte relatórios</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Backup Completo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Exporte ou importe todos os dados do sistema em formato JSON.</p>
              <div className="flex gap-3">
                <Button onClick={handleExportBackup} className="flex-1 gap-2"><Download className="h-4 w-4" /> Exportar Backup</Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing} className="flex-1 gap-2"><Upload className="h-4 w-4" /> Importar Backup</Button>
                <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileDown className="h-5 w-5 text-primary" /> Exportar Relatórios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {exports.map((exp) => (
                <div key={exp.label} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 text-sm font-medium">
                    <exp.icon className="h-4 w-4 text-muted-foreground" />
                    {exp.label}
                  </div>
                  <Button variant="outline" size="sm" onClick={exp.actionCSV} className="gap-1">
                    <FileDown className="h-3 w-3" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={exp.actionPDF} className="gap-1">
                    <FileText className="h-3 w-3" /> PDF
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
