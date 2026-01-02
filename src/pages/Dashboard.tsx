import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { StatCard } from '@/components/dashboard/StatCard';
import { ActiveVisitorsList } from '@/components/dashboard/ActiveVisitorsList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getActiveVisits, getVisitsByDate, getVisitsByPeriod, getVisitsByResident, getResidents, initializeSampleData } from '@/lib/db';
import { getCurrentDate, formatDate } from '@/lib/utils';
import { Users, UserCheck, Calendar, TrendingUp, Search } from 'lucide-react';
import { Resident } from '@/types';

export default function Dashboard() {
  const [visitantesHoje, setVisitantesHoje] = useState(0);
  const [visitantesNoLocal, setVisitantesNoLocal] = useState(0);
  const [visitasSemana, setVisitasSemana] = useState(0);
  const [visitasMes, setVisitasMes] = useState(0);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredVisitsCount, setFilteredVisitsCount] = useState<number | null>(null);

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

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Sistema de controle de visitantes</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Visitantes Hoje" value={visitantesHoje} icon={<Users className="h-6 w-6" />} description={formatDate(getCurrentDate())} variant="primary" />
          <StatCard title="No Local Agora" value={visitantesNoLocal} icon={<UserCheck className="h-6 w-6" />} description="Atualizado em tempo real" variant="success" />
          <StatCard title="Visitas na Semana" value={visitasSemana} icon={<Calendar className="h-6 w-6" />} description="Últimos 7 dias" variant="secondary" />
          <StatCard title="Visitas no Mês" value={visitasMes} icon={<TrendingUp className="h-6 w-6" />} description="Últimos 30 dias" variant="accent" />
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
    </Layout>
  );
}
