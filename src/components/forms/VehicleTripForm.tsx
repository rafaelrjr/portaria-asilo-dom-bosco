import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { VehicleTrip, Vehicle } from '@/types';
import { saveVehicleTrip, getActiveVehicleTrips, getActiveVehicles, getLastKmChegadaForVehicle } from '@/lib/supabaseDb';
import { generateId, getCurrentDate, getCurrentTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Truck, LogOut, LogIn, Save } from 'lucide-react';

const tripSchema = z.object({
  vehicleId: z.string().min(1, 'Selecione um veículo'),
  motorista: z.string().min(3, 'Motorista é obrigatório'),
  dataSaida: z.string(),
  horaSaida: z.string(),
  kmSaida: z.number().min(0, 'KM inválido'),
  destino: z.string().optional(),
  observacoes: z.string().optional(),
});

type TripFormData = z.infer<typeof tripSchema>;

const returnSchema = z.object({
  horaChegada: z.string(),
  kmChegada: z.number().min(0, 'KM inválido'),
});

type ReturnFormData = z.infer<typeof returnSchema>;

interface VehicleTripFormProps {
  onSuccess?: () => void;
}

export function VehicleTripForm({ onSuccess }: VehicleTripFormProps) {
  const [activeTrips, setActiveTrips] = useState<VehicleTrip[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<VehicleTrip | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      dataSaida: getCurrentDate(),
      horaSaida: getCurrentTime(),
    },
  });

  const {
    register: registerReturn,
    handleSubmit: handleSubmitReturn,
    reset: resetReturn,
    formState: { errors: returnErrors },
  } = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      horaChegada: getCurrentTime(),
    },
  });

  const selectedVehicleId = watch('vehicleId');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [trips, allVehicles] = await Promise.all([
      getActiveVehicleTrips(),
      getActiveVehicles(),
    ]);
    setActiveTrips(trips);
    
    // Filtrar veículos que já estão em viagem (não podem sair novamente)
    const vehiclesInTrip = new Set(trips.map(t => t.vehicleId));
    const availableVehicles = allVehicles.filter(v => !vehiclesInTrip.has(v.id));
    setVehicles(availableVehicles);
  }

  async function handleVehicleChange(vehicleId: string) {
    setValue('vehicleId', vehicleId);
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      // Buscar último Km de chegada para este veículo
      const lastKmChegada = await getLastKmChegadaForVehicle(vehicleId);
      setValue('kmSaida', lastKmChegada ?? vehicle.kmAtual ?? vehicle.kmInicial);
    }
  }

  async function onSubmitExit(data: TripFormData) {
    const vehicle = vehicles.find(v => v.id === data.vehicleId);
    if (!vehicle) {
      toast.error('Veículo não encontrado');
      return;
    }

    const newTrip: VehicleTrip = {
      id: generateId(),
      vehicleId: data.vehicleId,
      veiculo: `${vehicle.marca} ${vehicle.modelo}`,
      placa: vehicle.placa,
      motorista: data.motorista,
      dataSaida: data.dataSaida,
      horaSaida: data.horaSaida,
      kmSaida: data.kmSaida,
      destino: data.destino,
      observacoes: data.observacoes,
      createdAt: new Date().toISOString(),
    };

    await saveVehicleTrip(newTrip);
    toast.success('Saída de veículo registrada!');
    reset({
      dataSaida: getCurrentDate(),
      horaSaida: getCurrentTime(),
      vehicleId: '',
      motorista: '',
      kmSaida: 0,
      destino: '',
      observacoes: '',
    });
    loadData();
    onSuccess?.();
  }

  async function onSubmitReturn(data: ReturnFormData) {
    if (!selectedReturn) return;

    // Validar que KM de chegada não é menor que KM de saída
    if (data.kmChegada < selectedReturn.kmSaida) {
      toast.error(`KM de chegada (${data.kmChegada.toLocaleString()}) não pode ser menor que KM de saída (${selectedReturn.kmSaida.toLocaleString()})`);
      return;
    }

    const updatedTrip: VehicleTrip = {
      ...selectedReturn,
      horaChegada: data.horaChegada,
      kmChegada: data.kmChegada,
    };

    await saveVehicleTrip(updatedTrip);
    toast.success('Retorno de veículo registrado!');
    setSelectedReturn(null);
    resetReturn({ horaChegada: getCurrentTime() });
    loadData();
    onSuccess?.();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Formulário de Saída */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-primary" />
            Registrar Saída de Veículo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum veículo cadastrado.</p>
              <p className="text-sm text-muted-foreground">Cadastre veículos na aba "Veículos" primeiro.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmitExit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="vehicleId">Veículo *</Label>
                  <Select
                    value={selectedVehicleId}
                    onValueChange={handleVehicleChange}
                  >
                    <SelectTrigger className={errors.vehicleId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Selecione um veículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.marca} {vehicle.modelo} - {vehicle.placa} ({vehicle.cor})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.vehicleId && (
                    <p className="text-sm text-destructive">{errors.vehicleId.message}</p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="motorista">Motorista *</Label>
                  <Input
                    id="motorista"
                    placeholder="Nome do motorista"
                    {...register('motorista')}
                    className={errors.motorista ? 'border-destructive' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataSaida">Data</Label>
                  <Input
                    id="dataSaida"
                    type="date"
                    {...register('dataSaida')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horaSaida">Hora Saída</Label>
                  <Input
                    id="horaSaida"
                    type="time"
                    {...register('horaSaida')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kmSaida">KM Saída *</Label>
                  <Input
                    id="kmSaida"
                    type="number"
                    placeholder="0"
                    {...register('kmSaida', { valueAsNumber: true })}
                    className={errors.kmSaida ? 'border-destructive' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destino">Destino</Label>
                  <Input
                    id="destino"
                    placeholder="Destino da viagem"
                    {...register('destino')}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Observações..."
                    rows={2}
                    {...register('observacoes')}
                  />
                </div>
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
                <Truck className="h-4 w-4" />
                Registrar Saída
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Veículos em Viagem / Formulário de Retorno */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-success" />
            Registrar Retorno
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedReturn ? (
            <form onSubmit={handleSubmitReturn(onSubmitReturn)} className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="font-medium">{selectedReturn.veiculo}</p>
                <p className="text-sm text-muted-foreground">
                  Placa: {selectedReturn.placa} | Motorista: {selectedReturn.motorista}
                </p>
                <p className="text-sm text-muted-foreground">
                  Saída: {selectedReturn.horaSaida} | KM: {selectedReturn.kmSaida}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="horaChegada">Hora Chegada *</Label>
                  <Input
                    id="horaChegada"
                    type="time"
                    {...registerReturn('horaChegada')}
                    className={returnErrors.horaChegada ? 'border-destructive' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kmChegada">KM Chegada * (mín: {selectedReturn?.kmSaida.toLocaleString()})</Label>
                  <Input
                    id="kmChegada"
                    type="number"
                    placeholder="0"
                    min={selectedReturn?.kmSaida}
                    {...registerReturn('kmChegada', { valueAsNumber: true })}
                    className={returnErrors.kmChegada ? 'border-destructive' : ''}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setSelectedReturn(null)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 gap-2">
                  <Save className="h-4 w-4" />
                  Registrar Retorno
                </Button>
              </div>
            </form>
          ) : activeTrips.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum veículo em viagem no momento
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Selecione um veículo para registrar o retorno:
              </p>
              {activeTrips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => setSelectedReturn(trip)}
                  className="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{trip.veiculo}</p>
                    <p className="text-sm text-muted-foreground">
                      {trip.placa} | {trip.motorista}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Saída: {trip.horaSaida} | KM: {trip.kmSaida}
                    </p>
                  </div>
                  <Truck className="h-5 w-5 text-warning animate-pulse" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
