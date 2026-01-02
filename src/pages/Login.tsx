import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getInstitutionSettings } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { LogIn, Building2 } from 'lucide-react';
import { InstitutionSettings } from '@/types';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [institution, setInstitution] = useState<InstitutionSettings | null>(null);

  useEffect(() => {
    getInstitutionSettings().then(setInstitution);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        toast.success('Login realizado com sucesso!');
        navigate('/');
      } else {
        toast.error('Usuário ou senha inválidos');
      }
    } catch {
      toast.error('Erro ao realizar login');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md animate-slide-up">
        <CardHeader className="text-center space-y-4">
          {institution?.logo ? (
            <img src={institution.logo} alt="Logo" className="h-20 w-auto mx-auto object-contain" />
          ) : (
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Building2 className="h-12 w-12 text-primary" />
              </div>
            </div>
          )}
          <div>
            <CardTitle className="text-2xl font-display">{institution?.nome || 'Asilo Dom Bosco'}</CardTitle>
            <CardDescription>Sistema de Portaria</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input id="username" placeholder="Digite seu usuário" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" placeholder="Digite sua senha" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              <LogIn className="h-4 w-4" />
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-6">Primeiro acesso? Use: admin / admin123</p>
        </CardContent>
      </Card>
    </div>
  );
}
