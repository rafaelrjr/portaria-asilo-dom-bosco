import { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, Clock, UserX, Home, Calendar, Volume2, VolumeX, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { getActiveVisits, getActiveResidentExits, getActiveWeekendExits, getInstitutionSettings } from '@/lib/supabaseDb';
import { getCurrentTime } from '@/lib/utils';
import { Visit, ResidentExit, WeekendExit } from '@/types';

interface AlertItem {
  id: string;
  type: 'visitor_late' | 'resident_late' | 'weekend_late';
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  time: string;
}

export function GlobalAlertBanner() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [playedAlerts, setPlayedAlerts] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const alertSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
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
    const interval = setInterval(checkAlerts, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  async function checkAlerts() {
    try {
      const [activeVisits, activeExits, activeWeekendExits, settings] = await Promise.all([
        getActiveVisits(),
        getActiveResidentExits(),
        getActiveWeekendExits(),
        getInstitutionSettings().catch(() => null),
      ]);

      const newAlerts: AlertItem[] = [];
      const currentTime = getCurrentTime();
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const visitaFim = settings?.horarioVisitaFim || '17:00';

      // Check visitors still on-site after allowed hours
      if (currentTime > visitaFim) {
        activeVisits.forEach((visit: Visit) => {
          const hasSpecialHours = visit.pessoa?.horarioEspecial;
          const specialEnd = visit.pessoa?.horarioEspecialFim;

          let isLate = false;
          if (hasSpecialHours && specialEnd) {
            isLate = currentTime > specialEnd;
          } else {
            isLate = true; // Already past visitaFim
          }

          if (isLate) {
            const hoursLate = calculateHoursLate(visitaFim, currentTime);
            newAlerts.push({
              id: `visitor-late-${visit.id}`,
              type: 'visitor_late',
              severity: hoursLate > 1 ? 'critical' : 'warning',
              title: `${visit.pessoa?.nome || 'Visitante'} - Ainda no local`,
              description: `Entrou às ${visit.horaEntrada}. Horário limite: ${hasSpecialHours && specialEnd ? specialEnd : visitaFim}`,
              time: currentTime,
            });
          }
        });
      }

      // Check resident temporary exits late returns
      activeExits.forEach((exit: ResidentExit) => {
        const isLateByDate = exit.dataSaida < today;
        const isLateByTime = exit.dataSaida === today && currentTime > exit.horaRetornoPrevista;
        
        if (isLateByDate || isLateByTime) {
          let minutesLate: number;
          if (isLateByDate) {
            const exitDate = new Date(exit.dataSaida + 'T' + exit.horaRetornoPrevista);
            minutesLate = Math.floor((now.getTime() - exitDate.getTime()) / (1000 * 60));
          } else {
            minutesLate = calculateMinutesLate(exit.horaRetornoPrevista, currentTime);
          }
          
          newAlerts.push({
            id: `resident-late-${exit.id}`,
            type: 'resident_late',
            severity: minutesLate > 60 ? 'critical' : 'warning',
            title: `${exit.resident?.nome || 'Idoso'} - Retorno atrasado`,
            description: isLateByDate 
              ? `Saída: ${exit.dataSaida} | Previsto: ${exit.horaRetornoPrevista}`
              : `Previsto: ${exit.horaRetornoPrevista} | Atraso: ${minutesLate} min`,
            time: currentTime,
          });
        }
      });

      // Check weekend exits late returns
      activeWeekendExits.forEach((exit: WeekendExit) => {
        if (!exit.dataRetornoPrevista || !exit.horaRetornoPrevista) return;
        
        const isLateByDate = exit.dataRetornoPrevista < today;
        const isLateByTime = exit.dataRetornoPrevista === today && currentTime > exit.horaRetornoPrevista;
        
        if (isLateByDate || isLateByTime) {
          let minutesLate: number;
          if (isLateByDate) {
            const exitDate = new Date(exit.dataRetornoPrevista + 'T' + exit.horaRetornoPrevista);
            minutesLate = Math.floor((now.getTime() - exitDate.getTime()) / (1000 * 60));
          } else {
            minutesLate = calculateMinutesLate(exit.horaRetornoPrevista, currentTime);
          }
          
          newAlerts.push({
            id: `weekend-late-${exit.id}`,
            type: 'weekend_late',
            severity: minutesLate > 120 ? 'critical' : 'warning',
            title: `${exit.resident?.nome || 'Idoso'} - Retorno fim de semana atrasado`,
            description: isLateByDate 
              ? `Retorno previsto: ${exit.dataRetornoPrevista} às ${exit.horaRetornoPrevista}`
              : `Previsto: ${exit.horaRetornoPrevista} | Atraso: ${minutesLate} min`,
            time: currentTime,
          });
        }
      });

      // Sort by severity (critical first)
      newAlerts.sort((a, b) => {
        if (a.severity === 'critical' && b.severity !== 'critical') return -1;
        if (a.severity !== 'critical' && b.severity === 'critical') return 1;
        return 0;
      });

      // Filter dismissed alerts
      const filteredAlerts = newAlerts.filter(a => !dismissedAlerts.has(a.id));
      setAlerts(filteredAlerts);

      // Play sound for new critical alerts
      const newUnplayedCritical = filteredAlerts.filter(
        a => a.severity === 'critical' && !playedAlerts.has(a.id)
      );
      if (newUnplayedCritical.length > 0 && soundEnabled && alertSound.current) {
        alertSound.current.play().catch(e => console.warn('Error playing sound:', e));
        setPlayedAlerts(prev => new Set([...prev, ...newUnplayedCritical.map(a => a.id)]));
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  }

  function calculateMinutesLate(expected: string, current: string): number {
    const [expH, expM] = expected.split(':').map(Number);
    const [curH, curM] = current.split(':').map(Number);
    return (curH * 60 + curM) - (expH * 60 + expM);
  }

  function calculateHoursLate(expected: string, current: string): number {
    return calculateMinutesLate(expected, current) / 60;
  }

  function dismissAlert(id: string) {
    setDismissedAlerts(prev => new Set([...prev, id]));
    setAlerts(prev => prev.filter(a => a.id !== id));
  }

  function dismissAll() {
    setDismissedAlerts(prev => new Set([...prev, ...alerts.map(a => a.id)]));
    setAlerts([]);
  }

  function getAlertIcon(type: AlertItem['type']) {
    switch (type) {
      case 'visitor_late':
        return <UserX className="h-4 w-4" />;
      case 'resident_late':
        return <Clock className="h-4 w-4" />;
      case 'weekend_late':
        return <Calendar className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  }

  function getTypeLabel(type: AlertItem['type']) {
    switch (type) {
      case 'visitor_late':
        return 'Visitante';
      case 'resident_late':
        return 'Saída Temp.';
      case 'weekend_late':
        return 'Fim de Semana';
      default:
        return 'Alerta';
    }
  }

  if (alerts.length === 0) {
    return null;
  }

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  if (isMinimized) {
    return (
      <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
        <Button
          variant="destructive"
          size="sm"
          className="gap-2 shadow-lg animate-pulse"
          onClick={() => setIsMinimized(false)}
        >
          <AlertTriangle className="h-4 w-4" />
          {criticalCount > 0 && <Badge variant="outline" className="bg-white text-destructive">{criticalCount} crítico</Badge>}
          {warningCount > 0 && <Badge variant="outline" className="bg-white text-warning">{warningCount} atenção</Badge>}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top-2">
      <div className={cn(
        "mx-auto max-w-4xl m-4 rounded-lg border-2 shadow-xl",
        criticalCount > 0 
          ? "border-destructive bg-destructive/10 backdrop-blur-sm" 
          : "border-warning bg-warning/10 backdrop-blur-sm"
      )}>
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-4 py-3 rounded-t-lg",
          criticalCount > 0 ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"
        )}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
            <span className="font-semibold">
              {criticalCount > 0 ? 'ALERTAS CRÍTICOS' : 'ALERTAS DE ATENÇÃO'}
            </span>
            <Badge variant="outline" className="bg-white/20 text-inherit border-white/30">
              {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <Switch
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
                className="data-[state=checked]:bg-white/30"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-inherit hover:bg-white/20"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-inherit hover:bg-white/20"
              onClick={() => setIsMinimized(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Alert List */}
        {isExpanded && (
          <div className="p-3 space-y-2 max-h-64 overflow-auto bg-background/80">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 transition-all",
                  alert.severity === 'critical'
                    ? "border-destructive bg-destructive/5 animate-pulse"
                    : "border-warning bg-warning/5"
                )}
              >
                <div className={cn(
                  "mt-0.5 p-1.5 rounded-full",
                  alert.severity === 'critical' ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"
                )}>
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn(
                      "font-medium text-sm",
                      alert.severity === 'critical' ? "text-destructive" : "text-warning-foreground"
                    )}>
                      {alert.title}
                    </p>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        alert.type === 'visitor_late' && "border-blue-500 text-blue-600",
                        alert.type === 'resident_late' && "border-orange-500 text-orange-600",
                        alert.type === 'weekend_late' && "border-purple-500 text-purple-600"
                      )}
                    >
                      {getTypeLabel(alert.type)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => dismissAlert(alert.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {alerts.length > 1 && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" onClick={dismissAll}>
                  Dispensar todos os alertas
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
