import { useState, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { exportAllData, importAllData, getPersons, getResidents, getVisits, getVehicleTrips, getResidentExits } from '@/lib/storage';
import { downloadBackup, exportVisitsReport, exportVehicleTripsReport, exportResidentExitsReport, exportPersonsReport, exportResidentsReport } from '@/lib/exportUtils';
import { Download, Upload, Database, Users, Home, History, Truck, DoorOpen, FileDown } from 'lucide-react';
import { toast } from 'sonner';

export default function Backup() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  function handleExportBackup() {
    const data = exportAllData();
    downloadBackup(data);
    toast.success('Backup exportado com sucesso!');
  }

  function handleImportBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (importAllData(content)) {
        toast.success('Dados importados com sucesso!');
      } else {
        toast.error('Erro ao importar dados. Arquivo inválido.');
      }
      setImporting(false);
    };
    reader.readAsText(file);
  }

  const exports = [
    { label: 'Visitantes Cadastrados', icon: Users, action: () => exportPersonsReport(getPersons()) },
    { label: 'Idosos Residentes', icon: Home, action: () => exportResidentsReport(getResidents()) },
    { label: 'Histórico de Visitas', icon: History, action: () => exportVisitsReport(getVisits()) },
    { label: 'Viagens de Veículos', icon: Truck, action: () => exportVehicleTripsReport(getVehicleTrips()) },
    { label: 'Saídas Temporárias', icon: DoorOpen, action: () => exportResidentExitsReport(getResidentExits()) },
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
                <Button key={exp.label} variant="outline" onClick={exp.action} className="w-full justify-start gap-2">
                  <exp.icon className="h-4 w-4" /> {exp.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
