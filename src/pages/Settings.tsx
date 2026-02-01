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
  getVisits,
  getResidents,
  getVehicleTrips,
  getResidentExits,
} from '@/lib/supabaseDb';
import { 
  exportVisitsReportExcel,
  exportResidentsReportExcel,
  exportVehicleTripsReportExcel,
  exportResidentExitsReportExcel,
} from '@/lib/exportUtils';
import {
  generateVisitsReportPDF,
  generateVehicleTripsReportPDF,
  generateResidentExitsReportPDF,
  generateResidentsReportPDF,
} from '@/lib/pdfUtils';
import { UserRole, InstitutionSettings } from '@/types';
import { formatCNPJ, formatPhone } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Building2, Users, Save, Camera, Upload, Shield, FileDown, FileSpreadsheet, UserPlus, Database, FileText, Home, DoorOpen, Truck } from 'lucide-react';

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
  horarioEnfermariaInicio: z.string().optional(),
  horarioEnfermariaFim: z.string().optional(),
});

type InstitutionFormData = z.infer<typeof institutionSchema>;

const newUserSchema = z.object({
  nome: z.string().min(3, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['admin', 'operador', 'visualizador']),
});

type NewUserFormData = z.infer<typeof newUserSchema>;

export default function Settings() {
  const { user: currentUser, canManage, session } = useSupabaseAuth();
  const [users, setUsers] = useState<SupabaseUser[]>([]);
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SupabaseUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('operador');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [exportingVisits, setExportingVisits] = useState(false);
  const [exportingResidents, setExportingResidents] = useState(false);
  const [exportingTrips, setExportingTrips] = useState(false);
  const [exportingExits, setExportingExits] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register: registerInstitution,
    handleSubmit: handleSubmitInstitution,
    setValue: setInstitutionValue,
    formState: { errors: institutionErrors },
  } = useForm<InstitutionFormData>({
    resolver: zodResolver(institutionSchema),
    defaultValues: { 
      nome: 'Asilo Dom Bosco', 
      horarioVisitaInicio: '08:00', 
      horarioVisitaFim: '17:00',
      horarioEnfermariaInicio: '14:30',
      horarioEnfermariaFim: '16:00',
    },
  });

  const {
    register: registerNewUser,
    handleSubmit: handleSubmitNewUser,
    reset: resetNewUserForm,
    setValue: setNewUserValue,
    watch: watchNewUser,
    formState: { errors: newUserErrors },
  } = useForm<NewUserFormData>({
    resolver: zodResolver(newUserSchema),
    defaultValues: { role: 'operador' },
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
        setInstitutionValue('horarioEnfermariaInicio', institutionData.horarioEnfermariaInicio || '14:30');
        setInstitutionValue('horarioEnfermariaFim', institutionData.horarioEnfermariaFim || '16:00');
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
        horarioEnfermariaInicio: data.horarioEnfermariaInicio || '14:30',
        horarioEnfermariaFim: data.horarioEnfermariaFim || '16:00',
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

  async function handleCreateUser(data: NewUserFormData) {
    setIsCreatingUser(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            nome: data.nome,
            email: data.email,
            password: data.password,
            role: data.role,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }

      toast.success('Usuário criado com sucesso!');
      setIsNewUserDialogOpen(false);
      resetNewUserForm();
      loadData();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar usuário');
    } finally {
      setIsCreatingUser(false);
    }
  }

  // Export functions
  async function handleExportVisitsPDF() {
    setExportingVisits(true);
    try {
      const [visits, settings] = await Promise.all([getVisits(), getInstitutionSettings()]);
      if (visits.length === 0) {
        toast.warning('Nenhuma visita encontrada');
        return;
      }
      generateVisitsReportPDF(visits, settings);
      toast.success('Relatório PDF gerado!');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setExportingVisits(false);
    }
  }

  async function handleExportVisitsExcel() {
    setExportingVisits(true);
    try {
      const visits = await getVisits();
      if (visits.length === 0) {
        toast.warning('Nenhuma visita encontrada');
        return;
      }
      await exportVisitsReportExcel(visits);
      toast.success('Excel gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar Excel');
    } finally {
      setExportingVisits(false);
    }
  }

  async function handleExportResidentsPDF() {
    setExportingResidents(true);
    try {
      const [residents, settings] = await Promise.all([getResidents(), getInstitutionSettings()]);
      if (residents.length === 0) {
        toast.warning('Nenhum idoso encontrado');
        return;
      }
      generateResidentsReportPDF(residents, settings);
      toast.success('Relatório PDF gerado!');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setExportingResidents(false);
    }
  }

  async function handleExportResidentsExcel() {
    setExportingResidents(true);
    try {
      const residents = await getResidents();
      if (residents.length === 0) {
        toast.warning('Nenhum idoso encontrado');
        return;
      }
      await exportResidentsReportExcel(residents);
      toast.success('Excel gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar Excel');
    } finally {
      setExportingResidents(false);
    }
  }

  async function handleExportTripsPDF() {
    setExportingTrips(true);
    try {
      const [trips, settings] = await Promise.all([getVehicleTrips(), getInstitutionSettings()]);
      if (trips.length === 0) {
        toast.warning('Nenhuma viagem encontrada');
        return;
      }
      generateVehicleTripsReportPDF(trips, settings);
      toast.success('Relatório PDF gerado!');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setExportingTrips(false);
    }
  }

  async function handleExportTripsExcel() {
    setExportingTrips(true);
    try {
      const trips = await getVehicleTrips();
      if (trips.length === 0) {
        toast.warning('Nenhuma viagem encontrada');
        return;
      }
      await exportVehicleTripsReportExcel(trips);
      toast.success('Excel gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar Excel');
    } finally {
      setExportingTrips(false);
    }
  }

  async function handleExportExitsPDF() {
    setExportingExits(true);
    try {
      const [exits, settings] = await Promise.all([getResidentExits(), getInstitutionSettings()]);
      if (exits.length === 0) {
        toast.warning('Nenhuma saída encontrada');
        return;
      }
      generateResidentExitsReportPDF(exits, settings);
      toast.success('Relatório PDF gerado!');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setExportingExits(false);
    }
  }

  async function handleExportExitsExcel() {
    setExportingExits(true);
    try {
      const exits = await getResidentExits();
      if (exits.length === 0) {
        toast.warning('Nenhuma saída encontrada');
        return;
      }
      await exportResidentExitsReportExcel(exits);
      toast.success('Excel gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar Excel');
    } finally {
      setExportingExits(false);
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
          <p className="text-muted-foreground">Gerencie a instituição, usuários e relatórios</p>
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

                    <div className="md:col-span-2 mt-4 pt-4 border-t">
                      <h4 className="font-medium mb-4 text-muted-foreground">Horário de Visita à Enfermaria</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="horarioEnfermariaInicio">Horário Enfermaria - Início</Label>
                          <Input
                            id="horarioEnfermariaInicio"
                            type="time"
                            {...registerInstitution('horarioEnfermariaInicio')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="horarioEnfermariaFim">Horário Enfermaria - Fim</Label>
                          <Input
                            id="horarioEnfermariaFim"
                            type="time"
                            {...registerInstitution('horarioEnfermariaFim')}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Define o horário de visita para idosos que estão na enfermaria.
                      </p>
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
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Usuários do Sistema
                  </CardTitle>
                  <Button onClick={() => setIsNewUserDialogOpen(true)} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Novo Usuário
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
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

      {/* New User Dialog */}
      <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitNewUser(handleCreateUser)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newUserNome">Nome Completo *</Label>
              <Input
                id="newUserNome"
                placeholder="Nome do usuário"
                {...registerNewUser('nome')}
                className={newUserErrors.nome ? 'border-destructive' : ''}
              />
              {newUserErrors.nome && <p className="text-sm text-destructive">{newUserErrors.nome.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newUserEmail">Email *</Label>
              <Input
                id="newUserEmail"
                type="email"
                placeholder="email@exemplo.com"
                {...registerNewUser('email')}
                className={newUserErrors.email ? 'border-destructive' : ''}
              />
              {newUserErrors.email && <p className="text-sm text-destructive">{newUserErrors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newUserPassword">Senha *</Label>
              <Input
                id="newUserPassword"
                type="password"
                placeholder="Mínimo 6 caracteres"
                {...registerNewUser('password')}
                className={newUserErrors.password ? 'border-destructive' : ''}
              />
              {newUserErrors.password && <p className="text-sm text-destructive">{newUserErrors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Perfil de Acesso *</Label>
              <Select
                value={watchNewUser('role')}
                onValueChange={(value) => setNewUserValue('role', value as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="visualizador">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsNewUserDialogOpen(false);
                  resetNewUserForm();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreatingUser} className="gap-2">
                <UserPlus className="h-4 w-4" />
                {isCreatingUser ? 'Criando...' : 'Criar Usuário'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
