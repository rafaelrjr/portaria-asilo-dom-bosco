import { Layout } from '@/components/layout/Layout';
import { EntryForm } from '@/components/forms/EntryForm';

export default function Entry() {
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
