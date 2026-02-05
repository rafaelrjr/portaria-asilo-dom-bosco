import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getResidents, getWeekendExits, saveWeekendExit, deleteWeekendExit, getInstitutionSettings } from '@/lib/supabaseDb';
import { exportWeekendExitsReportExcel } from '@/lib/exportUtils';
import { generateWeekendExitsReportPDF } from '@/lib/pdfUtils';
import { Resident, WeekendExit } from '@/types';
import { formatDate, getCurrentDate, getCurrentTime, generateId } from '@/lib/utils';
import { Calendar, Plus, Clock, Edit, Trash2, RotateCcw, Search, Filter, FileText, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

const exitSchema = z.object({
  residentId: z.string().min(1, 'Selecione o idoso'),
  dataSaida: z.string().min(1, 'Data de saída é obrigatória'),
  horaSaida: z.string().min(1, 'Hora de saída é obrigatória'),
  dataRetornoPrevista: z.string().optional(),
  horaRetornoPrevista: z.string().optional(),
  acompanhante: z.string().min(2, 'Nome do acompanhante é obrigatório'),
  observacoes: z.string().optional(),
});

type ExitFormData = z.infer<typeof exitSchema>;

export default function WeekendExits() {
  const { canEdit, role } = useSupabaseAuth();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [exits, setExits] = useState<WeekendExit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedResident, setSelectedResident] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingExit, setEditingExit] = useState<WeekendExit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ExitFormData>({
    resolver: zodResolver(exitSchema),
    defaultValues: {
      dataSaida: getCurrentDate(),
      horaSaida: getCurrentTime(),
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [residentsData, exitsData] = await Promise.all([
        getResidents(),
        getWeekendExits(),
      ]);
      setResidents(residentsData.filter(r => r.ativo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      setExits(exitsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(data: ExitFormData) {
    try {
      const exit: WeekendExit = {
        id: editingExit?.id || generateId(),
        residentId: data.residentId,
        dataSaida: data.dataSaida,
        horaSaida: data.horaSaida,
        dataRetornoPrevista: data.dataRetornoPrevista || undefined,
        horaRetornoPrevista: data.horaRetornoPrevista || undefined,
        horaRetornoReal: editingExit?.horaRetornoReal,
        acompanhante: data.acompanhante,
        observacoes: data.observacoes,
        createdAt: editingExit?.createdAt || new Date().toISOString(),
      };

      await saveWeekendExit(exit);
      toast.success(editingExit ? 'Saída atualizada!' : 'Saída registrada com sucesso!');
      setShowNewForm(false);
      setEditingExit(null);
      reset();
      loadData();
    } catch (error) {
      console.error('Error saving exit:', error);
      toast.error('Erro ao salvar saída');
    }
  }

  async function handleRegisterReturn(exit: WeekendExit) {
    try {
      const updated: WeekendExit = {
        ...exit,
        horaRetornoReal: getCurrentTime(),
      };
      await saveWeekendExit(updated);
      toast.success('Retorno registrado!');
      loadData();
    } catch (error) {
      toast.error('Erro ao registrar retorno');
    }
  }

  async function handleDelete(exit: WeekendExit) {
    if (confirm(`Deseja realmente excluir o registro de saída de ${exit.resident?.nome}?`)) {
      try {
        await deleteWeekendExit(exit.id);
        toast.success('Registro excluído');
        loadData();
      } catch (error) {
        toast.error('Erro ao excluir registro');
      }
    }
  }

  function handleEdit(exit: WeekendExit) {
    setEditingExit(exit);
    setValue('residentId', exit.residentId);
    setValue('dataSaida', exit.dataSaida);
    setValue('horaSaida', exit.horaSaida);
    setValue('dataRetornoPrevista', exit.dataRetornoPrevista || '');
    setValue('horaRetornoPrevista', exit.horaRetornoPrevista || '');
    setValue('acompanhante', exit.acompanhante);
    setValue('observacoes', exit.observacoes || '');
    setShowNewForm(true);
  }

  function getExitStatus(exit: WeekendExit): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
    if (exit.horaRetornoReal) {
      return { label: 'Retornou', variant: 'default' };
    }
    
    const today = getCurrentDate();
    if (exit.dataRetornoPrevista && exit.dataRetornoPrevista < today) {
      return { label: 'Atrasado', variant: 'destructive' };
    }
    
    return { label: 'Fora', variant: 'secondary' };
  }

  const filteredExits = exits.filter((e) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!e.resident?.nome?.toLowerCase().includes(q) && 
          !e.acompanhante?.toLowerCase().includes(q)) {
        return false;
      }
    }
    // Date range filter
    if (startDate && e.dataSaida < startDate) return false;
    if (endDate && e.dataSaida > endDate) return false;
    // Resident filter
    if (selectedResident && selectedResident !== 'all' && e.residentId !== selectedResident) return false;
    // Status filter
    if (statusFilter === 'out' && e.horaRetornoReal) return false;
    if (statusFilter === 'returned' && !e.horaRetornoReal) return false;
    if (statusFilter === 'late') {
      const today = getCurrentDate();
      if (e.horaRetornoReal || !e.dataRetornoPrevista || e.dataRetornoPrevista >= today) return false;
    }
    return true;
  });

  function clearFilters() {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setSelectedResident('');
    setStatusFilter('all');
  }

  async function handleExportPDF() {
    setExporting(true);
    try {
      const settings = await getInstitutionSettings();
      if (filteredExits.length === 0) {
        toast.warning('Nenhum registro para exportar');
        return;
      }
      generateWeekendExitsReportPDF(filteredExits, settings);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
    } finally {
      setExporting(false);
    }
  }

  async function handleExportExcel() {
    setExporting(true);
    try {
      if (filteredExits.length === 0) {
        toast.warning('Nenhum registro para exportar');
        return;
      }
      await exportWeekendExitsReportExcel(filteredExits);
      toast.success('Excel gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar Excel');
    } finally {
      setExporting(false);
    }
  }

  // Visualizador can also create in this section
  const canCreate = role === 'admin' || role === 'operador' || role === 'visualizador';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Saídas de Final de Semana</h1>
            <p className="text-muted-foreground">Controle de saídas de idosos com familiares</p>
          </div>
          {canCreate && (
            <Button onClick={() => { setEditingExit(null); reset(); setShowNewForm(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Saída
            </Button>
          )}
        </div>

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Nome ou acompanhante..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Idoso</Label>
                <Select value={selectedResident} onValueChange={setSelectedResident}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {residents.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="out">Fora</SelectItem>
                    <SelectItem value="returned">Retornaram</SelectItem>
                    <SelectItem value="late">Atrasados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-between gap-2">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportPDF} disabled={exporting} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Exportar PDF
                </Button>
                <Button variant="outline" onClick={handleExportExcel} disabled={exporting} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar Excel
                </Button>
              </div>
              <Button variant="outline" onClick={clearFilters}>Limpar Filtros</Button>
            </div>
          </CardContent>
        </Card>

        {/* Records Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Registro de Saídas
              <Badge variant="secondary">{filteredExits.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredExits.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum registro encontrado</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Idoso</TableHead>
                      <TableHead>Data/Hora Saída</TableHead>
                      <TableHead>Retorno Previsto</TableHead>
                      <TableHead>Acompanhante</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExits.map((exit) => {
                      const status = getExitStatus(exit);
                      return (
                        <TableRow key={exit.id}>
                          <TableCell className="font-medium">
                            {exit.resident?.nome || 'Desconhecido'}
                            {exit.resident?.quarto && (
                              <span className="text-muted-foreground text-sm"> (Q.{exit.resident.quarto})</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {formatDate(exit.dataSaida)} às {exit.horaSaida}
                          </TableCell>
                          <TableCell>
                            {exit.dataRetornoPrevista ? (
                              <>
                                {formatDate(exit.dataRetornoPrevista)}
                                {exit.horaRetornoPrevista && ` às ${exit.horaRetornoPrevista}`}
                              </>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{exit.acompanhante}</TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                            {exit.horaRetornoReal && (
                              <span className="text-xs text-muted-foreground ml-2">
                                às {exit.horaRetornoReal}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {!exit.horaRetornoReal && canEdit && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRegisterReturn(exit)}
                                  className="gap-1"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Retornou
                                </Button>
                              )}
                              {canEdit && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(exit)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(exit)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={showNewForm} onOpenChange={(open) => { 
        if (!open) { 
          setShowNewForm(false); 
          setEditingExit(null); 
          reset(); 
        } 
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {editingExit ? 'Editar Saída' : 'Registrar Saída de Final de Semana'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Idoso *</Label>
              <Select value={watch('residentId') || ''} onValueChange={(value) => setValue('residentId', value)}>
                <SelectTrigger className={errors.residentId ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione o idoso" />
                </SelectTrigger>
                <SelectContent>
                  {residents.map((resident) => (
                    <SelectItem key={resident.id} value={resident.id}>
                      {resident.nome} {resident.quarto ? `- Quarto ${resident.quarto}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.residentId && <p className="text-sm text-destructive">{errors.residentId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataSaida">Data de Saída *</Label>
                <Input
                  id="dataSaida"
                  type="date"
                  {...register('dataSaida')}
                  className={errors.dataSaida ? 'border-destructive' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horaSaida">Hora de Saída *</Label>
                <Input
                  id="horaSaida"
                  type="time"
                  {...register('horaSaida')}
                  className={errors.horaSaida ? 'border-destructive' : ''}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataRetornoPrevista">Data Retorno Previsto</Label>
                <Input
                  id="dataRetornoPrevista"
                  type="date"
                  {...register('dataRetornoPrevista')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horaRetornoPrevista">Hora Retorno Previsto</Label>
                <Input
                  id="horaRetornoPrevista"
                  type="time"
                  {...register('horaRetornoPrevista')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="acompanhante">Acompanhante *</Label>
              <Input
                id="acompanhante"
                placeholder="Nome da pessoa que acompanhará o idoso"
                {...register('acompanhante')}
                className={errors.acompanhante ? 'border-destructive' : ''}
              />
              {errors.acompanhante && <p className="text-sm text-destructive">{errors.acompanhante.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Observações adicionais..."
                rows={3}
                {...register('observacoes')}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowNewForm(false); setEditingExit(null); reset(); }}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2">
                <Clock className="h-4 w-4" />
                {editingExit ? 'Salvar Alterações' : 'Registrar Saída'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
