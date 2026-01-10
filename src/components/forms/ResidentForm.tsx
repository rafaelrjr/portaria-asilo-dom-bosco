import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Resident, DayOfWeek, DAYS_OF_WEEK } from '@/types';
import { saveResident } from '@/lib/storage';
import { generateId, formatCPF } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Home, Save, Camera, Trash2, Upload } from 'lucide-react';
import { WebcamCapture } from '@/components/camera/WebcamCapture';

const residentSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf: z.string().optional(),
  dataNascimento: z.string().optional(),
  quarto: z.string().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean(),
  autorizadoSaidaTemporaria: z.boolean(),
  horarioSaidaPermitido: z.string().optional(),
  horarioRetornoPermitido: z.string().optional(),
});

type ResidentFormData = z.infer<typeof residentSchema>;

interface ResidentFormProps {
  resident?: Resident;
  onSuccess?: (resident: Resident) => void;
  onCancel?: () => void;
}

export function ResidentForm({ resident, onSuccess, onCancel }: ResidentFormProps) {
  const isEditing = !!resident;
  const [showCamera, setShowCamera] = useState(false);
  const [foto, setFoto] = useState<string | undefined>(resident?.foto);
  const [diasSaida, setDiasSaida] = useState<DayOfWeek[]>(resident?.diasSaidaPermitidos || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResidentFormData>({
    resolver: zodResolver(residentSchema),
    defaultValues: resident ? {
      ...resident,
      cpf: resident.cpf || '',
      dataNascimento: resident.dataNascimento || '',
    } : {
      ativo: true,
      autorizadoSaidaTemporaria: false,
      cpf: '',
      dataNascimento: '',
    },
  });

  const ativo = watch('ativo');
  const autorizadoSaida = watch('autorizadoSaidaTemporaria');

  function handlePhotoCapture(imageData: string) {
    setFoto(imageData);
    setShowCamera(false);
    toast.success('Foto capturada!');
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFoto(event.target?.result as string);
        toast.success('Foto carregada!');
      };
      reader.readAsDataURL(file);
    }
  }

  function handleRemovePhoto() {
    setFoto(undefined);
  }

  function handleDayToggle(day: DayOfWeek) {
    setDiasSaida(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  }


  function handleCPFChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue('cpf', formatCPF(e.target.value));
  }

  async function onSubmit(data: ResidentFormData) {
    const newResident: Resident = {
      id: resident?.id || generateId(),
      nome: data.nome,
      cpf: data.cpf,
      dataNascimento: data.dataNascimento,
      quarto: data.quarto,
      foto,
      observacoes: data.observacoes,
      ativo: data.ativo,
      autorizadoSaidaTemporaria: data.autorizadoSaidaTemporaria,
      diasSaidaPermitidos: data.autorizadoSaidaTemporaria ? diasSaida : undefined,
      horarioSaidaPermitido: data.autorizadoSaidaTemporaria ? data.horarioSaidaPermitido : undefined,
      horarioRetornoPermitido: data.autorizadoSaidaTemporaria ? data.horarioRetornoPermitido : undefined,
      createdAt: resident?.createdAt || new Date().toISOString(),
    };

    await saveResident(newResident);
    toast.success(isEditing ? 'Idoso atualizado!' : 'Idoso cadastrado com sucesso!');
    
    if (onSuccess) {
      onSuccess(newResident);
    } else {
      reset({ ativo: true, autorizadoSaidaTemporaria: false });
      setFoto(undefined);
      setDiasSaida([]);
    }
  }

  return (
    <>
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            {isEditing ? 'Editar Idoso' : 'Cadastrar Novo Idoso'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Foto */}
            <div className="flex flex-col items-center gap-4 pb-4 border-b">
              <div className="relative">
                {foto ? (
                  <div className="relative">
                    <img
                      src={foto}
                      alt="Foto do idoso"
                      className="h-32 w-32 rounded-full object-cover border-4 border-primary/20"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                      onClick={handleRemovePhoto}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-muted">
                    <Camera className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCamera(true)}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Capturar
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Carregar
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Nome */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  placeholder="Digite o nome completo"
                  {...register('nome')}
                  className={errors.nome ? 'border-destructive' : ''}
                />
                {errors.nome && (
                  <p className="text-sm text-destructive">{errors.nome.message}</p>
                )}
              </div>

              {/* CPF */}
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  {...register('cpf')}
                  onChange={handleCPFChange}
                />
              </div>

              {/* Data de Nascimento */}
              <div className="space-y-2">
                <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                <Input
                  id="dataNascimento"
                  type="date"
                  {...register('dataNascimento')}
                />
              </div>

              {/* Quarto */}
              <div className="space-y-2">
                <Label htmlFor="quarto">Quarto</Label>
                <Input
                  id="quarto"
                  placeholder="Ex: 101 (opcional)"
                  {...register('quarto')}
                />
              </div>

              {/* Ativo */}
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    checked={ativo}
                    onCheckedChange={(checked) => setValue('ativo', checked)}
                  />
                  <span className={ativo ? 'text-success' : 'text-muted-foreground'}>
                    {ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>

              {/* Saída Temporária */}
              <div className="space-y-2 md:col-span-2">
                <Label>Autorização para Saída Temporária</Label>
                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    checked={autorizadoSaida}
                    onCheckedChange={(checked) => setValue('autorizadoSaidaTemporaria', checked)}
                  />
                  <span className={autorizadoSaida ? 'text-success' : 'text-muted-foreground'}>
                    {autorizadoSaida ? 'Autorizado' : 'Não autorizado'}
                  </span>
                </div>
              </div>

              {/* Configurações de Saída */}
              {autorizadoSaida && (
                <>
                  <div className="space-y-3 md:col-span-2">
                    <Label>Dias Permitidos para Saída</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <div
                          key={day.value}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            id={`day-${day.value}`}
                            checked={diasSaida.includes(day.value)}
                            onCheckedChange={() => handleDayToggle(day.value)}
                          />
                          <Label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                            {day.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="horarioSaida">Horário Saída Permitido</Label>
                    <Input
                      id="horarioSaida"
                      type="time"
                      {...register('horarioSaidaPermitido')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="horarioRetorno">Horário Retorno Máximo</Label>
                    <Input
                      id="horarioRetorno"
                      type="time"
                      {...register('horarioRetornoPermitido')}
                    />
                  </div>
                </>
              )}

              {/* Observações */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  placeholder="Observações adicionais..."
                  rows={3}
                  {...register('observacoes')}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                <Save className="h-4 w-4" />
                {isEditing ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <WebcamCapture
        open={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handlePhotoCapture}
      />
    </>
  );
}
