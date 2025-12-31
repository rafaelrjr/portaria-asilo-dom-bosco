import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VehicleTripForm } from '@/components/forms/VehicleTripForm';
import { getVehicleTrips } from '@/lib/storage';
import { exportVehicleTripsReport } from '@/lib/exportUtils';
import { formatDate } from '@/lib/utils';
import { VehicleTrip } from '@/types';
import { Truck, Download } from 'lucide-react';

export default function Fleet() {
  const [trips, setTrips] = useState<VehicleTrip[]>([]);

  useEffect(() => { loadData(); }, []);

  function loadData() {
    setTrips(getVehicleTrips().sort((a, b) => 
      new Date(b.dataSaida + 'T' + b.horaSaida).getTime() - new Date(a.dataSaida + 'T' + a.horaSaida).getTime()
    ));
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Controle de Frota</h1>
            <p className="text-muted-foreground">Registre entrada e saída de veículos</p>
          </div>
          <Button variant="outline" onClick={() => exportVehicleTripsReport(trips)} className="gap-2">
            <Download className="h-4 w-4" /> Exportar
          </Button>
        </div>
        <VehicleTripForm onSuccess={loadData} />
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
      </div>
    </Layout>
  );
}
