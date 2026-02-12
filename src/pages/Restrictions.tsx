import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ShieldBan, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { RestrictedPerson, Resident } from '@/types';
import { getRestrictedPersons, saveRestrictedPerson, deleteRestrictedPerson, getResidents } from '@/lib/supabaseDb';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Navigate } from 'react-router-dom';
import { generateId } from '@/lib/utils';

export default function Restrictions() {
  const { role } = useSupabaseAuth();
  const [restrictions, setRestrictions] = useState<RestrictedPerson[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingPerson, setEditingPerson] = useState<RestrictedPerson | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [residentId, setResidentId] = useState('');
  const [motivo, setMotivo] = useState('');

  const isAdmin = role === 'admin';
  const isViewer = role === 'visualizador';
  const canManage = isAdmin || isViewer;

  useEffect(() => {
    loadData();
  }, []);

  // Operador não tem acesso à página de gestão
  if (role === 'operador') {
    return <Navigate to="/" replace />;
  }

  async function loadData() {
    try {
      const [r, res] = await Promise.all([getRestrictedPersons(), getResidents()]);
      setRestrictions(r);
      setResidents(res.filter(x => x.ativo));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar lista de restrições');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setNome('');
    setCpf('');
    setDataNascimento('');
    setResidentId('');
    setMotivo('');
    setEditingPerson(null);
  }

  function openNewDialog() {
    resetForm();
    setShowDialog(true);
  }

  function openEditDialog(person: RestrictedPerson) {
    setEditingPerson(person);
    setNome(person.nome);
    setCpf(person.cpf || '');
    setDataNascimento(person.dataNascimento || '');
    setResidentId(person.residentId || '');
    setMotivo(person.motivo);
    setShowDialog(true);
  }

  async function handleSave() {
    if (!nome.trim() || !motivo.trim()) {
      toast.error('Nome e motivo são obrigatórios');
      return;
    }

    try {
      await saveRestrictedPerson({
        id: editingPerson?.id || generateId(),
        nome: nome.trim(),
        cpf: cpf.trim() || undefined,
        dataNascimento: dataNascimento || undefined,
        residentId: residentId || undefined,
        motivo: motivo.trim(),
        ativo: editingPerson?.ativo ?? true,
        createdBy: editingPerson?.createdBy,
      });
      toast.success(editingPerson ? 'Restrição atualizada!' : 'Restrição cadastrada!');
      setShowDialog(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Erro ao salvar restrição:', error);
      toast.error('Erro ao salvar restrição');
    }
  }

  async function handleDelete(person: RestrictedPerson) {
    if (!confirm(`Deseja realmente excluir a restrição de "${person.nome}"?`)) return;
    try {
      await deleteRestrictedPerson(person.id);
      toast.success('Restrição excluída!');
      await loadData();
    } catch (error) {
      console.error('Erro ao excluir restrição:', error);
      toast.error('Erro ao excluir restrição');
    }
  }

  async function handleToggleStatus(person: RestrictedPerson) {
    try {
      await saveRestrictedPerson({
        id: person.id,
        nome: person.nome,
        cpf: person.cpf,
        dataNascimento: person.dataNascimento,
        residentId: person.residentId,
        motivo: person.motivo,
        ativo: !person.ativo,
        createdBy: person.createdBy,
      });
      toast.success(person.ativo ? 'Restrição desativada' : 'Restrição reativada');
      await loadData();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  }

  const filtered = restrictions.filter(r => {
    const q = search.toLowerCase();
    return r.nome.toLowerCase().includes(q) || (r.cpf && r.cpf.includes(q));
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldBan className="h-6 w-6 text-destructive" />
              Lista de Restrições
            </h1>
            <p className="text-muted-foreground">Pessoas com restrição de acesso à instituição</p>
          </div>
          {canManage && (
            <Button onClick={openNewDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Restrição
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {search ? 'Nenhum resultado encontrado' : 'Nenhuma pessoa na lista de restrições'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead className="hidden md:table-cell">Idoso Vinculado</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell className="font-medium">{person.nome}</TableCell>
                      <TableCell>{person.cpf || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {person.resident?.nome || '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{person.motivo}</TableCell>
                      <TableCell>
                        <Badge
                          variant={person.ativo ? 'destructive' : 'secondary'}
                          className="cursor-pointer"
                          onClick={() => canManage && handleToggleStatus(person)}
                        >
                          {person.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(person)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(person)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPerson ? 'Editar Restrição' : 'Nova Restrição'}</DialogTitle>
            <DialogDescription>
              {editingPerson ? 'Altere os dados da restrição.' : 'Cadastre uma pessoa na lista de restrições.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da pessoa" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Idoso Vinculado (opcional)</Label>
              <Select value={residentId} onValueChange={setResidentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um idoso (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {residents.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nome} - Quarto {r.quarto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo da Restrição *</Label>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva o motivo da restrição..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave}>{editingPerson ? 'Salvar Alterações' : 'Cadastrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
