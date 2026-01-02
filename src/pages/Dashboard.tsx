import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { StatCard } from '@/components/dashboard/StatCard';
import { ActiveVisitorsList } from '@/components/dashboard/ActiveVisitorsList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getActiveVisits, getVisitsByDate, getVisitsByPeriod, getVisitsByResident, getResidents, initializeSampleData, getActiveResidentExits } from '@/lib/db';
import { getCurrentDate, formatDate } from '@/lib/utils';
import { Users, UserCheck, Calendar, TrendingUp, Search, Home, Clock } from 'lucide-react';
import { Resident, ResidentExit } from '@/types';

export default function Dashboard() {
  const [visitantesHoje, setVisitantesHoje] = useState(0);
  const [visitantesNoLocal, setVisitantesNoLocal] = useState(0);
  const [visitasSemana, setVisitasSemana] = useState(0);
  const [visitasMes, setVisitasMes] = useState(0);
  const [idososFora, setIdososFora] = useState(0);
  const [activeExits, setActiveExits] = useState<ResidentExit[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredVisitsCount, setFilteredVisitsCount] = useState<number | null>(null);
  const [showIdososForaDialog, setShowIdososForaDialog] = useState(false);

  useEffect(() => {
    async function init() {
      await initializeSampleData();
      await loadStats();
      const res = await getResidents();
      setResidents(res.filter(r => r.ativo));
    }
    init();
  }, []);

  async function loadStats() {
    const today = getCurrentDate();
    const todayVisits = await getVisitsByDate(today);
    setVisitantesHoje(todayVisits.length);
    const activeVisits = await getActiveVisits();
    setVisitantesNoLocal(activeVisits.length);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekVisits = await getVisitsByPeriod(weekAgo.toISOString().split('T')[0], today);
    setVisitasSemana(weekVisits.length);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthVisits = await getVisitsByPeriod(monthAgo.toISOString().split('T')[0], today);
    setVisitasMes(monthVisits.length);
    
    // Carregar idosos em saída temporária
    const exits = await getActiveResidentExits();
    setIdososFora(exits.length);
    setActiveExits(exits);
  }

  async function handleSearch() {
    if (selectedResident && startDate && endDate) {
      const visits = await getVisitsByResident(selectedResident, startDate, endDate);
      setFilteredVisitsCount(visits.length);
    } else if (startDate && endDate) {
      const visits = await getVisitsByPeriod(startDate, endDate);
      setFilteredVisitsCount(visits.length);
    }
  }

  function clearFilters() {
    setSelectedResident('');
    setStartDate('');
    setEndDate('');
    setFilteredVisitsCount(null);
  }

  function handleIdososForaClick() {
    if (idososFora > 0) {
      setShowIdososForaDialog(true);
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Sistema de controle de visitantes</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard title="Visitantes Hoje" value={visitantesHoje} icon={<Users className="h-6 w-6" />} description={formatDate(getCurrentDate())} variant="primary" />
          <StatCard title="No Local Agora" value={visitantesNoLocal} icon={<UserCheck className="h-6 w-6" />} description="Atualizado em tempo real" variant="success" />
          <StatCard title="Visitas na Semana" value={visitasSemana} icon={<Calendar className="h-6 w-6" />} description="Últimos 7 dias" variant="secondary" />
          <StatCard title="Visitas no Mês" value={visitasMes} icon={<TrendingUp className="h-6 w-6" />} description="Últimos 30 dias" variant="accent" />
          <div onClick={handleIdososForaClick} className={idososFora > 0 ? 'cursor-pointer' : ''}>
            <StatCard 
              title="Idosos em Saída" 
              value={idososFora} 
              icon={<Home className="h-6 w-6" />} 
              description={idososFora > 0 ? "Clique para ver detalhes" : "Nenhum no momento"} 
              variant="warning" 
            />
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-primary" />Consultar Visitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Idoso</Label>
                <Select value={selectedResident} onValueChange={setSelectedResident}>
                  <SelectTrigger><SelectValue placeholder="Todos os idosos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os idosos</SelectItem>
                    {residents.map((r) => (<SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Data Inicial</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Data Final</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
              <div className="flex items-end gap-2"><Button onClick={handleSearch} className="flex-1">Consultar</Button><Button variant="outline" onClick={clearFilters}>Limpar</Button></div>
            </div>
            {filteredVisitsCount !== null && (
              <div className="mt-4 rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-2xl font-bold text-primary">{filteredVisitsCount}</p>
                <p className="text-sm text-muted-foreground">visitas encontradas</p>
              </div>
            )}
          </CardContent>
        </Card>
        <ActiveVisitorsList />
      </div>

      {/* Dialog para mostrar idosos em saída */}
      <Dialog open={showIdososForaDialog} onOpenChange={setShowIdososForaDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-warning" />
              Idosos em Saída Temporária
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-auto">
            {activeExits.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum idoso em saída temporária no momento.
              </p>
            ) : (
              activeExits.map((exit) => (
                <div key={exit.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    {exit.resident?.foto ? (
                      <img 
                        src={exit.resident.foto} 
                        alt={exit.resident?.nome} 
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center">
                        <Home className="h-6 w-6 text-warning" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{exit.resident?.nome || 'Idoso não encontrado'}</p>
                      {exit.resident?.quarto && (
                        <p className="text-sm text-muted-foreground">Quarto: {exit.resident.quarto}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Saída: {exit.horaSaida}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Retorno previsto: {exit.horaRetornoPrevista}
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Motivo:</span> {exit.motivoSaida}
                  </div>
                  {exit.acompanhante && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Acompanhante:</span> {exit.acompanhante}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
