# Implementações Concluídas

## Alterações Realizadas

| Item | Status |
|------|--------|
| Remover menu "Novo Cadastro" | ✅ Concluído |
| Permitir visualizadores cadastrar idosos | ✅ Concluído (RLS + UI) |
| Adicionar coluna "Destino" na Frota | ✅ Concluído |
| Corrigir relatórios sem dados | ✅ Concluído (imports corrigidos) |
| Adicionar observações no histórico | ✅ Concluído |
| Adicionar observações no PDF de visitas | ✅ Concluído |
| Adicionar PSC e Voluntariado | ✅ Concluído |
| Adicionar Visita Religiosa ao propósito | ✅ Concluído |

---

## Detalhes Técnicos

### 1. Sidebar
- Removido item "Novo Cadastro" (linha 15 anterior)
- Removido import de `UserPlus` não utilizado

### 2. Permissões de Idosos
- Migração RLS: `Residents insertable by authenticated` permite INSERT para todos autenticados
- UI: Botão "Novo Idoso" agora visível para todos (import/exclusão ainda requer `canEdit`)

### 3. Frota
- Adicionada coluna "Destino" após "Motorista" na tabela de histórico

### 4. Relatórios
- Corrigido import em `exportUtils.ts`: usa `supabaseDb` ao invés de `storage`
- Corrigido import em `History.tsx`: usa `supabaseDb` ao invés de `storage`

### 5. Observações/Justificativas
- Adicionada coluna "Observações" na tabela do histórico
- PDF de visitas agora inclui coluna de observações (modo landscape)

### 6. Novos Tipos
- `VisitorType`: adicionados `psc` e `voluntariado`
- `VisitPurpose`: adicionados `visita_religiosa`, `psc` e `voluntariado`
- Labels atualizados em `utils.ts`
- Selects atualizados em `PersonForm.tsx` e `EntryForm.tsx`
- Labels no PDF atualizados em `pdfUtils.ts`

