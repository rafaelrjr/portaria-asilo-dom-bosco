import { Layout } from '@/components/layout/Layout';
import { PersonForm } from '@/components/forms/PersonForm';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Navigate } from 'react-router-dom';

export default function Register() {
  const { canEdit, isLoading } = useSupabaseAuth();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!canEdit) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Cadastrar Visitante
          </h1>
          <p className="text-muted-foreground">
            Adicione um novo visitante ao sistema
          </p>
        </div>

        <PersonForm />
      </div>
    </Layout>
  );
}
