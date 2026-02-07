import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Person, Visit, VisitPurpose, Resident, InstitutionSettings } from '@/types';
import { searchPersons, getResidents, saveVisit, getActiveVisits, getInstitutionSettings } from '@/lib/supabaseDb';
import { getCurrentDate, getCurrentTime, generateId } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DoorOpen, Search, User, Printer, AlertTriangle } from 'lucide-react';
import { PersonForm } from './PersonForm';
import { printVisitorLabelDirect } from '@/components/visitors/VisitorLabel';

const entrySchema = z.object({
  proposito: z.string(),
  idosoId: z.string().optional(),
  descricaoAcaoSocial: z.string().optional(),
  pessoaDepartamento: z.string().optional(),
  observacoes: z.string().optional(),
});

type EntryFormData = z.infer<typeof entrySchema>;

export function EntryForm() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showNewPersonForm, setShowNewPersonForm] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [institutionSettings, setInstitutionSettings] = useState<InstitutionSettings | null>(null);
  const [showJustificationDialog, setShowJustificationDialog] = useState(false);
  const [justification, setJustification] = useState('');
  const [pendingSubmitData, setPendingSubmitData] = useState<EntryFormData | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: { proposito: 'idoso_especifico' },
  });

  const proposito = watch('proposito');

  useEffect(() => {
    async function load() {
      const [res, settings] = await Promise.all([
        getResidents(),
        getInstitutionSettings(),
      ]);
      const filtered = res.filter(r => r.ativo);
      setResidents(filtered.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      setInstitutionSettings(settings);
    }
    load();
  }, []);

  async function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length >= 2) {
      const results = await searchPersons(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }

  function handleSelectPerson(person: Person) {
    setSelectedPerson(person);
    setSearchQuery('');
    setSearchResults([]);
    if (person.idosoVinculado) {
      setValue('idosoId', person.idosoVinculado);
    }
  }

  function handleNewPersonCreated(person: Person) {
    setSelectedPerson(person);
    setShowNewPersonForm(false);
    toast.success('Pessoa cadastrada! Agora registre a entrada.');
  }

  // Get applicable visiting hours based on visitor special hours and infirmary rules
  function getApplicableVisitingHours(idosoId?: string): { inicio: string; fim: string } {
    // 1. If visitor has special hours, use those (highest priority)
    if (selectedPerson?.horarioEspecial) {
      return {
        inicio: selectedPerson.horarioEspecialInicio || '08:00',
        fim: selectedPerson.horarioEspecialFim || '17:00',
      };
    }
    
    // 2. If selected resident is in infirmary, use infirmary hours
    const selectedResident = residents.find(r => r.id === idosoId);
    if (selectedResident?.quarto?.toLowerCase() === 'enfermaria') {
      return {
        inicio: institutionSettings?.horarioEnfermariaInicio || '14:30',
        fim: institutionSettings?.horarioEnfermariaFim || '16:00',
      };
    }
    
    // 3. Use normal institution hours
    return {
      inicio: institutionSettings?.horarioVisitaInicio || '08:00',
      fim: institutionSettings?.horarioVisitaFim || '17:00',
    };
  }

  function isOutsideVisitingHours(idosoId?: string): boolean {
    if (!institutionSettings) return false;
    
    const currentTime = getCurrentTime();
    const { inicio, fim } = getApplicableVisitingHours(idosoId);
    
    return currentTime < inicio || currentTime > fim;
  }

  async function onSubmit(data: EntryFormData) {
    if (!selectedPerson) {
      toast.error('Selecione uma pessoa para registrar a entrada');
      return;
    }

    // Skip justification for purposes that don't require it
    const exemptPurposes = ['prestacao_servico', 'psc', 'voluntariado', 'reuniao'];
    if (!exemptPurposes.includes(data.proposito) && isOutsideVisitingHours(data.idosoId)) {
      setPendingSubmitData(data);
      setShowJustificationDialog(true);
      return;
    }

    await processSubmit(data);
  }

  async function handleJustificationSubmit() {
    if (!justification.trim()) {
      toast.error('Justificativa é obrigatória para entrada fora do horário');
      return;
    }
    
    if (pendingSubmitData) {
      await processSubmit({
        ...pendingSubmitData,
        observacoes: `[FORA DO HORÁRIO] ${justification}${pendingSubmitData.observacoes ? `\n${pendingSubmitData.observacoes}` : ''}`,
      });
    }
    
    setShowJustificationDialog(false);
    setJustification('');
    setPendingSubmitData(null);
  }

  async function processSubmit(data: EntryFormData) {
    if (!selectedPerson) return;

    try {
      // Verificar se a pessoa já possui visita ativa
      const activeVisits = await getActiveVisits();
      const hasActiveVisit = activeVisits.some(v => v.pessoaId === selectedPerson.id);

      if (hasActiveVisit) {
        toast.error('Esta pessoa já possui uma visita em andamento. Registre a saída antes de criar nova entrada.');
        return;
      }

      // Only set idosoId when purpose requires it
      const needsIdoso = data.proposito === 'idoso_especifico';
      const needsDepartamento = data.proposito === 'reuniao';
      const needsAcaoSocial = data.proposito === 'acao_social';

      const visit: Visit = {
        id: generateId(),
        pessoaId: selectedPerson.id,
        pessoa: selectedPerson,
        proposito: data.proposito as VisitPurpose,
        idosoId: needsIdoso ? data.idosoId : undefined,
        idoso: needsIdoso && data.idosoId ? residents.find(r => r.id === data.idosoId) : undefined,
        descricaoAcaoSocial: needsAcaoSocial ? data.descricaoAcaoSocial : undefined,
        pessoaDepartamento: needsDepartamento ? data.pessoaDepartamento : undefined,
        dataEntrada: getCurrentDate(),
        horaEntrada: getCurrentTime(),
        etiquetaEmitida: true,
        etiquetaDevolvida: false,
        observacoes: data.observacoes,
        createdAt: new Date().toISOString(),
      };
      
      await saveVisit(visit);
      toast.success('Entrada registrada com sucesso!');
      
      // Print label directly
      setIsPrinting(true);
      await printVisitorLabelDirect(visit);
      setIsPrinting(false);
      
      // Reset form
      setSelectedPerson(null);
      reset();
    } catch (error) {
      console.error('Erro ao registrar entrada:', error);
      toast.error('Erro ao registrar entrada. Tente novamente.');
    }
  }


  if (showNewPersonForm) {
    return <PersonForm onSuccess={handleNewPersonCreated} onCancel={() => setShowNewPersonForm(false)} />;
  }

  return (
    <>
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-primary" />
            Registrar Entrada de Visitante
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {!selectedPerson && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Buscar Visitante (Nome, CPF ou RG)</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Digite para buscar..." value={searchQuery} onChange={handleSearch} className="pl-10" />
                  </div>
                </div>
                {searchResults.length > 0 && (
                  <div className="rounded-lg border bg-card p-2 shadow-lg">
                    {searchResults.map((person) => (
                      <button key={person.id} onClick={() => handleSelectPerson(person)} className="flex w-full items-center gap-3 rounded-md p-3 text-left transition-colors hover:bg-muted">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{person.nome}</p>
                          <p className="text-sm text-muted-foreground">CPF: {person.cpf}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.length >= 2 && searchResults.length === 0 && (
                  <div className="rounded-lg border bg-muted/50 p-4 text-center">
                    <p className="text-muted-foreground mb-3">Nenhuma pessoa encontrada com "{searchQuery}"</p>
                    <Button variant="secondary" onClick={() => setShowNewPersonForm(true)}>Cadastrar Nova Pessoa</Button>
                  </div>
                )}
                {searchQuery.length < 2 && (
                  <div className="text-center">
                    <Button variant="outline" onClick={() => setShowNewPersonForm(true)}>Cadastrar Nova Pessoa</Button>
                  </div>
                )}
              </div>
            )}
            {selectedPerson && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                      <User className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{selectedPerson.nome}</p>
                      <p className="text-sm text-muted-foreground">CPF: {selectedPerson.cpf} | Tel: {selectedPerson.telefone}</p>
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedPerson(null)}>Alterar</Button>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2"><Label>Data</Label><Input value={getCurrentDate()} disabled /></div>
                  <div className="space-y-2"><Label>Hora de Entrada</Label><Input value={getCurrentTime()} disabled /></div>
                  <div className="space-y-2">
                    <Label>Propósito da Visita *</Label>
                    <Select value={proposito} onValueChange={(value) => setValue('proposito', value)}>
                      <SelectTrigger><SelectValue placeholder="Selecione o propósito" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="idoso_especifico">Visita a Idoso Específico</SelectItem>
                        <SelectItem value="acao_social">Ação Social</SelectItem>
                        <SelectItem value="visita_geral">Visita Geral</SelectItem>
                        <SelectItem value="reuniao">Reunião</SelectItem>
                        <SelectItem value="prestacao_servico">Prestação de Serviço</SelectItem>
                        <SelectItem value="visita_religiosa">Visita Religiosa</SelectItem>
                        <SelectItem value="psc">PSC</SelectItem>
                        <SelectItem value="voluntariado">Voluntariado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {proposito === 'reuniao' && (
                    <div className="space-y-2">
                      <Label>Pessoa/Departamento *</Label>
                      <Input placeholder="Nome da pessoa ou departamento" {...register('pessoaDepartamento')} />
                    </div>
                  )}
                  {proposito === 'idoso_especifico' && (
                    <div className="space-y-2">
                      <Label>Idoso Visitado *</Label>
                      <Select value={watch('idosoId') || ''} onValueChange={(value) => setValue('idosoId', value)}>
                        <SelectTrigger><SelectValue placeholder="Selecione o idoso" /></SelectTrigger>
                        <SelectContent>
                          {residents.map((resident) => (
                            <SelectItem key={resident.id} value={resident.id}>{resident.nome} {resident.quarto ? `- Quarto ${resident.quarto}` : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {proposito === 'acao_social' && (
                    <div className="space-y-2 md:col-span-2">
                      <Label>Descrição da Ação Social</Label>
                      <Textarea placeholder="Descreva a ação social..." {...register('descricaoAcaoSocial')} />
                    </div>
                  )}
                  <div className="space-y-2 md:col-span-2">
                    <Label>Observações</Label>
                    <Textarea placeholder="Observações adicionais..." rows={2} {...register('observacoes')} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="lg" disabled={isPrinting} className="gap-2"><Printer className="h-5 w-5" />{isPrinting ? 'Imprimindo...' : 'Registrar Entrada e Imprimir Etiqueta'}</Button>
                </div>
              </form>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Out-of-hours justification dialog */}
      <Dialog open={showJustificationDialog} onOpenChange={setShowJustificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Entrada Fora do Horário
            </DialogTitle>
            <DialogDescription>
              {(() => {
                const hours = getApplicableVisitingHours(pendingSubmitData?.idosoId);
                const selectedResident = residents.find(r => r.id === pendingSubmitData?.idosoId);
                const isInfirmary = selectedResident?.quarto?.toLowerCase() === 'enfermaria';
                return (
                  <>
                    O horário atual está fora do período de visitação permitido
                    {isInfirmary && ' para a enfermaria'} ({hours.inicio} - {hours.fim}).
                    É necessário informar uma justificativa para prosseguir.
                  </>
                );
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="justification">Justificativa *</Label>
              <Textarea 
                id="justification"
                placeholder="Informe o motivo da entrada fora do horário..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowJustificationDialog(false);
              setJustification('');
              setPendingSubmitData(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleJustificationSubmit}>
              Confirmar Entrada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
