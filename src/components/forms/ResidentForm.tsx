import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Resident } from '@/types';
import { saveResident } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Home, Save } from 'lucide-react';

const residentSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  quarto: z.string().min(1, 'Quarto é obrigatório'),
  observacoes: z.string().optional(),
  ativo: z.boolean(),
});

type ResidentFormData = z.infer<typeof residentSchema>;

interface ResidentFormProps {
  resident?: Resident;
  onSuccess?: (resident: Resident) => void;
  onCancel?: () => void;
}

export function ResidentForm({ resident, onSuccess, onCancel }: ResidentFormProps) {
  const isEditing = !!resident;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResidentFormData>({
    resolver: zodResolver(residentSchema),
    defaultValues: resident || {
      ativo: true,
    },
  });

  const ativo = watch('ativo');

  function onSubmit(data: ResidentFormData) {
    const newResident: Resident = {
      id: resident?.id || generateId(),
      nome: data.nome,
      quarto: data.quarto,
      observacoes: data.observacoes,
      ativo: data.ativo,
      createdAt: resident?.createdAt || new Date().toISOString(),
    };

    saveResident(newResident);
    toast.success(isEditing ? 'Idoso atualizado!' : 'Idoso cadastrado com sucesso!');
    
    if (onSuccess) {
      onSuccess(newResident);
    } else {
      reset({ ativo: true });
    }
  }

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5 text-primary" />
          {isEditing ? 'Editar Idoso' : 'Cadastrar Novo Idoso'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

            {/* Quarto */}
            <div className="space-y-2">
              <Label htmlFor="quarto">Quarto *</Label>
              <Input
                id="quarto"
                placeholder="Ex: 101"
                {...register('quarto')}
                className={errors.quarto ? 'border-destructive' : ''}
              />
              {errors.quarto && (
                <p className="text-sm text-destructive">{errors.quarto.message}</p>
              )}
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
  );
}
