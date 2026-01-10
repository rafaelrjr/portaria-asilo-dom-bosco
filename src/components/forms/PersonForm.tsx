import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Person, VisitorType, DayOfWeek, DAYS_OF_WEEK, Resident } from '@/types';
import { savePerson, getResidents } from '@/lib/storage';
import { formatCPF, formatPhone, formatRG, generateId } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { UserPlus, Save, Camera, Trash2, Upload } from 'lucide-react';
import { WebcamCapture } from '@/components/camera/WebcamCapture';

const personSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf: z.string().min(14, 'CPF inválido'),
  rg: z.string().optional(),
  telefone: z.string().min(14, 'Telefone inválido'),
  tipo: z.string(),
  parentesco: z.string().optional(),
  idosoVinculado: z.string().optional(),
  observacoes: z.string().optional(),
  horarioEspecial: z.boolean().optional(),
  horarioEspecialInicio: z.string().optional(),
  horarioEspecialFim: z.string().optional(),
});

type PersonFormData = z.infer<typeof personSchema>;

interface PersonFormProps {
  person?: Person;
  onSuccess?: (person: Person) => void;
  onCancel?: () => void;
}

export function PersonForm({ person, onSuccess, onCancel }: PersonFormProps) {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [foto, setFoto] = useState<string | undefined>(person?.foto);
  const [diasPermitidos, setDiasPermitidos] = useState<DayOfWeek[]>(person?.diasPermitidos || []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!person;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues: person || { tipo: 'familiar', horarioEspecial: false },
  });

  const tipoVisitante = watch('tipo');
  const horarioEspecial = watch('horarioEspecial');

  useEffect(() => {
    async function load() {
      const res = await getResidents();
      const filtered = res.filter(r => r.ativo);
      setResidents(filtered.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
    }
    load();
  }, []);

  function handleCPFChange(e: React.ChangeEvent<HTMLInputElement>) { setValue('cpf', formatCPF(e.target.value)); }
  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) { setValue('telefone', formatPhone(e.target.value)); }
  function handleRGChange(e: React.ChangeEvent<HTMLInputElement>) { setValue('rg', formatRG(e.target.value)); }
  function handlePhotoCapture(imageData: string) { setFoto(imageData); setShowCamera(false); toast.success('Foto capturada!'); }
  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => { setFoto(event.target?.result as string); toast.success('Foto carregada!'); };
      reader.readAsDataURL(file);
    }
  }
  function handleRemovePhoto() { setFoto(undefined); }
  function handleDayToggle(day: DayOfWeek) { setDiasPermitidos(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]); }

  async function onSubmit(data: PersonFormData) {
    const newPerson: Person = {
      id: person?.id || generateId(),
      nome: data.nome,
      cpf: data.cpf,
      rg: data.rg || '',
      telefone: data.telefone,
      tipo: data.tipo as VisitorType,
      parentesco: data.parentesco,
      idosoVinculado: data.idosoVinculado,
      observacoes: data.observacoes,
      foto: foto,
      horarioEspecial: data.horarioEspecial,
      horarioEspecialInicio: data.horarioEspecial ? data.horarioEspecialInicio : undefined,
      horarioEspecialFim: data.horarioEspecial ? data.horarioEspecialFim : undefined,
      diasPermitidos: data.horarioEspecial ? diasPermitidos : undefined,
      createdAt: person?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await savePerson(newPerson);
    toast.success(isEditing ? 'Cadastro atualizado!' : 'Pessoa cadastrada com sucesso!');
    if (onSuccess) { onSuccess(newPerson); } else { reset(); setFoto(undefined); setDiasPermitidos([]); }
  }

  return (
    <Card className="animate-slide-up">
      <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" />{isEditing ? 'Editar Cadastro' : 'Novo Cadastro de Visitante'}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col items-center gap-4 pb-4 border-b">
            <div className="relative">
              {foto ? (
                <div className="relative">
                  <img src={foto} alt="Foto do visitante" className="h-32 w-32 rounded-full object-cover border-4 border-primary/20" />
                  <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-8 w-8 rounded-full" onClick={handleRemovePhoto}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-muted"><Camera className="h-12 w-12 text-muted-foreground" /></div>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCamera(true)} className="gap-2"><Camera className="h-4 w-4" />Capturar</Button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2"><Upload className="h-4 w-4" />Carregar</Button>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input id="nome" placeholder="Digite o nome completo" {...register('nome')} className={errors.nome ? 'border-destructive' : ''} />
              {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <Input id="cpf" placeholder="000.000.000-00" {...register('cpf')} onChange={handleCPFChange} className={errors.cpf ? 'border-destructive' : ''} />
              {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
            </div>
            <div className="space-y-2"><Label htmlFor="rg">RG</Label><Input id="rg" placeholder="Número do RG" {...register('rg')} onChange={handleRGChange} /></div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input id="telefone" placeholder="(00) 00000-0000" {...register('telefone')} onChange={handlePhoneChange} className={errors.telefone ? 'border-destructive' : ''} />
              {errors.telefone && <p className="text-sm text-destructive">{errors.telefone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Tipo de Visitante *</Label>
              <Select value={tipoVisitante} onValueChange={(value) => setValue('tipo', value)}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="familiar">Familiar</SelectItem>
                  <SelectItem value="prestador">Prestador de Serviço</SelectItem>
                  <SelectItem value="acao_social">Ação Social</SelectItem>
                  <SelectItem value="visita_geral">Visita Geral</SelectItem>
                  <SelectItem value="voluntario">Voluntário</SelectItem>
                  <SelectItem value="diretoria">Diretoria</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tipoVisitante === 'familiar' && (<div className="space-y-2"><Label htmlFor="parentesco">Parentesco</Label><Input id="parentesco" placeholder="Ex: Filho(a), Neto(a), Sobrinho(a)" {...register('parentesco')} /></div>)}
            {tipoVisitante === 'familiar' && (
              <div className="space-y-2">
                <Label>Idoso Vinculado</Label>
                <Select value={watch('idosoVinculado') || ''} onValueChange={(value) => setValue('idosoVinculado', value)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o idoso" /></SelectTrigger>
                  <SelectContent>
                    {residents.map((resident) => (<SelectItem key={resident.id} value={resident.id}>{resident.nome} {resident.quarto ? `- Quarto ${resident.quarto}` : ''}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-3"><Switch checked={horarioEspecial} onCheckedChange={(checked) => setValue('horarioEspecial', checked)} /><Label>Horário de Visita Diferenciado</Label></div>
              <p className="text-xs text-muted-foreground">Ative se este visitante tem autorização para visitar fora do horário padrão (13:30 - 16:30)</p>
            </div>
            {horarioEspecial && (
              <>
                <div className="space-y-3 md:col-span-2">
                  <Label>Dias Permitidos para Visita</Label>
                  <div className="flex flex-wrap gap-3">
                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day.value} className="flex items-center gap-2">
                        <Checkbox id={`visitor-day-${day.value}`} checked={diasPermitidos.includes(day.value)} onCheckedChange={() => handleDayToggle(day.value)} />
                        <Label htmlFor={`visitor-day-${day.value}`} className="text-sm cursor-pointer">{day.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2"><Label htmlFor="horarioInicio">Horário Início Permitido</Label><Input id="horarioInicio" type="time" {...register('horarioEspecialInicio')} /></div>
                <div className="space-y-2"><Label htmlFor="horarioFim">Horário Fim Permitido</Label><Input id="horarioFim" type="time" {...register('horarioEspecialFim')} /></div>
              </>
            )}
            <div className="space-y-2 md:col-span-2"><Label htmlFor="observacoes">Observações</Label><Textarea id="observacoes" placeholder="Observações adicionais..." rows={3} {...register('observacoes')} /></div>
          </div>
          <div className="flex justify-end gap-3">
            {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
            <Button type="submit" disabled={isSubmitting} className="gap-2"><Save className="h-4 w-4" />{isEditing ? 'Salvar Alterações' : 'Cadastrar'}</Button>
          </div>
        </form>
        
        {/* WebcamCapture moved outside Card but still inside component - portal renders at document root */}
        <WebcamCapture open={showCamera} onClose={() => setShowCamera(false)} onCapture={handlePhotoCapture} />
      </CardContent>
    </Card>
  );
}
