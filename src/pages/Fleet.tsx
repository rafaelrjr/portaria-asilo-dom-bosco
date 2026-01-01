import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VehicleTripForm } from '@/components/forms/VehicleTripForm';
import { VehicleForm } from '@/components/forms/VehicleForm';
import { getVehicleTrips, getVehicles, deleteVehicle } from '@/lib/storage';
import { exportVehicleTripsReport } from '@/lib/exportUtils';
import { formatDate } from '@/lib/utils';
import { VehicleTrip, Vehicle } from '@/types';
import { Truck, Download, Car, Trash2, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Fleet() {
  const { canEdit } = useAuth();
  const [trips, setTrips] = useState<VehicleTrip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>();

  useEffect(() => { loadData(); }, []);

  function loadData() {
    setTrips(getVehicleTrips().sort((a, b) => 
      new Date(b.dataSaida + 'T' + b.horaSaida).getTime() - new Date(a.dataSaida + 'T' + a.horaSaida).getTime()
    ));
    setVehicles(getVehicles());
  }

  function handleDeleteVehicle(id: string) {
    deleteVehicle(id);
    loadData();
    toast.success('Veículo excluído');
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Controle de Frota</h1>
            <p className="text-muted-foreground">Gerencie veículos e registre viagens</p>
          </div>
          <Button variant="outline" onClick={() => exportVehicleTripsReport(trips)} className="gap-2">
            <Download className="h-4 w-4" /> Exportar
          </Button>
        </div>

        <Tabs defaultValue="trips" className="space-y-6">
          <TabsList>
            <TabsTrigger value="trips" className="gap-2">
              <Truck className="h-4 w-4" /> Viagens
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="gap-2">
              <Car className="h-4 w-4" /> Veículos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trips">
            {canEdit && <VehicleTripForm onSuccess={loadData} />}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" /> Histórico <Badge variant="secondary">{trips.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead>Motorista</TableHead>
                        <TableHead>Saída</TableHead>
                        <TableHead>Chegada</TableHead>
                        <TableHead>KM Percorrido</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trips.map((trip) => (
                        <TableRow key={trip.id}>
                          <TableCell>{formatDate(trip.dataSaida)}</TableCell>
                          <TableCell className="font-medium">{trip.veiculo}</TableCell>
                          <TableCell>{trip.placa}</TableCell>
                          <TableCell>{trip.motorista}</TableCell>
                          <TableCell>{trip.horaSaida} ({trip.kmSaida} km)</TableCell>
                          <TableCell>{trip.horaChegada ? `${trip.horaChegada} (${trip.kmChegada} km)` : '-'}</TableCell>
                          <TableCell>{trip.kmChegada ? trip.kmChegada - trip.kmSaida : '-'} km</TableCell>
                          <TableCell>
                            <Badge variant={trip.horaChegada ? 'secondary' : 'default'}>
                              {trip.horaChegada ? 'Finalizada' : 'Em viagem'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vehicles">
            {canEdit && (
              <VehicleForm 
                vehicle={editingVehicle} 
                onSuccess={() => { loadData(); setEditingVehicle(undefined); }}
                onCancel={editingVehicle ? () => setEditingVehicle(undefined) : undefined}
              />
            )}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" /> Veículos Cadastrados <Badge variant="secondary">{vehicles.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Marca/Modelo</TableHead>
                        <TableHead>Ano</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead>Cor</TableHead>
                        <TableHead>KM Inicial</TableHead>
                        <TableHead>Status</TableHead>
                        {canEdit && <TableHead className="text-right">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicles.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell className="font-medium">{vehicle.marca} {vehicle.modelo}</TableCell>
                          <TableCell>{vehicle.ano}</TableCell>
                          <TableCell>{vehicle.placa}</TableCell>
                          <TableCell>{vehicle.cor}</TableCell>
                          <TableCell>{vehicle.kmInicial} km</TableCell>
                          <TableCell>
                            <Badge variant={vehicle.ativo ? 'default' : 'secondary'}>
                              {vehicle.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          {canEdit && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setEditingVehicle(vehicle)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteVehicle(vehicle.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
