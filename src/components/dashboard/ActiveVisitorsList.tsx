import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getActiveVisits, saveVisit } from '@/lib/storage';
import { Visit } from '@/types';
import { getCurrentTime, getVisitPurposeLabel } from '@/lib/utils';
import { LogOut, Clock, User, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { VisitorLabel } from '@/components/visitors/VisitorLabel';

export function ActiveVisitorsList() {
  const [activeVisits, setActiveVisits] = useState<Visit[]>([]);
  const [labelVisit, setLabelVisit] = useState<Visit | null>(null);

  useEffect(() => {
    loadActiveVisits();
    const interval = setInterval(loadActiveVisits, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  function loadActiveVisits() {
    setActiveVisits(getActiveVisits());
  }

  function handleCheckout(visit: Visit) {
    const updatedVisit = {
      ...visit,
      horaSaida: getCurrentTime(),
      etiquetaDevolvida: true,
    };
    saveVisit(updatedVisit);
    loadActiveVisits();
    toast.success(`${visit.pessoa?.nome} registrou saída`);
  }

  function handlePrintLabel(visit: Visit) {
    setLabelVisit(visit);
  }

  if (activeVisits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Visitantes no Local
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Nenhum visitante no local no momento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Visitantes no Local
            <Badge variant="secondary" className="ml-2">
              {activeVisits.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeVisits.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center justify-between rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{visit.pessoa?.nome}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Entrada: {visit.horaEntrada}</span>
                      <span>•</span>
                      <span>{getVisitPurposeLabel(visit.proposito)}</span>
                      {visit.idoso && (
                        <>
                          <span>•</span>
                          <span>{visit.idoso.nome}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintLabel(visit)}
                    className="gap-1"
                  >
                    <Printer className="h-4 w-4" />
                    Etiqueta
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleCheckout(visit)}
                    className="gap-1"
                  >
                    <LogOut className="h-4 w-4" />
                    Registrar Saída
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {labelVisit && (
        <VisitorLabel visit={labelVisit} onClose={() => setLabelVisit(null)} />
      )}
    </>
  );
}
