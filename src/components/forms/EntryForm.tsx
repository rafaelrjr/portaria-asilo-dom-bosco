import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Person, Visit, VisitPurpose, Resident } from '@/types';
import { searchPersons, getResidents, saveVisit, getActiveVisits } from '@/lib/storage';
import { getCurrentDate, getCurrentTime, generateId } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { DoorOpen, Search, User, Printer } from 'lucide-react';
import { PersonForm } from './PersonForm';
import { VisitorLabel } from '@/components/visitors/VisitorLabel';

const entrySchema = z.object({
  proposito: z.string(),
  idosoId: z.string().optional(),
  descricaoAcaoSocial: z.string().optional(),
  observacoes: z.string().optional(),
});

type EntryFormData = z.infer<typeof entrySchema>;

export function EntryForm() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showNewPersonForm, setShowNewPersonForm] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [createdVisit, setCreatedVisit] = useState<Visit | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: { proposito: 'idoso_especifico' },
  });

  const proposito = watch('proposito');

  useEffect(() => {
    async function load() {
      const res = await getResidents();
      setResidents(res.filter(r => r.ativo));
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

  async function onSubmit(data: EntryFormData) {
    if (!selectedPerson) {
      toast.error('Selecione uma pessoa para registrar a entrada');
      return;
    }

    // Verificar se a pessoa já possui visita ativa
    const activeVisits = await getActiveVisits();
    const hasActiveVisit = activeVisits.some(v => v.pessoaId === selectedPerson.id);

    if (hasActiveVisit) {
      toast.error('Esta pessoa já possui uma visita em andamento. Registre a saída antes de criar nova entrada.');
      return;
    }

    const visit: Visit = {
      id: generateId(),
      pessoaId: selectedPerson.id,
      pessoa: selectedPerson,
      proposito: data.proposito as VisitPurpose,
      idosoId: data.idosoId,
      idoso: data.idosoId ? residents.find(r => r.id === data.idosoId) : undefined,
      descricaoAcaoSocial: data.descricaoAcaoSocial,
      dataEntrada: getCurrentDate(),
      horaEntrada: getCurrentTime(),
      etiquetaEmitida: false,
      etiquetaDevolvida: false,
      observacoes: data.observacoes,
      createdAt: new Date().toISOString(),
    };
    await saveVisit(visit);
    setCreatedVisit(visit);
    toast.success('Entrada registrada com sucesso!');
  }

  function handleCloseLabelAndReset() {
    setCreatedVisit(null);
    setSelectedPerson(null);
    reset();
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
                      </SelectContent>
                    </Select>
                  </div>
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
                  <Button type="submit" size="lg" className="gap-2"><Printer className="h-5 w-5" />Registrar Entrada e Imprimir Etiqueta</Button>
                </div>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
      {createdVisit && <VisitorLabel visit={createdVisit} onClose={handleCloseLabelAndReset} />}
    </>
  );
}
