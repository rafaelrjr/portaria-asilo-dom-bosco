import { Layout } from '@/components/layout/Layout';
import { EntryForm } from '@/components/forms/EntryForm';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Navigate } from 'react-router-dom';

export default function Entry() {
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
            Registrar Entrada
          </h1>
          <p className="text-muted-foreground">
            Registre a entrada de visitantes no Asilo Dom Bosco
          </p>
        </div>

        <EntryForm />
      </div>
    </Layout>
  );
}
