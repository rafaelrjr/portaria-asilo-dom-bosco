import { useState, useRef, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  exportAllData, importAllData, getPersons, getResidents, getVisits, getVehicleTrips, 
  getResidentExits, getInstitutionSettings, getVehicles, listBackups, deleteBackup, 
  restoreBackup, getBackupSettings, saveBackupSettings, Backup as BackupType 
} from '@/lib/db';
import { downloadBackup, exportVisitsReport, exportVehicleTripsReport, exportResidentExitsReport, exportPersonsReport, exportResidentsReport } from '@/lib/exportUtils';
import { generateVisitsReportPDF, generateVehicleTripsReportPDF, generateResidentExitsReportPDF, generatePersonsReportPDF, generateResidentsReportPDF } from '@/lib/pdfUtils';
import { Download, Upload, Database, Users, Home, History, Truck, DoorOpen, FileDown, FileText, Filter, ChevronUp, Clock, Trash2, RotateCcw, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { VisitorType, VisitPurpose, Vehicle } from '@/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const VISITOR_TYPES: { value: VisitorType | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'familiar', label: 'Familiar' },
  { value: 'prestador', label: 'Prestador de Serviço' },
  { value: 'acao_social', label: 'Ação Social' },
  { value: 'visita_geral', label: 'Visita Geral' },
  { value: 'voluntario', label: 'Voluntário' },
  { value: 'diretoria', label: 'Diretoria' },
  { value: 'outro', label: 'Outro' },
];

const VISIT_PURPOSES: { value: VisitPurpose | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os propósitos' },
  { value: 'idoso_especifico', label: 'Visita a Idoso Específico' },
  { value: 'acao_social', label: 'Ação Social' },
  { value: 'visita_geral', label: 'Visita Geral' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'prestacao_servico', label: 'Prestação de Serviço' },
];

