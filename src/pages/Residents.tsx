import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getResidents, deleteResident, importResidentsFromJSON, importResidentsFromCSV } from '@/lib/supabaseDb';
import { Resident } from '@/types';
import { ResidentForm } from '@/components/forms/ResidentForm';
import { Home, Search, Edit, Trash2, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

export default function Residents() {
  const { canEdit } = useSupabaseAuth();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadResidents();
  }, []);

  async function loadResidents() {
    const data = await getResidents();
    setResidents(data.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
  }

  async function handleDelete(resident: Resident) {
    if (confirm(`Deseja realmente excluir ${resident.nome}?`)) {
      await deleteResident(resident.id);
      loadResidents();
      toast.success('Idoso excluído com sucesso');
    }
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      let result: { success: number; errors: number };

      if (file.name.endsWith('.json')) {
        result = await importResidentsFromJSON(content);
      } else if (file.name.endsWith('.csv')) {
        result = await importResidentsFromCSV(content);
      } else {
        toast.error('Formato não suportado. Use JSON ou CSV.');
        return;
      }

      if (result.success > 0) {
        toast.success(`${result.success} idoso(s) importado(s) com sucesso!`);
        loadResidents();
      }
      if (result.errors > 0) {
        toast.warning(`${result.errors} registro(s) com erro`);
      }
    };
    reader.readAsText(file);
    
    if (importInputRef.current) {
      importInputRef.current.value = '';
    }
  }

  function handleEditSuccess() { setEditingResident(null); loadResidents(); }
  function handleNewSuccess() { setShowNewForm(false); loadResidents(); }

  const filteredResidents = residents.filter((r) => r.nome.toLowerCase().includes(searchQuery.toLowerCase()) || (r.quarto && r.quarto.includes(searchQuery)));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="font-display text-3xl font-bold tracking-tight">Idosos Residentes</h1><p className="text-muted-foreground">Gerencie os idosos residentes</p></div>
          <div className="flex gap-2">
            {canEdit && (
              <>
                <input ref={importInputRef} type="file" accept=".json,.csv" onChange={handleImportFile} className="hidden" />
                <Button variant="outline" onClick={() => importInputRef.current?.click()} className="gap-2"><Upload className="h-4 w-4" />Importar</Button>
              </>
            )}
            <Button onClick={() => setShowNewForm(true)} className="gap-2"><Plus className="h-4 w-4" />Novo Idoso</Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Home className="h-5 w-5 text-primary" />Lista de Idosos<Badge variant="secondary">{filteredResidents.length}</Badge></CardTitle>
              <div className="relative w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar por nome ou quarto..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredResidents.length === 0 ? <p className="text-center text-muted-foreground py-8">Nenhum idoso encontrado</p> : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Quarto</TableHead><TableHead>Status</TableHead><TableHead>Observações</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredResidents.map((resident) => (
                      <TableRow key={resident.id}>
                        <TableCell className="font-medium">{resident.nome}</TableCell>
                        <TableCell>{resident.quarto || '-'}</TableCell>
                        <TableCell><Badge variant={resident.ativo ? 'default' : 'secondary'}>{resident.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                        <TableCell className="max-w-xs truncate">{resident.observacoes || '-'}</TableCell>
                        <TableCell className="text-right">
                          {canEdit && (
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => setEditingResident(resident)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(resident)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={!!editingResident} onOpenChange={() => setEditingResident(null)}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Editar Idoso</DialogTitle></DialogHeader>{editingResident && <ResidentForm resident={editingResident} onSuccess={handleEditSuccess} onCancel={() => setEditingResident(null)} />}</DialogContent></Dialog>
      <Dialog open={showNewForm} onOpenChange={setShowNewForm}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Novo Idoso</DialogTitle></DialogHeader><ResidentForm onSuccess={handleNewSuccess} onCancel={() => setShowNewForm(false)} /></DialogContent></Dialog>
    </Layout>
  );
}
