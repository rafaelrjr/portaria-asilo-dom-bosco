import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Vehicle } from '@/types';
import { saveVehicle } from '@/lib/supabaseDb';
import { generateId } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Car, Save } from 'lucide-react';

const vehicleSchema = z.object({
  marca: z.string().min(2, 'Marca é obrigatória'),
  modelo: z.string().min(2, 'Modelo é obrigatório'),
  ano: z.string().min(4, 'Ano é obrigatório'),
  placa: z.string().min(7, 'Placa inválida'),
  cor: z.string().min(2, 'Cor é obrigatória'),
  kmInicial: z.number().min(0, 'KM inválido'),
  ativo: z.boolean(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface VehicleFormProps {
  vehicle?: Vehicle;
  onSuccess?: (vehicle: Vehicle) => void;
  onCancel?: () => void;
}

export function VehicleForm({ vehicle, onSuccess, onCancel }: VehicleFormProps) {
  const isEditing = !!vehicle;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: vehicle || {
      ativo: true,
      kmInicial: 0,
    },
  });

  const ativo = watch('ativo');

  function onSubmit(data: VehicleFormData) {
    const newVehicle: Vehicle = {
      id: vehicle?.id || generateId(),
      marca: data.marca,
      modelo: data.modelo,
      ano: data.ano,
      placa: data.placa.toUpperCase(),
      cor: data.cor,
      kmInicial: data.kmInicial,
      ativo: data.ativo,
      createdAt: vehicle?.createdAt || new Date().toISOString(),
    };

    saveVehicle(newVehicle);
    toast.success(isEditing ? 'Veículo atualizado!' : 'Veículo cadastrado com sucesso!');
    
    if (onSuccess) {
      onSuccess(newVehicle);
    } else {
      reset({ ativo: true, kmInicial: 0 });
    }
  }

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5 text-primary" />
          {isEditing ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="marca">Marca *</Label>
              <Input
                id="marca"
                placeholder="Ex: Volkswagen"
                {...register('marca')}
                className={errors.marca ? 'border-destructive' : ''}
              />
              {errors.marca && (
                <p className="text-sm text-destructive">{errors.marca.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo *</Label>
              <Input
                id="modelo"
                placeholder="Ex: Van Sprinter"
                {...register('modelo')}
                className={errors.modelo ? 'border-destructive' : ''}
              />
              {errors.modelo && (
                <p className="text-sm text-destructive">{errors.modelo.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ano">Ano *</Label>
              <Input
                id="ano"
                placeholder="Ex: 2020"
                {...register('ano')}
                className={errors.ano ? 'border-destructive' : ''}
              />
              {errors.ano && (
                <p className="text-sm text-destructive">{errors.ano.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="placa">Placa *</Label>
              <Input
                id="placa"
                placeholder="ABC-1234"
                {...register('placa')}
                className={errors.placa ? 'border-destructive' : ''}
              />
              {errors.placa && (
                <p className="text-sm text-destructive">{errors.placa.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cor">Cor *</Label>
              <Input
                id="cor"
                placeholder="Ex: Branco"
                {...register('cor')}
                className={errors.cor ? 'border-destructive' : ''}
              />
              {errors.cor && (
                <p className="text-sm text-destructive">{errors.cor.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="kmInicial">KM Inicial *</Label>
              <Input
                id="kmInicial"
                type="number"
                placeholder="0"
                {...register('kmInicial', { valueAsNumber: true })}
                className={errors.kmInicial ? 'border-destructive' : ''}
              />
              {errors.kmInicial && (
                <p className="text-sm text-destructive">{errors.kmInicial.message}</p>
              )}
            </div>

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
