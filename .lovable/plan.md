
## Plano de Implementação Completo

Este plano aborda todos os itens pendentes e novos requisitos solicitados.

---

### 1. Criação de Tabela - Saídas do Final de Semana

**Migração SQL necessária:**
- Criar tabela `weekend_exits` com campos:
  - `id` (uuid, primary key)
  - `resident_id` (uuid, referência para residents)
  - `data_saida` (date, obrigatório)
  - `hora_saida` (time, obrigatório)
  - `data_retorno_prevista` (date, opcional)
  - `hora_retorno_prevista` (time, opcional)
  - `hora_retorno_real` (time, opcional)
  - `acompanhante` (text, obrigatório)
  - `observacoes` (text, opcional)
  - `created_at` (timestamp)

- Adicionar colunas para horário de enfermaria em `institution_settings`:
  - `horario_enfermaria_inicio` (text, default '14:30')
  - `horario_enfermaria_fim` (text, default '16:00')

**Políticas RLS para `weekend_exits`:**
- SELECT: todos autenticados
- INSERT: todos autenticados (visualizadores podem cadastrar)
- UPDATE: admin e operador
- DELETE: apenas admin

---

### 2. Correção: Logs de Auditoria Não Abre

**Problema identificado:** A página verifica `role === 'admin'` mas pode haver race condition no carregamento.

**Arquivos a modificar:**
- `src/pages/AuditLogs.tsx`

**Solução:**
- Adicionar log de console para debug
- Aguardar carregamento completo de `role` antes de verificar
- Verificar se o problema é no `getAuditLogs` (pode haver erro RLS)

---

### 3. Correção: Visualizador Ainda Pode Cadastrar

**Problema identificado:** Os botões são ocultados, mas nada impede de acessar o formulário via Dialog se a lógica não estiver completa.

**Arquivos a modificar:**
- `src/pages/Visitors.tsx` - Verificar se as condições `canEdit` estão funcionando
- `src/pages/Residents.tsx` - Mesma verificação

**Verificação adicional:**
- Confirmar que `useSupabaseAuth()` retorna `canEdit = false` para visualizadores
- Verificar se `role` está sendo carregado corretamente

---

### 4. Adicionar Tipo "Visita Religiosa"

**Arquivos a modificar:**
- `src/types/index.ts` - Adicionar `'visita_religiosa'` ao tipo `VisitorType`
- `src/lib/utils.ts` - Adicionar label "Visita Religiosa" em `getVisitorTypeLabel`
- `src/components/forms/PersonForm.tsx` - Adicionar opção no Select de tipo
- `src/components/forms/EntryForm.tsx` - Adicionar opção no Select de propósito (se necessário)

---

### 5. Nova Seção: Saídas do Final de Semana

**Arquivos a criar:**
- `src/pages/WeekendExits.tsx` - Página completa com:
  - Listagem de saídas do fim de semana
  - Formulário de cadastro (acessível para visualizadores)
  - Campos: idoso, data/hora saída, data/hora retorno previsto (opcional), acompanhante, observações
  - Visualização de status (saiu, retornou, atrasado)

**Arquivos a modificar:**
- `src/components/layout/Sidebar.tsx` - Adicionar item "Saídas Fim de Semana" para todos os roles
- `src/App.tsx` - Adicionar rota `/saidas-fim-semana`
- `src/lib/supabaseDb.ts` - Adicionar funções CRUD para `weekend_exits`
- `src/types/index.ts` - Adicionar interface `WeekendExit`

---

### 6. Menu Frota Apenas para Admin e Operador

**Arquivo a modificar:**
- `src/components/layout/Sidebar.tsx` - Alterar roles de `/frota` de `['admin', 'operador', 'visualizador']` para `['admin', 'operador']`

---

### 7. Configuração de Horário de Enfermaria

