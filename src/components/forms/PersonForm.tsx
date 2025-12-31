import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Person, VisitorType } from '@/types';
import { savePerson, getResidents } from '@/lib/storage';
import { formatCPF, formatPhone, formatRG, generateId } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { UserPlus, Save } from 'lucide-react';

const personSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf: z.string().min(14, 'CPF inválido'),
  rg: z.string().optional(),
  telefone: z.string().min(14, 'Telefone inválido'),
  tipo: z.string(),
  parentesco: z.string().optional(),
  idosoVinculado: z.string().optional(),
  observacoes: z.string().optional(),
});

type PersonFormData = z.infer<typeof personSchema>;

interface PersonFormProps {
  person?: Person;
  onSuccess?: (person: Person) => void;
  onCancel?: () => void;
}

export function PersonForm({ person, onSuccess, onCancel }: PersonFormProps) {
  const [residents, setResidents] = useState(getResidents());
  const isEditing = !!person;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues: person || {
      tipo: 'familiar',
    },
  });

  const tipoVisitante = watch('tipo');

  useEffect(() => {
    setResidents(getResidents().filter(r => r.ativo));
  }, []);

  function handleCPFChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue('cpf', formatCPF(e.target.value));
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue('telefone', formatPhone(e.target.value));
  }

  function handleRGChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue('rg', formatRG(e.target.value));
  }

  function onSubmit(data: PersonFormData) {
    const newPerson: Person = {
      id: person?.id || generateId(),
      nome: data.nome,
      cpf: data.cpf,
      rg: data.rg || '',
      telefone: data.telefone,
      tipo: data.tipo as VisitorType,
      parentesco: data.parentesco,
      idosoVinculado: data.idosoVinculado,
      observacoes: data.observacoes,
      createdAt: person?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    savePerson(newPerson);
    toast.success(isEditing ? 'Cadastro atualizado!' : 'Pessoa cadastrada com sucesso!');
    
    if (onSuccess) {
      onSuccess(newPerson);
    } else {
      reset();
    }
  }

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          {isEditing ? 'Editar Cadastro' : 'Novo Cadastro de Visitante'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Nome */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                placeholder="Digite o nome completo"
                {...register('nome')}
                className={errors.nome ? 'border-destructive' : ''}
              />
              {errors.nome && (
                <p className="text-sm text-destructive">{errors.nome.message}</p>
              )}
            </div>

            {/* CPF */}
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                {...register('cpf')}
                onChange={handleCPFChange}
                className={errors.cpf ? 'border-destructive' : ''}
              />
              {errors.cpf && (
                <p className="text-sm text-destructive">{errors.cpf.message}</p>
              )}
            </div>

            {/* RG */}
            <div className="space-y-2">
              <Label htmlFor="rg">RG</Label>
              <Input
                id="rg"
                placeholder="Número do RG"
                {...register('rg')}
                onChange={handleRGChange}
              />
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                placeholder="(00) 00000-0000"
                {...register('telefone')}
                onChange={handlePhoneChange}
                className={errors.telefone ? 'border-destructive' : ''}
              />
              {errors.telefone && (
                <p className="text-sm text-destructive">{errors.telefone.message}</p>
              )}
            </div>

            {/* Tipo de Visitante */}
            <div className="space-y-2">
              <Label>Tipo de Visitante *</Label>
              <Select
                value={tipoVisitante}
                onValueChange={(value) => setValue('tipo', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="familiar">Familiar</SelectItem>
                  <SelectItem value="prestador">Prestador de Serviço</SelectItem>
                  <SelectItem value="acao_social">Ação Social</SelectItem>
                  <SelectItem value="visita_geral">Visita Geral</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Parentesco (condicional) */}
            {tipoVisitante === 'familiar' && (
              <div className="space-y-2">
                <Label htmlFor="parentesco">Parentesco</Label>
                <Input
                  id="parentesco"
                  placeholder="Ex: Filho(a), Neto(a), Sobrinho(a)"
                  {...register('parentesco')}
                />
              </div>
            )}

            {/* Idoso Vinculado (condicional) */}
            {tipoVisitante === 'familiar' && (
              <div className="space-y-2">
                <Label>Idoso Vinculado</Label>
                <Select
                  value={watch('idosoVinculado') || ''}
                  onValueChange={(value) => setValue('idosoVinculado', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o idoso" />
                  </SelectTrigger>
                  <SelectContent>
                    {residents.map((resident) => (
                      <SelectItem key={resident.id} value={resident.id}>
                        {resident.nome} - Quarto {resident.quarto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Observações */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Observações adicionais..."
                rows={3}
                {...register('observacoes')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              <Save className="h-4 w-4" />
              {isEditing ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
