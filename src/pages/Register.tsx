import { Layout } from '@/components/layout/Layout';
import { PersonForm } from '@/components/forms/PersonForm';

export default function Register() {
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
