

# Restrição de Visita - Permissões Atualizadas

## Resumo

Implementar o sistema de lista de restrição de visitas conforme planejado anteriormente, com a seguinte alteração de permissões: apenas **admin** e **visualizador** podem cadastrar, alterar ou excluir pessoas da lista de restrição. O operador apenas visualiza a lista e recebe o alerta ao registrar entrada.

## Permissões por perfil

| Acao | Admin | Visualizador | Operador |
|------|-------|--------------|----------|
| Ver lista de restrições | Sim | Sim | Sim (para verificação na entrada) |
| Cadastrar restrição | Sim | Sim | Nao |
| Editar restrição | Sim | Sim | Nao |
| Excluir restrição | Sim | Nao | Nao |
| Receber alerta na entrada | N/A | N/A | Sim |

## Menu lateral

O item "Restrições" ficara visivel para **admin** e **visualizador** na sidebar. O operador nao tera acesso a pagina de gestao, mas a verificação automatica ocorre no formulario de entrada.

---

## Detalhes Tecnicos

### 1. Tabela `restricted_persons` (migracao)

```sql
CREATE TABLE public.restricted_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text,
  data_nascimento date,
  resident_id uuid REFERENCES public.residents(id),
  motivo text NOT NULL,
  ativo boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.restricted_persons ENABLE ROW LEVEL SECURITY;

-- Leitura por todos autenticados (necessario para verificar na entrada)
CREATE POLICY "Restricted readable by authenticated"
  ON public.restricted_persons FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Inserção por admin e visualizador
CREATE POLICY "Restricted insertable by admin and viewer"
  ON public.restricted_persons FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'visualizador')
  );

-- Atualização por admin e visualizador
CREATE POLICY "Restricted updatable by admin and viewer"
  ON public.restricted_persons FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'visualizador')
  );

-- Exclusão apenas por admin
CREATE POLICY "Restricted deletable by admin"
  ON public.restricted_persons FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_restricted_persons_updated_at
  BEFORE UPDATE ON public.restricted_persons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

Nota: o enum `app_role` precisara incluir `'visualizador'`. Sera verificado se ja existe; caso contrario, sera adicionado via `ALTER TYPE`.

### 2. Tipo TypeScript (`src/types/index.ts`)

Adicionar interface `RestrictedPerson` com campos: id, nome, cpf, dataNascimento, residentId, motivo, ativo, createdBy, createdAt, updatedAt.

### 3. Funcoes de banco (`src/lib/supabaseDb.ts`)

- `getRestrictedPersons()` - listar todas as pessoas restritas
- `saveRestrictedPerson(data)` - criar/atualizar com audit log
- `deleteRestrictedPerson(id)` - remover com audit log
- `checkRestriction(cpf, nome)` - verificar se pessoa esta na lista ativa (busca por CPF exato ou nome)

### 4. Nova pagina `/restricoes` (`src/pages/Restrictions.tsx`)

- Tabela com lista de pessoas restritas (nome, CPF, data nasc., idoso vinculado, motivo, status)
- Botao para adicionar nova restrição via dialog
- Edicao por admin e visualizador; exclusao somente por admin
- Busca por nome/CPF
- Acesso apenas para admin e visualizador (redirecionamento se operador tentar acessar)

### 5. Sidebar (`src/components/layout/Sidebar.tsx`)

- Adicionar item "Restrições" com icone `ShieldBan`, visivel para `['admin', 'visualizador']`

### 6. Rotas (`src/App.tsx`)

- Adicionar rota `/restricoes` protegida

### 7. Alteracao no EntryForm (`src/components/forms/EntryForm.tsx`)

- Ao selecionar uma pessoa (`handleSelectPerson`), chamar `checkRestriction` com CPF/nome
- Se encontrar restrição ativa, exibir dialog vermelho com:
  - Icone de alerta e mensagem "ATENCAO: Esta pessoa possui restrição de acesso"
  - Motivo da restrição
  - Campo de justificativa obrigatoria
  - Botoes "Cancelar" e "Prosseguir com Justificativa"
- Se prosseguir, justificativa gravada nas observacoes da visita com prefixo `[RESTRIÇÃO IGNORADA]`

### 8. Relatorios e Historico

- Visitas com `[RESTRIÇÃO IGNORADA]` aparecem nos relatorios existentes via campo observacoes
- Audit logs capturam todas as operacoes na tabela `restricted_persons`

---

## Sequencia de Implementacao

1. Verificar/adicionar valor `visualizador` ao enum `app_role` e criar tabela `restricted_persons`
2. Adicionar tipo `RestrictedPerson` e funcoes CRUD em `supabaseDb.ts`
3. Criar pagina `Restrictions.tsx` com formulario e listagem
4. Adicionar rota em `App.tsx` e item de menu na sidebar
5. Integrar verificacao de restricao no `EntryForm`

