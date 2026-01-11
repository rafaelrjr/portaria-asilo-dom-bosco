import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Shield } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { getInstitutionSettings } from '@/lib/supabaseDb';
import { InstitutionSettings } from '@/types';
import { supabase as supabaseClient } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<InstitutionSettings | null>(null);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    // Verificar se já está autenticado
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });

    // Carregar configurações da instituição - usar cliente direto para evitar problemas de RLS
    async function loadSettings() {
      try {
        const { data, error } = await supabaseClient
          .from('institution_settings')
          .select('*')
          .eq('id', 'default')
          .maybeSingle();
        
        if (data && !error) {
          setSettings({
            id: data.id,
            nome: data.nome,
            endereco: data.endereco,
            telefone: data.telefone,
            cnpj: data.cnpj,
            email: data.email,
            logo: data.logo,
            horarioVisitaInicio: data.horario_visita_inicio || '08:00',
            horarioVisitaFim: data.horario_visita_fim || '17:00',
          });
        }
      } catch (err) {
        console.log('Could not load institution settings');
      }
    }
    loadSettings();
  }, [navigate]);

  async function handleLogin(data: LoginFormData) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          toast.error('Email ou senha incorretos');
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error) {
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {settings?.logo ? (
            <img src={settings.logo} alt="Logo" className="h-20 w-20 mx-auto object-contain rounded-lg" />
          ) : (
            <div className="h-16 w-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          )}
          <div>
            <CardTitle className="text-2xl">{settings?.nome || 'Sistema de Portaria'}</CardTitle>
            <CardDescription>Acesse sua conta para continuar</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Entrar
              </Button>
            </form>
          </Form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Entre em contato com o administrador para obter acesso ao sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
