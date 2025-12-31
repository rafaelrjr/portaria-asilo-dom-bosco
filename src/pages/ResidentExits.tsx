import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResidentExitForm } from '@/components/forms/ResidentExitForm';
import { getResidentExits } from '@/lib/storage';
import { exportResidentExitsReport } from '@/lib/exportUtils';
import { formatDate } from '@/lib/utils';
import { ResidentExit } from '@/types';
import { DoorOpen, Download } from 'lucide-react';

export default function ResidentExits() {
  const [exits, setExits] = useState<ResidentExit[]>([]);

  useEffect(() => { loadData(); }, []);

  function loadData() {
    setExits(getResidentExits().sort((a, b) => 
      new Date(b.dataSaida + 'T' + b.horaSaida).getTime() - new Date(a.dataSaida + 'T' + a.horaSaida).getTime()
    ));
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Saída Temporária</h1>
            <p className="text-muted-foreground">Controle de saídas temporárias dos idosos</p>
          </div>
          <Button variant="outline" onClick={() => exportResidentExitsReport(exits)} className="gap-2">
            <Download className="h-4 w-4" /> Exportar
          </Button>
        </div>
        <ResidentExitForm onSuccess={loadData} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-primary" /> Histórico <Badge variant="secondary">{exits.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Idoso</TableHead>
                    <TableHead>Quarto</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>Retorno Prev.</TableHead>
                    <TableHead>Retorno Real</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exits.map((exit) => (
                    <TableRow key={exit.id}>
                      <TableCell>{formatDate(exit.dataSaida)}</TableCell>
                      <TableCell className="font-medium">{exit.resident?.nome || 'N/A'}</TableCell>
                      <TableCell>{exit.resident?.quarto || '-'}</TableCell>
                      <TableCell>{exit.horaSaida}</TableCell>
                      <TableCell>{exit.horaRetornoPrevista}</TableCell>
                      <TableCell>{exit.horaRetornoReal || '-'}</TableCell>
                      <TableCell>{exit.motivoSaida}</TableCell>
                      <TableCell>
                        {exit.horaRetornoReal ? (
                          <Badge variant={exit.horaRetornoReal > exit.horaRetornoPrevista ? 'destructive' : 'secondary'}>
                            {exit.horaRetornoReal > exit.horaRetornoPrevista ? 'Atrasado' : 'No horário'}
                          </Badge>
                        ) : (
                          <Badge variant="default" className="animate-pulse">Fora</Badge>
                        )}
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