**Arquivos a modificar:**
- `src/types/index.ts` - Adicionar campos `horarioEnfermariaInicio` e `horarioEnfermariaFim` na interface `InstitutionSettings`
- `src/pages/Settings.tsx` - Adicionar campos de configuração para horário de enfermaria
- `src/lib/supabaseDb.ts` - Mapear novos campos no `getInstitutionSettings` e `saveInstitutionSettings`
- `src/components/forms/EntryForm.tsx` - Implementar lógica:
  - Se idoso selecionado tem `quarto === 'Enfermaria'`, usar horário de enfermaria
  - Verificar se visitante tem horário diferenciado (prioridade sobre horário de enfermaria)

---

### 8. Mover Relatórios para Sidebar e Backup para Configurações

**Situação atual:**
- `/relatorios` já existe na sidebar
- Configurações tem export functions mas precisa de aba de Backup

**Arquivos a modificar:**
- `src/pages/Reports.tsx` - Verificar se está completo
- `src/pages/Settings.tsx` - Garantir que a seção de exportação está na aba correta

---

### Resumo das Alterações por Arquivo

| Arquivo | Alterações |
|---------|-----------|
| `src/types/index.ts` | Adicionar `visita_religiosa` ao VisitorType; adicionar `WeekendExit` interface; adicionar campos enfermaria em InstitutionSettings |
| `src/lib/utils.ts` | Adicionar label "Visita Religiosa" |
| `src/components/layout/Sidebar.tsx` | Restringir Frota; adicionar Saídas Fim de Semana |
| `src/App.tsx` | Adicionar rota `/saidas-fim-semana` |
| `src/pages/WeekendExits.tsx` | CRIAR - Nova página |
| `src/lib/supabaseDb.ts` | Adicionar CRUD weekend_exits; mapear campos enfermaria |
| `src/pages/Settings.tsx` | Adicionar campos horário enfermaria |
| `src/components/forms/EntryForm.tsx` | Lógica de horário de enfermaria |
| `src/pages/AuditLogs.tsx` | Debug/fix do carregamento |
| `src/components/forms/PersonForm.tsx` | Adicionar opção "Visita Religiosa" |

---

### Ordem de Implementação

1. **Migração SQL** - Criar tabela `weekend_exits` e colunas de enfermaria
2. **Types e Utils** - Atualizar tipos e labels
3. **Sidebar** - Ajustar visibilidade de menus
4. **WeekendExits.tsx** - Criar página completa
5. **supabaseDb.ts** - Adicionar funções CRUD
6. **App.tsx** - Adicionar nova rota
7. **Settings.tsx** - Campos de horário enfermaria
8. **EntryForm.tsx** - Lógica de horário enfermaria
9. **AuditLogs.tsx** - Debug e correção
10. **PersonForm.tsx** - Adicionar tipo Visita Religiosa

---

### Detalhes Técnicos

**Interface WeekendExit:**
```typescript
export interface WeekendExit {
  id: string;
  residentId: string;
  resident?: Resident;
  dataSaida: string;
  horaSaida: string;
  dataRetornoPrevista?: string;
  horaRetornoPrevista?: string;
  horaRetornoReal?: string;
  acompanhante: string;
  observacoes?: string;
  createdAt: string;
}
```

**Lógica de Horário de Enfermaria no EntryForm:**
```typescript
function getApplicableVisitingHours(): { inicio: string; fim: string } {
  // 1. Se visitante tem horário especial, usar esse
  if (selectedPerson?.horarioEspecial) {
    return {
      inicio: selectedPerson.horarioEspecialInicio || '08:00',
      fim: selectedPerson.horarioEspecialFim || '17:00',
    };
  }
  
  // 2. Se idoso está na enfermaria, usar horário de enfermaria
  const selectedResident = residents.find(r => r.id === idosoId);
  if (selectedResident?.quarto?.toLowerCase() === 'enfermaria') {
    return {
      inicio: institutionSettings?.horarioEnfermariaInicio || '14:30',
      fim: institutionSettings?.horarioEnfermariaFim || '16:00',
    };
  }
  
  // 3. Usar horário normal da instituição
  return {
    inicio: institutionSettings?.horarioVisitaInicio || '08:00',
    fim: institutionSettings?.horarioVisitaFim || '17:00',
  };
}
```
