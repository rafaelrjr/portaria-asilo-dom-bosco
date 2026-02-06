import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getVisits, getResidents, saveVisit } from '@/lib/supabaseDb';
import { formatDate, getCurrentTime, getVisitPurposeLabel } from '@/lib/utils';
import { Visit, Resident } from '@/types';
import { History as HistoryIcon, Search, LogOut, Printer, Filter, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { printVisitorLabelDirect } from '@/components/visitors/VisitorLabel';
import { getLocalDataCounts, migrateLocalDataToBackend, type LocalDataCounts } from '@/lib/migrateLocalToBackend';

export default function History() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedResident, setSelectedResident] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [localCounts, setLocalCounts] = useState<LocalDataCounts | null>(null);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    loadData();
    loadLocalCounts();
  }, []);

  async function loadLocalCounts() {
    try {
      const counts = await getLocalDataCounts();
      setLocalCounts(counts);
    } catch {
      // ignore (e.g. indexedDB unavailable)
    }
  }

  async function loadData() {
    const visitsData = await getVisits();
    setVisits(visitsData.sort((a, b) => new Date(b.dataEntrada + 'T' + b.horaEntrada).getTime() - new Date(a.dataEntrada + 'T' + a.horaEntrada).getTime()));
    const residentsData = await getResidents();
    setResidents(residentsData.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
  }

  async function handleCheckout(visit: Visit) {
    const updatedVisit = { ...visit, horaSaida: getCurrentTime(), etiquetaDevolvida: true };
    await saveVisit(updatedVisit);
    loadData();
    toast.success(`${visit.pessoa?.nome} registrou saída`);
  }

  async function handlePrintLabel(visit: Visit) {
    await printVisitorLabelDirect(visit);
  }

  async function handleMigrateLocalData() {
    setMigrating(true);
    try {
      const result = await migrateLocalDataToBackend();
      toast.success(`Migração concluída: ${result.visits} visita(s) e ${result.residentExits} saída(s) temporária(s)`);
      await loadData();
      await loadLocalCounts();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao migrar dados locais');
    } finally {
      setMigrating(false);
    }
  }

  function clearFilters() { setSearchQuery(''); setStartDate(''); setEndDate(''); setSelectedResident(''); setStatusFilter('all'); }

  const filteredVisits = visits.filter((visit) => {
    if (searchQuery) { const q = searchQuery.toLowerCase(); if (!visit.pessoa?.nome.toLowerCase().includes(q) && !visit.pessoa?.cpf.includes(q)) return false; }
    if (startDate && visit.dataEntrada < startDate) return false;
    if (endDate && visit.dataEntrada > endDate) return false;
    if (selectedResident && selectedResident !== 'all' && visit.idosoId !== selectedResident) return false;
    if (statusFilter === 'active' && visit.horaSaida) return false;
    if (statusFilter === 'completed' && !visit.horaSaida) return false;
    return true;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div><h1 className="font-display text-3xl font-bold tracking-tight">Histórico de Visitas</h1><p className="text-muted-foreground">Consulte o histórico completo de visitas</p></div>

        {localCounts && localCounts.visits > 0 && visits.length === 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span>Dados locais encontrados</span>
                <Badge variant="secondary">{localCounts.visits} visita(s)</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                As visitas foram salvas no dispositivo e ainda não estão no backend. Migre para que apareçam no Histórico e nos Relatórios.
              </p>
              <Button onClick={handleMigrateLocalData} disabled={migrating} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${migrating ? 'animate-spin' : ''}`} />
                {migrating ? 'Migrando...' : 'Migrar agora'}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5 text-primary" />Filtros</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2"><Label>Buscar Visitante</Label><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Nome ou CPF..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div></div>
              <div className="space-y-2"><Label>Data Inicial</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Data Final</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Idoso</Label><Select value={selectedResident} onValueChange={setSelectedResident}><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{residents.map((r) => (<SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Status</Label><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="active">No local</SelectItem><SelectItem value="completed">Finalizadas</SelectItem></SelectContent></Select></div>
            </div>
            <div className="mt-4 flex justify-end"><Button variant="outline" onClick={clearFilters}>Limpar Filtros</Button></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><HistoryIcon className="h-5 w-5 text-primary" />Visitas<Badge variant="secondary">{filteredVisits.length}</Badge></CardTitle></CardHeader>
          <CardContent>
            {filteredVisits.length === 0 ? <p className="text-center text-muted-foreground py-8">Nenhuma visita encontrada</p> : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Visitante</TableHead><TableHead>Data</TableHead><TableHead>Entrada</TableHead><TableHead>Saída</TableHead><TableHead>Propósito</TableHead><TableHead>Destino/Detalhe</TableHead><TableHead>Observações</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredVisits.map((visit) => (
                      <TableRow key={visit.id}>
                        <TableCell className="font-medium">{visit.pessoa?.nome || 'N/A'}</TableCell>
                        <TableCell>{formatDate(visit.dataEntrada)}</TableCell>
                        <TableCell>{visit.horaEntrada}</TableCell>
                        <TableCell>{visit.horaSaida || '-'}</TableCell>
                        <TableCell><Badge variant="outline">{getVisitPurposeLabel(visit.proposito)}</Badge></TableCell>
                        <TableCell>{
                          visit.proposito === 'idoso_especifico' && visit.idoso
                            ? <span>{visit.idoso.nome} {visit.idoso.quarto && <span className="text-muted-foreground">(Q.{visit.idoso.quarto})</span>}</span>
                            : visit.proposito === 'reuniao' && visit.pessoaDepartamento
                              ? visit.pessoaDepartamento
                              : visit.proposito === 'acao_social' && visit.descricaoAcaoSocial
                                ? visit.descricaoAcaoSocial
                                : visit.proposito === 'acao_social'
                                  ? 'Ação Social'
                                  : visit.proposito === 'visita_religiosa'
                                    ? 'Visita Religiosa'
                                    : visit.proposito === 'psc'
                                      ? 'PSC'
                                      : visit.proposito === 'voluntariado'
                                        ? 'Voluntariado'
                                        : visit.proposito === 'prestacao_servico'
                                          ? 'Prestação de Serviço'
                                          : visit.proposito === 'visita_geral'
                                            ? 'Visita Geral'
                                            : '-'
                        }</TableCell>
                        <TableCell className="max-w-xs truncate" title={visit.observacoes || ''}>{visit.observacoes || '-'}</TableCell>
                        <TableCell>{visit.horaSaida ? <Badge variant="secondary">Finalizada</Badge> : <Badge variant="default" className="animate-pulse-soft">No local</Badge>}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handlePrintLabel(visit)}><Printer className="h-4 w-4" /></Button>
                            {!visit.horaSaida && <Button variant="ghost" size="icon" onClick={() => handleCheckout(visit)}><LogOut className="h-4 w-4 text-success" /></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

