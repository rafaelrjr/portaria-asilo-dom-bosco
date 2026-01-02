import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getInstitutionSettings, 
  saveInstitutionSettings,
  getUsers,
  saveUser,
  deleteUser,
  simpleHash
} from '@/lib/storage';
import { User, UserRole, InstitutionSettings } from '@/types';
import { generateId, formatCNPJ, formatPhone } from '@/lib/utils';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Building2, Users, Save, UserPlus, Trash2, Camera, Upload, Key } from 'lucide-react';

const institutionSchema = z.object({
  nome: z.string().min(3, 'Nome é obrigatório'),
  cnpj: z.string().optional(),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  responsavel: z.string().optional(),
  observacoes: z.string().optional(),
});

type InstitutionFormData = z.infer<typeof institutionSchema>;

const userSchema = z.object({
  username: z.string().min(3, 'Usuário deve ter pelo menos 3 caracteres'),
  password: z.string().optional(),
  nome: z.string().min(3, 'Nome é obrigatório'),
  role: z.string(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
});

type UserFormData = z.infer<typeof userSchema>;

export default function Settings() {
  const { user: currentUser, canManage } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register: registerInstitution,
    handleSubmit: handleSubmitInstitution,
    setValue: setInstitutionValue,
    formState: { errors: institutionErrors },
  } = useForm<InstitutionFormData>({
    resolver: zodResolver(institutionSchema),
    defaultValues: { nome: 'Asilo Dom Bosco' },
  });

  const {
    register: registerUser,
    handleSubmit: handleSubmitUser,
    reset: resetUser,
    setValue: setUserValue,
    watch: watchUser,
    formState: { errors: userErrors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: 'operador' },
  });

  const selectedRole = watchUser('role');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [usersData, institutionData] = await Promise.all([
        getUsers(),
        getInstitutionSettings()
      ]);
      setUsers(usersData);
      if (institutionData) {
        setLogo(institutionData.logo);
        setInstitutionValue('nome', institutionData.nome);
        setInstitutionValue('cnpj', institutionData.cnpj);
        setInstitutionValue('endereco', institutionData.endereco);
        setInstitutionValue('telefone', institutionData.telefone);
        setInstitutionValue('email', institutionData.email);
        setInstitutionValue('responsavel', institutionData.responsavel);
        setInstitutionValue('observacoes', institutionData.observacoes);
      }
      setIsLoading(false);
    }
    loadData();
  }, [setInstitutionValue]);

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
    const settings: InstitutionSettings = {
      nome: data.nome,
      cnpj: data.cnpj || '',
      endereco: data.endereco || '',
      telefone: data.telefone || '',
      email: data.email || '',
      responsavel: data.responsavel || '',
      observacoes: data.observacoes,
      logo,
    };
    await saveInstitutionSettings(settings);
    toast.success('Configurações salvas com sucesso!');
  }

  async function onSubmitUser(data: UserFormData) {
    // Validate password for new users
    if (!editingUser && (!data.password || data.password.length < 6)) {
      toast.error('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    // Validate email for admin users
    if (data.role === 'admin' && !data.email) {
      toast.error('E-mail é obrigatório para usuários administradores');
      return;
    }

    const newUser: User = {
      id: editingUser?.id || generateId(),
      username: data.username,
      password: editingUser && !data.password 
        ? editingUser.password 
        : simpleHash(data.password!),
      nome: data.nome,
      role: data.role as UserRole,
      email: data.role === 'admin' ? data.email : undefined,
      ativo: true,
      createdAt: editingUser?.createdAt || new Date().toISOString(),
    };

    await saveUser(newUser);
    const updatedUsers = await getUsers();
    setUsers(updatedUsers);
    setIsUserDialogOpen(false);
    setEditingUser(null);
    resetUser({ role: 'operador' });
    toast.success(editingUser ? 'Usuário atualizado!' : 'Usuário criado com sucesso!');
  }

  function handleEditUser(user: User) {
    setEditingUser(user);
    setUserValue('username', user.username);
    setUserValue('nome', user.nome);
    setUserValue('role', user.role);
    setUserValue('email', user.email || '');
    setUserValue('password', '');
    setIsUserDialogOpen(true);
  }

  async function handleDeleteUser(userId: string) {
    if (userId === currentUser?.id) {
      toast.error('Você não pode excluir seu próprio usuário');
      return;
    }
    await deleteUser(userId);
    const updatedUsers = await getUsers();
    setUsers(updatedUsers);
    toast.success('Usuário excluído');
  }

  async function handleToggleUserActive(user: User) {
    if (user.id === currentUser?.id) {
      toast.error('Você não pode desativar seu próprio usuário');
      return;
    }
    await saveUser({ ...user, ativo: !user.ativo });
    const updatedUsers = await getUsers();
    setUsers(updatedUsers);
  }

  function handleResetPasswordClick(user: User) {
    setUserToResetPassword(user);
    setNewPassword('');
    setIsResetPasswordDialogOpen(true);
  }

  async function handleResetPassword() {
    if (!userToResetPassword || newPassword.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    await saveUser({ 
      ...userToResetPassword, 
      password: simpleHash(newPassword) 
    });
    const updatedUsers = await getUsers();
    setUsers(updatedUsers);
    setIsResetPasswordDialogOpen(false);
    setUserToResetPassword(null);
    setNewPassword('');
    toast.success('Senha redefinida com sucesso!');
  }

  function getRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      admin: 'Administrador',
      operador: 'Operador',
      visualizador: 'Visualizador',
    };
    return labels[role];
  }

  function getRoleBadgeVariant(role: UserRole): 'default' | 'secondary' | 'outline' {
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

                    <div className="space-y-2">
                      <Label htmlFor="responsavel">Responsável</Label>
                      <Input
                        id="responsavel"
                        placeholder="Nome do responsável"
                        {...registerInstitution('responsavel')}
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

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="observacoes">Observações</Label>
                      <Textarea
                        id="observacoes"
                        placeholder="Observações adicionais..."
                        rows={3}
                        {...registerInstitution('observacoes')}
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Usuários do Sistema
                </CardTitle>
                <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditingUser(null); resetUser({ role: 'operador' }); }} className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Novo Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmitUser(onSubmitUser)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Usuário *</Label>
                        <Input
                          id="username"
                          placeholder="Nome de usuário"
                          {...registerUser('username')}
                          className={userErrors.username ? 'border-destructive' : ''}
                        />
                        {userErrors.username && (
                          <p className="text-sm text-destructive">{userErrors.username.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">
                          Senha {editingUser ? '(deixe vazio para manter)' : '*'}
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="******"
                          {...registerUser('password')}
                          className={userErrors.password ? 'border-destructive' : ''}
                        />
                        {!editingUser && (
                          <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome Completo *</Label>
                        <Input
                          id="nome"
                          placeholder="Nome completo"
                          {...registerUser('nome')}
                          className={userErrors.nome ? 'border-destructive' : ''}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Perfil de Acesso *</Label>
                        <Select
                          value={selectedRole}
                          onValueChange={(value) => setUserValue('role', value)}
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

                      {selectedRole === 'admin' && (
                        <div className="space-y-2">
                          <Label htmlFor="email">E-mail * (para recuperação de senha)</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="email@exemplo.com"
                            {...registerUser('email')}
                            className={userErrors.email ? 'border-destructive' : ''}
                          />
                          <p className="text-xs text-muted-foreground">
                            Obrigatório para administradores
                          </p>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsUserDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" className="gap-2">
                          <Save className="h-4 w-4" />
                          {editingUser ? 'Salvar' : 'Criar'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.nome}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {getRoleLabel(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={user.ativo}
                              onCheckedChange={() => handleToggleUserActive(user)}
                              disabled={user.id === currentUser?.id}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResetPasswordClick(user)}
                                disabled={user.id === currentUser?.id}
                                title="Redefinir Senha"
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={user.id === currentUser?.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Níveis de Acesso:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li><strong>Administrador:</strong> Acesso total ao sistema, gerencia usuários e configurações. Requer e-mail para recuperação de senha.</li>
                    <li><strong>Operador:</strong> Registra entradas, saídas e cadastros. Não gerencia usuários. Recuperação de senha somente pelo admin.</li>
                    <li><strong>Visualizador:</strong> Apenas consulta dados e emite relatórios. Recuperação de senha somente pelo admin.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Redefinir senha do usuário: <strong>{userToResetPassword?.nome}</strong>
            </p>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsResetPasswordDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleResetPassword} className="gap-2">
                <Key className="h-4 w-4" />
                Redefinir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