export default function Backup() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  
  // Filtros para visitas
  const [visitDateStart, setVisitDateStart] = useState('');
  const [visitDateEnd, setVisitDateEnd] = useState('');
  const [visitPurpose, setVisitPurpose] = useState<VisitPurpose | 'all'>('all');
  const [showVisitFilters, setShowVisitFilters] = useState(false);
  
  // Filtros para veículos
  const [tripDateStart, setTripDateStart] = useState('');
  const [tripDateEnd, setTripDateEnd] = useState('');
  const [tripVehicleId, setTripVehicleId] = useState<string>('all');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showTripFilters, setShowTripFilters] = useState(false);
  
  // Filtros para saídas de idosos
  const [exitDateStart, setExitDateStart] = useState('');
  const [exitDateEnd, setExitDateEnd] = useState('');
  const [showExitFilters, setShowExitFilters] = useState(false);
  
  // Filtros para visitantes cadastrados
  const [personType, setPersonType] = useState<VisitorType | 'all'>('all');
  const [showPersonFilters, setShowPersonFilters] = useState(false);

  // Backup automático
  const [backups, setBackups] = useState<BackupType[]>([]);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [backupInterval, setBackupInterval] = useState(30);
  const [backupRetention, setBackupRetention] = useState(20);
  const [loadingBackups, setLoadingBackups] = useState(false);

  useEffect(() => {
    loadBackups();
    loadBackupSettings();
  }, []);

  async function loadBackups() {
    setLoadingBackups(true);
    const list = await listBackups();
    setBackups(list);
    setLoadingBackups(false);
  }

  async function loadBackupSettings() {
    const settings = await getBackupSettings();
    setAutoBackupEnabled(settings.enabled);
    setBackupInterval(settings.intervalMinutes);
    setBackupRetention(settings.retention);
  }

  async function handleSaveBackupSettings() {
    await saveBackupSettings({
      enabled: autoBackupEnabled,
      intervalMinutes: backupInterval,
      retention: backupRetention,
    });
    toast.success('Configurações de backup salvas!');
  }

  // Carregar veículos para filtro
  async function loadVehicles() {
    if (vehicles.length === 0) {
      const vehs = await getVehicles();
      setVehicles(vehs);
    }
  }

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
    let [persons, residents] = await Promise.all([getPersons(), getResidents()]);
    if (personType !== 'all') {
      persons = persons.filter(p => p.tipo === personType);
    }
    if (persons.length === 0) {
      toast.warning('Nenhum registro encontrado com os filtros aplicados');
      return;
    }
    toast.info(`Exportando ${persons.length} registros...`);
    exportPersonsReport(persons, residents);
  }

  async function handleExportPersonsPDF() {
    let [persons, residents, settings] = await Promise.all([getPersons(), getResidents(), getInstitutionSettings()]);
    if (personType !== 'all') {
      persons = persons.filter(p => p.tipo === personType);
    }
    if (persons.length === 0) {
      toast.warning('Nenhum registro encontrado com os filtros aplicados');
      return;
    }
    toast.info(`Exportando ${persons.length} registros...`);
    generatePersonsReportPDF(persons, residents, settings);
    toast.success('Relatório PDF gerado com sucesso!');
  }

  async function handleExportResidents() {
    const residents = await getResidents();
    if (residents.length === 0) {
      toast.warning('Nenhum registro encontrado');
      return;
    }
    toast.info(`Exportando ${residents.length} registros...`);
    exportResidentsReport(residents);
  }

  async function handleExportResidentsPDF() {
    const [residents, settings] = await Promise.all([getResidents(), getInstitutionSettings()]);
    if (residents.length === 0) {
      toast.warning('Nenhum registro encontrado');
      return;
    }
    toast.info(`Exportando ${residents.length} registros...`);
    generateResidentsReportPDF(residents, settings);
    toast.success('Relatório PDF gerado com sucesso!');
  }

  async function handleExportVisits() {
    let visits = await getVisits();
    if (visitDateStart) visits = visits.filter(v => v.dataEntrada >= visitDateStart);
    if (visitDateEnd) visits = visits.filter(v => v.dataEntrada <= visitDateEnd);
    if (visitPurpose !== 'all') visits = visits.filter(v => v.proposito === visitPurpose);
    if (visits.length === 0) {
      toast.warning('Nenhum registro encontrado com os filtros aplicados');
      return;
    }
    toast.info(`Exportando ${visits.length} registros...`);
    exportVisitsReport(visits);
  }

  async function handleExportVisitsPDF() {
    let [visits, settings] = await Promise.all([getVisits(), getInstitutionSettings()]);
    if (visitDateStart) visits = visits.filter(v => v.dataEntrada >= visitDateStart);
    if (visitDateEnd) visits = visits.filter(v => v.dataEntrada <= visitDateEnd);
    if (visitPurpose !== 'all') visits = visits.filter(v => v.proposito === visitPurpose);
    if (visits.length === 0) {
      toast.warning('Nenhum registro encontrado com os filtros aplicados');
      return;
    }
    toast.info(`Exportando ${visits.length} registros...`);
    generateVisitsReportPDF(visits, settings);
    toast.success('Relatório PDF gerado com sucesso!');
  }

  async function handleExportVehicleTrips() {
    let trips = await getVehicleTrips();
    if (tripDateStart) trips = trips.filter(t => t.dataSaida >= tripDateStart);
    if (tripDateEnd) trips = trips.filter(t => t.dataSaida <= tripDateEnd);
    if (tripVehicleId !== 'all') trips = trips.filter(t => t.vehicleId === tripVehicleId);
    if (trips.length === 0) {
      toast.warning('Nenhum registro encontrado com os filtros aplicados');
      return;
    }
    toast.info(`Exportando ${trips.length} registros...`);
    exportVehicleTripsReport(trips);
  }

  async function handleExportVehicleTripsPDF() {
    let [trips, settings] = await Promise.all([getVehicleTrips(), getInstitutionSettings()]);
    if (tripDateStart) trips = trips.filter(t => t.dataSaida >= tripDateStart);
    if (tripDateEnd) trips = trips.filter(t => t.dataSaida <= tripDateEnd);
    if (tripVehicleId !== 'all') trips = trips.filter(t => t.vehicleId === tripVehicleId);
    if (trips.length === 0) {
      toast.warning('Nenhum registro encontrado com os filtros aplicados');
      return;
    }
    toast.info(`Exportando ${trips.length} registros...`);
    generateVehicleTripsReportPDF(trips, settings);
    toast.success('Relatório PDF gerado com sucesso!');
  }

  async function handleExportResidentExits() {
    let exits = await getResidentExits();
    if (exitDateStart) exits = exits.filter(e => e.dataSaida >= exitDateStart);
    if (exitDateEnd) exits = exits.filter(e => e.dataSaida <= exitDateEnd);
    if (exits.length === 0) {
      toast.warning('Nenhum registro encontrado com os filtros aplicados');
      return;
    }
    toast.info(`Exportando ${exits.length} registros...`);
    exportResidentExitsReport(exits);
  }

  async function handleExportResidentExitsPDF() {
    let [exits, settings] = await Promise.all([getResidentExits(), getInstitutionSettings()]);
    if (exitDateStart) exits = exits.filter(e => e.dataSaida >= exitDateStart);
    if (exitDateEnd) exits = exits.filter(e => e.dataSaida <= exitDateEnd);
    if (exits.length === 0) {
      toast.warning('Nenhum registro encontrado com os filtros aplicados');
      return;
    }
    toast.info(`Exportando ${exits.length} registros...`);
    generateResidentExitsReportPDF(exits, settings);
    toast.success('Relatório PDF gerado com sucesso!');
  }

  function clearVisitFilters() {
    setVisitDateStart('');
    setVisitDateEnd('');
    setVisitPurpose('all');
  }

  function clearTripFilters() {
    setTripDateStart('');
    setTripDateEnd('');
    setTripVehicleId('all');
  }

  function clearExitFilters() {
    setExitDateStart('');
    setExitDateEnd('');
  }

  function clearPersonFilters() {
    setPersonType('all');
  }

  async function handleDeleteBackup(id: string) {
    await deleteBackup(id);
    toast.success('Backup excluído!');
    loadBackups();
  }

  async function handleRestoreBackup(id: string) {
    const success = await restoreBackup(id);
    if (success) {
      toast.success('Backup restaurado com sucesso!');
    } else {
      toast.error('Erro ao restaurar backup');
    }
  }

  function handleDownloadBackup(backup: BackupType) {
    const blob = new Blob([backup.data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${format(new Date(backup.createdAt), 'yyyy-MM-dd-HH-mm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

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
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Backup Automático</CardTitle>
              <CardDescription>Configure o backup automático dos dados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-backup">Backup automático</Label>
                <Switch id="auto-backup" checked={autoBackupEnabled} onCheckedChange={setAutoBackupEnabled} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Intervalo (minutos)</Label>
                  <Input type="number" min={5} max={1440} value={backupInterval} onChange={(e) => setBackupInterval(Number(e.target.value))} className="h-8" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Manter últimos</Label>
                  <Input type="number" min={5} max={100} value={backupRetention} onChange={(e) => setBackupRetention(Number(e.target.value))} className="h-8" />
                </div>
              </div>
              <Button onClick={handleSaveBackupSettings} className="w-full" variant="outline">Salvar Configurações</Button>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Backups Automáticos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Backups Salvos</CardTitle>
              <Button variant="ghost" size="icon" onClick={loadBackups} disabled={loadingBackups}>
                <RefreshCw className={`h-4 w-4 ${loadingBackups ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {backups.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhum backup automático salvo</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {backups.map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">
                        {format(new Date(backup.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {backup.type === 'auto' ? 'Automático' : 'Manual'} • {formatBytes(backup.size)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadBackup(backup)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Restaurar Backup?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Isso substituirá todos os dados atuais pelos dados deste backup. Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRestoreBackup(backup.id)}>Restaurar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteBackup(backup.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Relatórios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileDown className="h-5 w-5 text-primary" /> Exportar Relatórios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Visitantes Cadastrados */}
            <Collapsible open={showPersonFilters} onOpenChange={setShowPersonFilters}>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 text-sm font-medium">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Visitantes Cadastrados
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    {showPersonFilters ? <ChevronUp className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <Button variant="outline" size="sm" onClick={handleExportPersons} className="gap-1">
                  <FileDown className="h-3 w-3" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPersonsPDF} className="gap-1">
                  <FileText className="h-3 w-3" /> PDF
                </Button>
              </div>
              <CollapsibleContent className="mt-2 pl-6 space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Tipo de Visitante</Label>
                    <Select value={personType} onValueChange={(v) => setPersonType(v as VisitorType | 'all')}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        {VISITOR_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearPersonFilters}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Idosos Residentes */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1 text-sm font-medium">
                <Home className="h-4 w-4 text-muted-foreground" />
                Idosos Residentes
              </div>
              <Button variant="outline" size="sm" onClick={handleExportResidents} className="gap-1">
                <FileDown className="h-3 w-3" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportResidentsPDF} className="gap-1">
                <FileText className="h-3 w-3" /> PDF
              </Button>
            </div>

            {/* Histórico de Visitas */}
            <Collapsible open={showVisitFilters} onOpenChange={setShowVisitFilters}>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 text-sm font-medium">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Histórico de Visitas
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    {showVisitFilters ? <ChevronUp className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <Button variant="outline" size="sm" onClick={handleExportVisits} className="gap-1">
                  <FileDown className="h-3 w-3" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportVisitsPDF} className="gap-1">
                  <FileText className="h-3 w-3" /> PDF
                </Button>
              </div>
              <CollapsibleContent className="mt-2 pl-6 space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Data Início</Label>
                      <Input type="date" className="h-8 text-xs" value={visitDateStart} onChange={(e) => setVisitDateStart(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Data Fim</Label>
                      <Input type="date" className="h-8 text-xs" value={visitDateEnd} onChange={(e) => setVisitDateEnd(e.target.value)} />
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearVisitFilters}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Propósito</Label>
                  <Select value={visitPurpose} onValueChange={(v) => setVisitPurpose(v as VisitPurpose | 'all')}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todos os propósitos" />
                    </SelectTrigger>
                    <SelectContent>
                      {VISIT_PURPOSES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Viagens de Veículos */}
            <Collapsible open={showTripFilters} onOpenChange={(open) => { setShowTripFilters(open); if (open) loadVehicles(); }}>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 text-sm font-medium">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  Viagens de Veículos
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    {showTripFilters ? <ChevronUp className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <Button variant="outline" size="sm" onClick={handleExportVehicleTrips} className="gap-1">
                  <FileDown className="h-3 w-3" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportVehicleTripsPDF} className="gap-1">
                  <FileText className="h-3 w-3" /> PDF
                </Button>
              </div>
              <CollapsibleContent className="mt-2 pl-6 space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Data Início</Label>
                      <Input type="date" className="h-8 text-xs" value={tripDateStart} onChange={(e) => setTripDateStart(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Data Fim</Label>
                      <Input type="date" className="h-8 text-xs" value={tripDateEnd} onChange={(e) => setTripDateEnd(e.target.value)} />
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearTripFilters}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Veículo</Label>
                  <Select value={tripVehicleId} onValueChange={setTripVehicleId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todos os veículos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os veículos</SelectItem>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.marca} {v.modelo} - {v.placa}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Saídas Temporárias */}
            <Collapsible open={showExitFilters} onOpenChange={setShowExitFilters}>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 text-sm font-medium">
                  <DoorOpen className="h-4 w-4 text-muted-foreground" />
                  Saídas Temporárias
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    {showExitFilters ? <ChevronUp className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <Button variant="outline" size="sm" onClick={handleExportResidentExits} className="gap-1">
                  <FileDown className="h-3 w-3" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportResidentExitsPDF} className="gap-1">
                  <FileText className="h-3 w-3" /> PDF
                </Button>
              </div>
              <CollapsibleContent className="mt-2 pl-6 space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Data Início</Label>
                      <Input type="date" className="h-8 text-xs" value={exitDateStart} onChange={(e) => setExitDateStart(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Data Fim</Label>
                      <Input type="date" className="h-8 text-xs" value={exitDateEnd} onChange={(e) => setExitDateEnd(e.target.value)} />
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearExitFilters}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
