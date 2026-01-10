import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getActiveVisits, getActiveResidentExits, getInstitutionSettings } from '@/lib/storage';
import { getCurrentTime } from '@/lib/utils';
import { AlertTriangle, Clock, UserX, Home } from 'lucide-react';
import { Visit, ResidentExit, InstitutionSettings } from '@/types';

interface Alert {
  id: string;
  type: 'visitor_outside_hours' | 'resident_late_return' | 'visitor_overstay';
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  time: string;
}

export function AlertSummaryPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000); // Atualiza a cada minuto
    return () => clearInterval(interval);
  }, []);

  async function loadAlerts() {
    try {
      const [activeVisits, activeExits, settings] = await Promise.all([
        getActiveVisits(),
        getActiveResidentExits(),
        getInstitutionSettings().catch(() => null),
      ]);

      const newAlerts: Alert[] = [];
      const currentTime = getCurrentTime();
      const visitaInicio = settings?.horarioVisitaInicio || '08:00';
      const visitaFim = settings?.horarioVisitaFim || '17:00';

      // Verificar visitantes que entraram fora do horário
      activeVisits.forEach((visit: Visit) => {
        const hasSpecialHours = visit.pessoa?.horarioEspecial;
        const specialStart = visit.pessoa?.horarioEspecialInicio;
        const specialEnd = visit.pessoa?.horarioEspecialFim;

        let isOutsideHours = false;

        if (hasSpecialHours && specialStart && specialEnd) {
          isOutsideHours = visit.horaEntrada < specialStart || visit.horaEntrada > specialEnd;
        } else {
          isOutsideHours = visit.horaEntrada < visitaInicio || visit.horaEntrada > visitaFim;
        }

        if (isOutsideHours) {
          newAlerts.push({
            id: `visitor-outside-${visit.id}`,
            type: 'visitor_outside_hours',
            severity: 'warning',
            title: `${visit.pessoa?.nome || 'Visitante'} - Fora do Horário`,
            description: `Entrada às ${visit.horaEntrada} (Horário: ${hasSpecialHours ? `${specialStart}-${specialEnd}` : `${visitaInicio}-${visitaFim}`})`,
            time: visit.horaEntrada,
          });
        }

        // Visitantes ainda no local após horário de visita
        if (currentTime > visitaFim && !visit.horaSaida) {
          newAlerts.push({
            id: `visitor-overstay-${visit.id}`,
            type: 'visitor_overstay',
            severity: 'warning',
            title: `${visit.pessoa?.nome || 'Visitante'} - Ainda no Local`,
            description: `Horário de visita encerrado às ${visitaFim}`,
            time: visit.horaEntrada,
          });
        }
      });

      // Verificar idosos que não retornaram no horário previsto
      // Considera tanto a data quanto o horário (se passou o dia, está atrasado)
      const today = new Date().toISOString().split('T')[0];
      
      activeExits.forEach((exit: ResidentExit) => {
        if (!exit.horaRetornoReal) {
          // Está atrasado se: passou o dia OU (mesmo dia E passou o horário)
          const isLateByDate = exit.dataSaida < today;
          const isLateByTime = exit.dataSaida === today && currentTime > exit.horaRetornoPrevista;
          
          if (isLateByDate || isLateByTime) {
            let minutesLate: number;
            if (isLateByDate) {
              // Passou o dia - calcular diferença total
              const exitDate = new Date(exit.dataSaida + 'T' + exit.horaRetornoPrevista);
              const now = new Date();
              minutesLate = Math.floor((now.getTime() - exitDate.getTime()) / (1000 * 60));
            } else {
              minutesLate = calculateMinutesLate(exit.horaRetornoPrevista, currentTime);
            }
            
            newAlerts.push({
              id: `resident-late-${exit.id}`,
              type: 'resident_late_return',
              severity: minutesLate > 60 ? 'critical' : 'warning',
              title: `${exit.resident?.nome || 'Idoso'} - Retorno Atrasado`,
              description: isLateByDate 
                ? `Saída: ${exit.dataSaida} | Previsto: ${exit.horaRetornoPrevista} | Não retornou!`
                : `Previsto: ${exit.horaRetornoPrevista} | Atraso: ${minutesLate} min`,
              time: exit.horaSaida,
            });
          }
        }
      });

      // Ordenar por severidade (crítico primeiro)
      newAlerts.sort((a, b) => {
        if (a.severity === 'critical' && b.severity !== 'critical') return -1;
        if (a.severity !== 'critical' && b.severity === 'critical') return 1;
        return 0;
      });

      setAlerts(newAlerts);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateMinutesLate(expected: string, current: string): number {
    const [expH, expM] = expected.split(':').map(Number);
    const [curH, curM] = current.split(':').map(Number);
    return (curH * 60 + curM) - (expH * 60 + expM);
  }

  function getAlertIcon(type: Alert['type']) {
    switch (type) {
      case 'visitor_outside_hours':
        return <Clock className="h-4 w-4" />;
      case 'resident_late_return':
        return <Home className="h-4 w-4" />;
      case 'visitor_overstay':
        return <UserX className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return null; // Não exibir card se não houver alertas
  }

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" />
          Alertas Ativos
          <Badge variant="destructive" className="ml-2">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                alert.severity === 'critical'
                  ? 'border-destructive bg-destructive/10'
                  : 'border-warning bg-warning/10'
              }`}
            >
              <div className={`mt-0.5 ${alert.severity === 'critical' ? 'text-destructive' : 'text-warning'}`}>
                {getAlertIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${alert.severity === 'critical' ? 'text-destructive' : 'text-warning'}`}>
                  {alert.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
              </div>
              <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="shrink-0">
                {alert.severity === 'critical' ? 'Crítico' : 'Atenção'}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
