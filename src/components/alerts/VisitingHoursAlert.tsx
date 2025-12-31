import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  getActiveVisits, 
  getActiveResidentExits,
  getPersonById,
} from '@/lib/storage';
import { VISITING_HOURS, Visit, ResidentExit, Person } from '@/types';
import { getCurrentTime } from '@/lib/utils';
import { AlertTriangle, Clock, UserX, X } from 'lucide-react';

interface AlertItem {
  id: string;
  type: 'early_entry' | 'late_exit' | 'resident_not_returned';
  message: string;
  details: string;
  timestamp: string;
}

export function VisitingHoursAlert() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAlerts();
    const interval = setInterval(checkAlerts, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  function checkAlerts() {
    const currentTime = getCurrentTime();
    const newAlerts: AlertItem[] = [];

    // Check visitors who haven't left after closing time
    if (currentTime > VISITING_HOURS.fim) {
      const activeVisits = getActiveVisits();
      activeVisits.forEach((visit: Visit) => {
        const person = visit.pessoa || getPersonById(visit.pessoaId);
        // Skip if person has special hours
        if (person?.horarioEspecial && person.horarioEspecialFim && currentTime <= person.horarioEspecialFim) {
          return;
        }
        
        newAlerts.push({
          id: `late-${visit.id}`,
          type: 'late_exit',
          message: `Visitante ainda no local após horário`,
          details: `${person?.nome || 'Desconhecido'} entrou às ${visit.horaEntrada} e ainda não saiu. Horário limite: ${VISITING_HOURS.fim}`,
          timestamp: currentTime,
        });
      });
    }

    // Check residents who haven't returned
    const activeExits = getActiveResidentExits();
    activeExits.forEach((exit: ResidentExit) => {
      if (currentTime > exit.horaRetornoPrevista) {
        newAlerts.push({
          id: `resident-${exit.id}`,
          type: 'resident_not_returned',
          message: `Idoso não retornou no horário previsto`,
          details: `${exit.resident?.nome || 'Desconhecido'} deveria retornar às ${exit.horaRetornoPrevista}`,
          timestamp: currentTime,
        });
      }
    });

    setAlerts(newAlerts.filter(a => !dismissedAlerts.has(a.id)));
  }

  function checkEntryTime(entryTime: string, person?: Person): AlertItem | null {
    const currentTime = getCurrentTime();
    
    // Check if person has special visiting hours
    if (person?.horarioEspecial && person.horarioEspecialInicio) {
      if (entryTime < person.horarioEspecialInicio) {
        return {
          id: `early-${Date.now()}`,
          type: 'early_entry',
          message: `Entrada antes do horário especial`,
          details: `${person.nome} está entrando às ${entryTime}. Horário especial: ${person.horarioEspecialInicio} - ${person.horarioEspecialFim}`,
          timestamp: currentTime,
        };
      }
      return null;
    }

    // Check regular visiting hours
    if (entryTime < VISITING_HOURS.inicio) {
      return {
        id: `early-${Date.now()}`,
        type: 'early_entry',
        message: `Entrada antes do horário de visitação`,
        details: `Visitante está entrando às ${entryTime}. Horário de visitação: ${VISITING_HOURS.inicio} - ${VISITING_HOURS.fim}`,
        timestamp: currentTime,
      };
    }

    if (entryTime > VISITING_HOURS.fim) {
      return {
        id: `late-entry-${Date.now()}`,
        type: 'late_exit',
        message: `Entrada após o horário de visitação`,
        details: `Visitante está entrando às ${entryTime}. Horário de visitação encerra às ${VISITING_HOURS.fim}`,
        timestamp: currentTime,
      };
    }

    return null;
  }

  function dismissAlert(id: string) {
    setDismissedAlerts(prev => new Set([...prev, id]));
    setAlerts(prev => prev.filter(a => a.id !== id));
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-warning bg-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" />
          Alertas de Horário
          <Badge variant="destructive">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <Alert key={alert.id} variant="destructive" className="relative">
            <div className="flex items-start gap-3">
              {alert.type === 'resident_not_returned' ? (
                <UserX className="h-5 w-5" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
              <div className="flex-1">
                <AlertTitle>{alert.message}</AlertTitle>
                <AlertDescription>{alert.details}</AlertDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => dismissAlert(alert.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}

// Export function to check entry time from other components
export function useVisitingHoursCheck() {
  const checkEntryTime = (entryTime: string, person?: Person): { 
    isValid: boolean; 
    warning?: string 
  } => {
    // Check if person has special visiting hours
    if (person?.horarioEspecial && person.horarioEspecialInicio && person.horarioEspecialFim) {
      if (entryTime >= person.horarioEspecialInicio && entryTime <= person.horarioEspecialFim) {
        return { isValid: true };
      }
      if (entryTime < person.horarioEspecialInicio) {
        return {
          isValid: false,
          warning: `Entrada antes do horário especial (${person.horarioEspecialInicio})`,
        };
      }
      return {
        isValid: false,
        warning: `Entrada após o horário especial (${person.horarioEspecialFim})`,
      };
    }

    // Check regular visiting hours
    if (entryTime < VISITING_HOURS.inicio) {
      return {
        isValid: false,
        warning: `Entrada antes do horário de visitação (${VISITING_HOURS.inicio})`,
      };
    }

    if (entryTime > VISITING_HOURS.fim) {
      return {
        isValid: false,
        warning: `Entrada após o horário de visitação (${VISITING_HOURS.fim})`,
      };
    }

    return { isValid: true };
  };

  return { checkEntryTime };
}
