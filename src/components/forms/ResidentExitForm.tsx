import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ResidentExit, Resident } from '@/types';
import { saveResidentExit, getActiveResidentExits, getResidents } from '@/lib/supabaseDb';
import { generateId, getCurrentDate, getCurrentTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { DoorOpen, LogIn, Save, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const exitSchema = z.object({
  residentId: z.string().min(1, 'Selecione o idoso'),
  dataSaida: z.string(),
  horaSaida: z.string(),
  horaRetornoPrevista: z.string(),
  motivoSaida: z.string().optional(),
  acompanhante: z.string().optional(),
  observacoes: z.string().optional(),
});

type ExitFormData = z.infer<typeof exitSchema>;

const returnSchema = z.object({ horaRetornoReal: z.string() });
type ReturnFormData = z.infer<typeof returnSchema>;

interface ResidentExitFormProps { onSuccess?: () => void; }

export function ResidentExitForm({ onSuccess }: ResidentExitFormProps) {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [activeExits, setActiveExits] = useState<ResidentExit[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<ResidentExit | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<ExitFormData>({
    resolver: zodResolver(exitSchema),
    defaultValues: { dataSaida: getCurrentDate(), horaSaida: getCurrentTime() },
  });

  const { register: registerReturn, handleSubmit: handleSubmitReturn, reset: resetReturn } = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema),
    defaultValues: { horaRetornoReal: getCurrentTime() },
  });

  const selectedResidentId = watch('residentId');

  useEffect(() => { loadData(); }, []);

  // Pre-fill horaRetornoPrevista when resident is selected
  useEffect(() => {
    if (selectedResidentId) {
      const resident = residents.find(r => r.id === selectedResidentId);
      if (resident?.horarioRetornoPermitido) {
        setValue('horaRetornoPrevista', resident.horarioRetornoPermitido);
      }
    }
  }, [selectedResidentId, residents, setValue]);

  async function loadData() {
    const res = await getResidents();
    const filtered = res.filter(r => r.ativo && r.autorizadoSaidaTemporaria);
    setResidents(filtered.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
    const exits = await getActiveResidentExits();
    setActiveExits(exits);
  }

  async function onSubmitExit(data: ExitFormData) {
    const newExit: ResidentExit = {
      id: generateId(),
      residentId: data.residentId,
      dataSaida: data.dataSaida,
      horaSaida: data.horaSaida,
      horaRetornoPrevista: data.horaRetornoPrevista,
      motivoSaida: data.motivoSaida || '',
      acompanhante: data.acompanhante,
      observacoes: data.observacoes,
      createdAt: new Date().toISOString(),
    };
    await saveResidentExit(newExit);
    toast.success('Saída temporária registrada!');
    reset({ dataSaida: getCurrentDate(), horaSaida: getCurrentTime(), residentId: '', horaRetornoPrevista: '', motivoSaida: '', acompanhante: '', observacoes: '' });
    loadData();
    onSuccess?.();
  }

  async function onSubmitReturn(data: ReturnFormData) {
    if (!selectedReturn) return;
    const updatedExit: ResidentExit = { ...selectedReturn, horaRetornoReal: data.horaRetornoReal };
    await saveResidentExit(updatedExit);
    const isLate = data.horaRetornoReal > selectedReturn.horaRetornoPrevista;
    toast.success(isLate ? `Retorno registrado (com atraso)` : 'Retorno registrado no horário!');
    setSelectedReturn(null);
    resetReturn({ horaRetornoReal: getCurrentTime() });
    loadData();
    onSuccess?.();
  }

  function isLate(exit: ResidentExit): boolean { return getCurrentTime() > exit.horaRetornoPrevista; }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><DoorOpen className="h-5 w-5 text-primary" />Registrar Saída Temporária</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitExit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Idoso *</Label>
              <Select value={selectedResidentId} onValueChange={(value) => setValue('residentId', value)}>
                <SelectTrigger className={errors.residentId ? 'border-destructive' : ''}><SelectValue placeholder="Selecione o idoso" /></SelectTrigger>
                <SelectContent>
                  {residents.length === 0 ? <p className="p-2 text-sm text-muted-foreground">Nenhum idoso autorizado</p> : residents.map((resident) => (<SelectItem key={resident.id} value={resident.id}>{resident.nome} {resident.quarto ? `- Quarto ${resident.quarto}` : ''}</SelectItem>))}
                </SelectContent>
              </Select>
              {errors.residentId && <p className="text-sm text-destructive">{errors.residentId.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="dataSaida">Data</Label><Input id="dataSaida" type="date" {...register('dataSaida')} /></div>
              <div className="space-y-2"><Label htmlFor="horaSaida">Hora Saída</Label><Input id="horaSaida" type="time" {...register('horaSaida')} /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="horaRetornoPrevista">Hora Retorno Prevista *</Label><Input id="horaRetornoPrevista" type="time" {...register('horaRetornoPrevista')} className={errors.horaRetornoPrevista ? 'border-destructive' : ''} /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="motivoSaida">Motivo da Saída</Label><Input id="motivoSaida" placeholder="Ex: Consulta médica, Passeio familiar (opcional)" {...register('motivoSaida')} /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="acompanhante">Acompanhante</Label><Input id="acompanhante" placeholder="Nome do acompanhante" {...register('acompanhante')} /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="observacoes">Observações</Label><Textarea id="observacoes" placeholder="Observações..." rows={2} {...register('observacoes')} /></div>
            </div>
            <Button type="submit" disabled={isSubmitting || residents.length === 0} className="w-full gap-2"><DoorOpen className="h-4 w-4" />Registrar Saída</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><LogIn className="h-5 w-5 text-success" />Registrar Retorno</CardTitle></CardHeader>
        <CardContent>
          {selectedReturn ? (
            <form onSubmit={handleSubmitReturn(onSubmitReturn)} className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="font-medium">{selectedReturn.resident?.nome}</p>
                <p className="text-sm text-muted-foreground">Quarto: {selectedReturn.resident?.quarto}</p>
                <p className="text-sm text-muted-foreground">Saída: {selectedReturn.horaSaida} | Retorno previsto: {selectedReturn.horaRetornoPrevista}</p>
              </div>
              <div className="space-y-2"><Label htmlFor="horaRetornoReal">Hora Retorno Real *</Label><Input id="horaRetornoReal" type="time" {...registerReturn('horaRetornoReal')} /></div>
              <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setSelectedReturn(null)} className="flex-1">Cancelar</Button><Button type="submit" className="flex-1 gap-2"><Save className="h-4 w-4" />Registrar Retorno</Button></div>
            </form>
          ) : activeExits.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum idoso fora no momento</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Selecione para registrar o retorno:</p>
              {activeExits.map((exit) => (
                <div key={exit.id} onClick={() => setSelectedReturn(exit)} className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors ${isLate(exit) ? 'border-destructive bg-destructive/5' : ''}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{exit.resident?.nome}</p>
                      {isLate(exit) && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Atrasado</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">Quarto {exit.resident?.quarto} | {exit.motivoSaida}</p>
                    <p className="text-xs text-muted-foreground">Saída: {exit.horaSaida} | Retorno: {exit.horaRetornoPrevista}</p>
                  </div>
                  <Clock className={`h-5 w-5 ${isLate(exit) ? 'text-destructive' : 'text-warning'} animate-pulse`} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
