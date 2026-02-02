

## Diagnóstico: Lista de Idosos Vazia

### Causa Identificada

A consulta à tabela `residents` retornou **zero registros**. Isso significa que:

1. **O código está correto** - A função `getResidents()` não possui filtro de `autorizadoSaidaTemporaria`
2. **Não há idosos cadastrados** - A tabela `residents` está vazia no banco de dados

O código atual na linha 62 de `WeekendExits.tsx`:
```typescript
setResidents(residentsData.filter(r => r.ativo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
```

Este código carrega **todos** os idosos ativos, sem filtro adicional. O problema não é técnico - simplesmente não há dados para mostrar.

---

### Solução

Para que a seleção de idosos funcione na página "Saídas Fim de Semana", é necessário:

1. **Cadastrar idosos no sistema** através do menu "Idosos" > "Novo Idoso"
2. Garantir que os idosos cadastrados tenham o campo `ativo = true`

---

### Verificação Realizada

| Item | Status |
|------|--------|
| Código de carregamento | Correto |
| Filtro de saída temporária | Não existe (correto) |
| Registros na tabela residents | 0 registros |
| Políticas RLS | Funcionando |
| Erros de banco de dados | Nenhum |

---

### Próximos Passos

Posso continuar com as outras implementações pendentes do plano anterior:

1. Remover menu "Novo Cadastro"
2. Permitir visualizadores cadastrar idosos
3. Adicionar coluna "Destino" na Frota
4. Corrigir relatórios sem dados
5. Adicionar justificativas ao histórico/relatórios
6. Adicionar "Visita Religiosa", "PSC" e "Voluntariado"

**Deseja que eu prossiga com essas implementações?**

