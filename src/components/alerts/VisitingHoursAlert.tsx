import { useState, useEffect, useRef } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getActiveVisits, getActiveResidentExits, getPersonById } from '@/lib/supabaseDb';
import { VISITING_HOURS, Visit, ResidentExit, Person } from '@/types';
import { getCurrentTime } from '@/lib/utils';
import { AlertTriangle, Clock, UserX, X, Volume2, VolumeX } from 'lucide-react';

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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [playedAlerts, setPlayedAlerts] = useState<Set<string>>(new Set());
  const alertSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Criar elemento de áudio para alertas
    alertSound.current = new Audio('/alert-sound.mp3');
    alertSound.current.volume = 0.7;
    
    return () => {
      if (alertSound.current) {
        alertSound.current.pause();
        alertSound.current = null;
      }
    };
  }, []);

  useEffect(() => {
    checkAlerts();
    const interval = setInterval(checkAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  async function checkAlerts() {
    const currentTime = getCurrentTime();
    const newAlerts: AlertItem[] = [];

    if (currentTime > VISITING_HOURS.fim) {
      const activeVisits = await getActiveVisits();
      for (const visit of activeVisits) {
        let person = visit.pessoa;
        if (!person) {
          person = await getPersonById(visit.pessoaId);
        }
        if (person?.horarioEspecial && person.horarioEspecialFim && currentTime <= person.horarioEspecialFim) {
          continue;
        }
        newAlerts.push({
          id: `late-${visit.id}`,
          type: 'late_exit',
          message: `Visitante ainda no local após horário`,
          details: `${person?.nome || 'Desconhecido'} entrou às ${visit.horaEntrada} e ainda não saiu. Horário limite: ${VISITING_HOURS.fim}`,
          timestamp: currentTime,
        });
      }
    }

    const activeExits = await getActiveResidentExits();
    for (const exit of activeExits) {
      if (currentTime > exit.horaRetornoPrevista) {
        newAlerts.push({
          id: `resident-${exit.id}`,
          type: 'resident_not_returned',
          message: `Idoso não retornou no horário previsto`,
          details: `${exit.resident?.nome || 'Desconhecido'} deveria retornar às ${exit.horaRetornoPrevista}`,
          timestamp: currentTime,
        });
      }
    }

    const filteredAlerts = newAlerts.filter(a => !dismissedAlerts.has(a.id));
    setAlerts(filteredAlerts);

    // Tocar som para alertas novos
    const newUnplayedAlerts = filteredAlerts.filter(a => !playedAlerts.has(a.id));
    if (newUnplayedAlerts.length > 0 && soundEnabled && alertSound.current) {
      alertSound.current.play().catch(e => console.warn('Erro ao tocar som:', e));
      setPlayedAlerts(prev => new Set([...prev, ...newUnplayedAlerts.map(a => a.id)]));
    }
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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            Alertas de Horário
            <Badge variant="destructive">{alerts.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="sound-toggle" className="text-sm font-normal text-muted-foreground">
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Label>
            <Switch
              id="sound-toggle"
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
            />
          </div>
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
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => dismissAlert(alert.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}

export function useVisitingHoursCheck() {
  const checkEntryTime = (entryTime: string, person?: Person): { isValid: boolean; warning?: string } => {
    if (person?.horarioEspecial && person.horarioEspecialInicio && person.horarioEspecialFim) {
      if (entryTime >= person.horarioEspecialInicio && entryTime <= person.horarioEspecialFim) {
        return { isValid: true };
      }
      if (entryTime < person.horarioEspecialInicio) {
        return { isValid: false, warning: `Entrada antes do horário especial (${person.horarioEspecialInicio})` };
      }
      return { isValid: false, warning: `Entrada após o horário especial (${person.horarioEspecialFim})` };
    }
    if (entryTime < VISITING_HOURS.inicio) {
      return { isValid: false, warning: `Entrada antes do horário de visitação (${VISITING_HOURS.inicio})` };
    }
    if (entryTime > VISITING_HOURS.fim) {
      return { isValid: false, warning: `Entrada após o horário de visitação (${VISITING_HOURS.fim})` };
    }
    return { isValid: true };
  };
  return { checkEntryTime };
}
