import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { getAuditLogs } from '@/lib/supabaseDb';
import { AuditLog } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Filter, Eye, RefreshCw } from 'lucide-react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Navigate } from 'react-router-dom';

const TABLE_LABELS: Record<string, string> = {
  residents: 'Idosos',
  persons: 'Visitantes',
  visits: 'Visitas',
  vehicles: 'Veículos',
  vehicle_trips: 'Viagens',
  resident_exits: 'Saídas de Idosos',
  institution_settings: 'Configurações',
};

const ACTION_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  INSERT: { label: 'Criação', variant: 'default' },
  UPDATE: { label: 'Edição', variant: 'secondary' },
  DELETE: { label: 'Exclusão', variant: 'destructive' },
};

export default function AuditLogs() {
  const { role, isLoading: authLoading } = useSupabaseAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tableName, setTableName] = useState<string>('all');
  const [action, setAction] = useState<string>('all');
  
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  async function loadLogs() {
    setLoading(true);
    try {
      const result = await getAuditLogs({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        tableName: tableName && tableName !== 'all' ? tableName : undefined,
        action: action && action !== 'all' ? action : undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setLogs(result.data);
      setTotalCount(result.count);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (role === 'admin') {
      loadLogs();
    }
  }, [page, role]);

  function handleFilter() {
    setPage(1);
    loadLogs();
  }

  function handleClearFilters() {
    setStartDate('');
    setEndDate('');
    setTableName('all');
    setAction('all');
    setPage(1);
    setTimeout(loadLogs, 0);
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Logs de Auditoria</h1>
          <p className="text-muted-foreground">Histórico de todas as operações realizadas no sistema</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data Inicial</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data Final</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Entidade</label>
                <Select value={tableName} onValueChange={setTableName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(TABLE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Ação</label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="INSERT">Criação</SelectItem>
                    <SelectItem value="UPDATE">Edição</SelectItem>
                    <SelectItem value="DELETE">Exclusão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleFilter} className="flex-1">
                  <Search className="h-4 w-4 mr-2" />
                  Filtrar
                </Button>
                <Button variant="outline" onClick={handleClearFilters}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum log de auditoria encontrado.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead className="w-20">Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{log.userName || 'Desconhecido'}</p>
                            <p className="text-xs text-muted-foreground">{log.userEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ACTION_LABELS[log.action]?.variant || 'default'}>
                            {ACTION_LABELS[log.action]?.label || log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{TABLE_LABELS[log.tableName] || log.tableName}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.recordId.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = page <= 3 ? i + 1 : page + i - 2;
                          if (pageNum < 1 || pageNum > totalPages) return null;
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setPage(pageNum)}
                                isActive={pageNum === page}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}

                <p className="text-sm text-muted-foreground mt-4">
                  Mostrando {logs.length} de {totalCount} registros
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data/Hora</p>
                  <p>{format(new Date(selectedLog.createdAt), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Usuário</p>
                  <p>{selectedLog.userName || 'Desconhecido'}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.userEmail}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ação</p>
                  <Badge variant={ACTION_LABELS[selectedLog.action]?.variant || 'default'}>
                    {ACTION_LABELS[selectedLog.action]?.label || selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Entidade</p>
                  <p>{TABLE_LABELS[selectedLog.tableName] || selectedLog.tableName}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">ID do Registro</p>
                  <p className="font-mono text-sm">{selectedLog.recordId}</p>
                </div>
              </div>

              {selectedLog.oldData && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Dados Anteriores</p>
                  <ScrollArea className="h-32 rounded border bg-muted/50 p-3">
                    <pre className="text-xs">{JSON.stringify(selectedLog.oldData, null, 2)}</pre>
                  </ScrollArea>
                </div>
              )}

              {selectedLog.newData && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Dados Novos</p>
                  <ScrollArea className="h-32 rounded border bg-muted/50 p-3">
                    <pre className="text-xs">{JSON.stringify(selectedLog.newData, null, 2)}</pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
