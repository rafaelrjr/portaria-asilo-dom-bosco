import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layout } from '@/components/layout/Layout';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  getInstitutionSettings, 
  saveInstitutionSettings,
} from '@/lib/supabaseDb';
import { UserRole, InstitutionSettings } from '@/types';
import { formatCNPJ, formatPhone } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Building2, Users, Save, Camera, Upload, Shield } from 'lucide-react';

interface SupabaseUser {
  id: string;
  user_id: string;
  username: string;
  nome: string;
  email: string | null;
  ativo: boolean;
  role: UserRole | null;
  created_at: string;
}

const institutionSchema = z.object({
  nome: z.string().min(3, 'Nome é obrigatório'),
  cnpj: z.string().optional(),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  horarioVisitaInicio: z.string().optional(),
  horarioVisitaFim: z.string().optional(),
});

type InstitutionFormData = z.infer<typeof institutionSchema>;

export default function Settings() {
  const { user: currentUser, canManage } = useSupabaseAuth();
  const [users, setUsers] = useState<SupabaseUser[]>([]);
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SupabaseUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('operador');
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register: registerInstitution,
    handleSubmit: handleSubmitInstitution,
    setValue: setInstitutionValue,
    formState: { errors: institutionErrors },
  } = useForm<InstitutionFormData>({
    resolver: zodResolver(institutionSchema),
    defaultValues: { nome: 'Asilo Dom Bosco', horarioVisitaInicio: '08:00', horarioVisitaFim: '17:00' },
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [institutionData] = await Promise.all([
        getInstitutionSettings(),
      ]);
      
      if (institutionData) {
        setLogo(institutionData.logo);
        setInstitutionValue('nome', institutionData.nome || '');
        setInstitutionValue('cnpj', institutionData.cnpj || '');
        setInstitutionValue('endereco', institutionData.endereco || '');
        setInstitutionValue('telefone', institutionData.telefone || '');
        setInstitutionValue('email', institutionData.email || '');
        setInstitutionValue('horarioVisitaInicio', institutionData.horarioVisitaInicio || '08:00');
        setInstitutionValue('horarioVisitaFim', institutionData.horarioVisitaFim || '17:00');
      }

      // Load users from profiles and user_roles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('nome');

      const { data: roles } = await supabase
        .from('user_roles')
        .select('*');

      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role as UserRole]) || []);

      const usersWithRoles: SupabaseUser[] = (profiles || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        username: p.username,
        nome: p.nome,
        email: p.email,
        ativo: p.ativo ?? true,
        role: rolesMap.get(p.user_id) || null,
        created_at: p.created_at,
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  }

  function handleCNPJChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInstitutionValue('cnpj', formatCNPJ(e.target.value));
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInstitutionValue('telefone', formatPhone(e.target.value));
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogo(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function onSubmitInstitution(data: InstitutionFormData) {
    try {
      const settings: InstitutionSettings = {
        nome: data.nome,
        cnpj: data.cnpj || '',
        endereco: data.endereco || '',
        telefone: data.telefone || '',
        email: data.email || '',
        horarioVisitaInicio: data.horarioVisitaInicio || '08:00',
        horarioVisitaFim: data.horarioVisitaFim || '17:00',
        logo,
      };
      await saveInstitutionSettings(settings);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  }

  function handleEditRole(user: SupabaseUser) {
    setSelectedUser(user);
    setSelectedRole(user.role || 'operador');
    setIsRoleDialogOpen(true);
  }

  async function handleSaveRole() {
    if (!selectedUser) return;

    try {
      // Verificar se já existe role para o usuário
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', selectedUser.user_id)
        .maybeSingle();

      if (existingRole) {
        // Atualizar role existente
        const { error } = await supabase
          .from('user_roles')
          .update({ role: selectedRole })
          .eq('user_id', selectedUser.user_id);
        
        if (error) throw error;
      } else {
        // Inserir nova role
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: selectedUser.user_id,
            role: selectedRole,
          });
        
        if (error) throw error;
      }

      toast.success('Perfil atualizado com sucesso!');
      setIsRoleDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erro ao atualizar perfil');
    }
  }

  async function handleToggleUserActive(user: SupabaseUser) {
    if (user.user_id === currentUser?.id) {
      toast.error('Você não pode desativar seu próprio usuário');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ativo: !user.ativo })
        .eq('user_id', user.user_id);

      if (error) throw error;

      toast.success(user.ativo ? 'Usuário desativado' : 'Usuário ativado');
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  }

  function getRoleLabel(role: UserRole | null): string {
    if (!role) return 'Sem perfil';
    const labels: Record<UserRole, string> = {
      admin: 'Administrador',
      operador: 'Operador',
      visualizador: 'Visualizador',
    };
    return labels[role];
  }

  function getRoleBadgeVariant(role: UserRole | null): 'default' | 'secondary' | 'outline' {
    if (!role) return 'outline';
    const variants: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
      admin: 'default',
      operador: 'secondary',
      visualizador: 'outline',
    };
    return variants[role];
  }

  if (!canManage) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie a instituição e usuários do sistema</p>
        </div>

        <Tabs defaultValue="institution" className="space-y-6">
          <TabsList>
            <TabsTrigger value="institution" className="gap-2">
              <Building2 className="h-4 w-4" />
              Instituição
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="institution">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Dados da Instituição
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitInstitution(onSubmitInstitution)} className="space-y-6">
                  {/* Logo */}
                  <div className="flex flex-col items-center gap-4 pb-6 border-b">
                    <div className="relative">
                      {logo ? (
                        <img
                          src={logo}
                          alt="Logo"
                          className="h-32 w-auto max-w-xs object-contain rounded-lg border"
                        />
                      ) : (
                        <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-muted border-2 border-dashed">
                          <Camera className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {logo ? 'Alterar Logo' : 'Carregar Logo'}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      A logo será exibida nos relatórios e na tela de login
                    </p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="nome">Nome da Instituição *</Label>
                      <Input
                        id="nome"
                        placeholder="Nome da instituição"
                        {...registerInstitution('nome')}
                        className={institutionErrors.nome ? 'border-destructive' : ''}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        placeholder="00.000.000/0000-00"
                        {...registerInstitution('cnpj')}
                        onChange={handleCNPJChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        placeholder="(00) 0000-0000"
                        {...registerInstitution('telefone')}
                        onChange={handlePhoneChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@exemplo.com"
                        {...registerInstitution('email')}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="endereco">Endereço</Label>
                      <Textarea
                        id="endereco"
                        placeholder="Endereço completo"
                        rows={2}
                        {...registerInstitution('endereco')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="horarioVisitaInicio">Horário de Visita - Início</Label>
                      <Input
                        id="horarioVisitaInicio"
                        type="time"
                        {...registerInstitution('horarioVisitaInicio')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="horarioVisitaFim">Horário de Visita - Fim</Label>
                      <Input
                        id="horarioVisitaFim"
                        type="time"
                        {...registerInstitution('horarioVisitaFim')}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" className="gap-2">
                      <Save className="h-4 w-4" />
                      Salvar Configurações
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Usuários do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Usuários são criados através da tela de cadastro. Aqui você pode gerenciar os perfis de acesso.
                </p>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Nenhum usuário cadastrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.nome}</TableCell>
                            <TableCell>{user.email || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(user.role)}>
                                {getRoleLabel(user.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={user.ativo}
                                onCheckedChange={() => handleToggleUserActive(user)}
                                disabled={user.user_id === currentUser?.id}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditRole(user)}
                                className="gap-2"
                              >
                                <Shield className="h-4 w-4" />
                                Perfil
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Níveis de Acesso:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li><strong>Administrador:</strong> Acesso total ao sistema, gerencia usuários e configurações.</li>
                    <li><strong>Operador:</strong> Registra entradas, saídas e cadastros. Não gerencia usuários.</li>
                    <li><strong>Visualizador:</strong> Apenas consulta dados e emite relatórios.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Role Edit Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Perfil de Acesso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Usuário: <strong>{selectedUser?.nome}</strong>
            </p>
            <div className="space-y-2">
              <Label>Perfil de Acesso</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    Administrador - Acesso total
                  </SelectItem>
                  <SelectItem value="operador">
                    Operador - Registra entradas e saídas
                  </SelectItem>
                  <SelectItem value="visualizador">
                    Visualizador - Apenas consulta e relatórios
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsRoleDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveRole} className="gap-2">
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
