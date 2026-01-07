import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getPersons, deletePerson, getResidentById } from '@/lib/storage';
import { getVisitorTypeLabel } from '@/lib/utils';
import { Person, Resident } from '@/types';
import { PersonForm } from '@/components/forms/PersonForm';
import { Users, Search, Edit, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function Visitors() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [residentCache, setResidentCache] = useState<Map<string, Resident | undefined>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => { loadPersons(); }, []);

  async function loadPersons() {
    const data = await getPersons();
    setPersons(data.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
    const cache = new Map<string, Resident | undefined>();
    for (const p of data) {
      if (p.idosoVinculado) {
        const res = await getResidentById(p.idosoVinculado);
        cache.set(p.idosoVinculado, res);
      }
    }
    setResidentCache(cache);
  }

  async function handleDelete(person: Person) {
    if (confirm(`Deseja realmente excluir ${person.nome}?`)) {
      await deletePerson(person.id);
      loadPersons();
      toast.success('Pessoa excluída com sucesso');
    }
  }

  function handleEditSuccess() { setEditingPerson(null); loadPersons(); }
  function handleNewSuccess() { setShowNewForm(false); loadPersons(); }

  const filteredPersons = persons.filter((p) => p.nome.toLowerCase().includes(searchQuery.toLowerCase()) || p.cpf.includes(searchQuery) || p.rg.includes(searchQuery));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="font-display text-3xl font-bold tracking-tight">Visitantes Cadastrados</h1><p className="text-muted-foreground">Gerencie os visitantes cadastrados no sistema</p></div>
          <Button onClick={() => setShowNewForm(true)} className="gap-2"><Plus className="h-4 w-4" />Novo Visitante</Button>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Lista de Visitantes<Badge variant="secondary">{filteredPersons.length}</Badge></CardTitle>
              <div className="relative w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar por nome, CPF ou RG..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredPersons.length === 0 ? <p className="text-center text-muted-foreground py-8">Nenhum visitante encontrado</p> : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>CPF</TableHead><TableHead>Telefone</TableHead><TableHead>Tipo</TableHead><TableHead>Idoso Vinculado</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredPersons.map((person) => {
                      const idoso = person.idosoVinculado ? residentCache.get(person.idosoVinculado) : undefined;
                      return (
                        <TableRow key={person.id}>
                          <TableCell className="font-medium">{person.nome}</TableCell>
                          <TableCell>{person.cpf}</TableCell>
                          <TableCell>{person.telefone}</TableCell>
                          <TableCell><Badge variant="outline">{getVisitorTypeLabel(person.tipo)}</Badge></TableCell>
                          <TableCell>{idoso ? `${idoso.nome}${idoso.quarto ? ` (Q.${idoso.quarto})` : ''}` : '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => setEditingPerson(person)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(person)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={!!editingPerson} onOpenChange={() => setEditingPerson(null)}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Editar Visitante</DialogTitle></DialogHeader>{editingPerson && <PersonForm person={editingPerson} onSuccess={handleEditSuccess} onCancel={() => setEditingPerson(null)} />}</DialogContent></Dialog>
      <Dialog open={showNewForm} onOpenChange={setShowNewForm}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Novo Visitante</DialogTitle></DialogHeader><PersonForm onSuccess={handleNewSuccess} onCancel={() => setShowNewForm(false)} /></DialogContent></Dialog>
    </Layout>
  );
}
