# 📊 Rastreamento Geral do Plano de Produção
**Iniciado:** 02/04/2026  
**Status Geral:** 🚀 FASE 0 - CONGELAMENTO E GOVERNANÇA

---

## 📈 Progresso por Fase

| Fase | Nome | Status | Saída Esperada | Data GO |
|------|------|--------|---|---|
| **0** | Congelamento e Governança | 🔴 EM ANDAMENTO | Responsáveis + Janela | `[TBD]` |
| **1** | Higienização Técnica | ⏳ Aguardando | Schema + Migrações | `[TBD]` |
| **2** | Rehearsal em Staging | ⏳ Planejado | Validação completa | `[TBD]` |
| **3** | Execução em Produção | ⏳ Planejado | App + DB em produção | `[TBD]` |

---

## 🎯 Objetivos da Release

- ✅ Deploy de 5 commits do DEV para MAIN (bug fixes + features)
- ✅ Limpeza de schema no Supabase
- ✅ Padronização de roles (SUPER_ADMIN/ADMIN/MANAGER)
- ✅ Integração Ecompay validada
- ✅ Dropdown de produtos corrigido
- ✅ Dashboard reformulado

---

## 📋 Documentação Criada

| Documento | Localização | Status |
|-----------|-------------|--------|
| Plano de Produção | `docs/plano-producao.md` | ✅ Existente |
| Checklist Fase 0 | `docs/fase-0-checklist.md` | ✅ Criado |
| Higienização Fase 1 | `docs/fase-1-higienizacao-tecnica.md` | ✅ Criado |
| Rastreamento Geral | `docs/rastreamento-producao.md` | ✅ Este arquivo |

---

## 👥 Equipe (PREENCHER)

### Fase 0 - Decisão
| Posição | Nome/Email | Status |
|---------|---|---|
| Release Owner | `[AGUARDANDO]` | ❌ |
| Stakeholder | `[AGUARDANDO]` | ❌ |

### Fase 1 - Técnica
| Posição | Nome/Email | Status |
|---------|---|---|
| DBA Owner | `[AGUARDANDO]` | ❌ |
| Tech Lead | `[AGUARDANDO]` | ❌ |

### Fase 2 - Validação
| Posição | Nome/Email | Status |
|---------|---|---|
| QA/Tester | `[AGUARDANDO]` | ❌ |
| Produto | `[AGUARDANDO]` | ❌ |

### Fase 3 - Deploy
| Posição | Nome/Email | Status |
|---------|---|---|
| Dev Responsável | `[AGUARDANDO]` | ❌ |
| DevOps/Plataforma | `[AGUARDANDO]` | ❌ |
| Operações | `[AGUARDANDO]` | ❌ |

---

## 🔄 Estado de Branches e Tags

### DEV (release branch)
```
Commits pendentes: 5
  45120c6b fix: make scrollbar visible in product dropdown
  f6a180f3 feat: add custom scrollbar styling to product dropdown
  f33ef1c1 fix: resolve dropdown clipping by removing overflow-hidden
  35895a4a feat: hide platform filter from main dashboard
  2e6cd85b feat: integracao Ecompay + dashboard individual com funil

Status: ✅ Pronto para merge em MAIN após Fase 2
```

### MAIN (produção)
```
Status: 🔒 CONGELADO (apenas hotfix com aprovação)
Último commit: 5278ac44
```

### Release Branch
```
Nome: release/v1.0.0-prod
Status: ⏳ A ser criada em Fase 0
```

---

## 🚨 Riscos Críticos Identificados

| Risco | Severidade | Mitigação | Status |
|-------|---|---|---|
| Migração destrutiva em produção | 🔴 CRÍTICO | Revisar e recriar como incremental | ⏳ Fase 1 |
| Papéis inconsistentes (roles) | 🟠 ALTA | Normalizar BD + app + middleware | ⏳ Fase 1 |
| Segredos não validados | 🟠 ALTA | Checklist + rotação preventiva | ⏳ Fase 1 |
| Sem observabilidade pós-deploy | 🟡 MÉDIA | Setup de error tracking | ⏳ Fase 1 |
| Sem rehearsal em staging | 🟡 MÉDIA | Executar Fase 2 completa | ⏳ Fase 2 |

---

## ✅ Checklist Geral

### Fase 0 - Governança
- [ ] Responsáveis nomeados
- [ ] Janela de manutenção agendada
- [ ] Notificações enviadas
- [ ] Congelamento de merge anunciado
- [ ] Branch de release criada
- [ ] **Go de Fase 0** aprovado

### Fase 1 - Técnica
- [ ] Schema baseline extraído
- [ ] Migrações destrutivas corrigidas
- [ ] Roles normalizadas
- [ ] Segredos todos validados
- [ ] Observabilidade configurada
- [ ] **Go de Fase 1** aprovado

### Fase 2 - Staging
- [ ] Snapshot de produção restaurado
- [ ] Migração executada em staging
- [ ] App deployada em staging
- [ ] Smoke test 100% passou
- [ ] Rollback ensaiado com sucesso
- [ ] **Go de Fase 2** aprovado

### Fase 3 - Produção
- [ ] Backup pré-release validado
- [ ] Migração aplicada
- [ ] App deployada
- [ ] Smoke test pós-deploy passou
- [ ] Usuários notificados
- [ ] **Go de Fase 3** confirmado ✅

---

## 📞 Comunicação

### Stakeholders a Notificar
- [ ] Clientes/Usuários (janela de downtime)
- [ ] Time de produto (blockers durante congelamento)
- [ ] Suporte (FAQ de mudanças)

### Pontos de Comunicação
1. **Início Fase 0** → Anunciar congelamento
2. **Início Fase 2** → Validação em staging (usuários não afetados)
3. **Início Fase 3** → Aviso de janela de manutenção (15 min antes)
4. **Fim Fase 3** → Confirmação de sucesso

---

## 📅 Timeline Proposta

```
T-5: Congelamento + Fase 1 (revisão técnica completa)
T-3: Fase 2 (rehearsal em staging)
T-2: Ajustes finais baseado em Fase 2
T-1: Go/No-Go final
T+0: Fase 3 (deploy em produção) - JANELA DE MANUTENÇÃO
T+2h: Validação pós-deploy + rollback se necessário
```

---

## 🎬 Como Usar Esta Documentação

### Para Release Owner
1. Abra `docs/plano-producao.md` para visão geral
2. Preencha equipe em `docs/fase-0-checklist.md`
3. Agende janela e comunique via `checklist-producao.md`
4. Acompanhe progresso aqui neste arquivo

### Para Tech Lead
1. Abra `docs/fase-1-higienizacao-tecnica.md`
2. Execute SQL de validação
3. Revise migrações
4. Prepare observabilidade

### Para DBA
1. Abra `docs/fase-1-higienizacao-tecnica.md` seção 1-2
2. Extraia schema de produção
3. Prepare migração segura
4. Valide em staging (Fase 2)

### Para Dev Deploy
1. Abra `docs/plano-producao.md` seção "Fase 3"
2. Siga passo a passo
3. Execute smoke test após deploy

---

## 📊 Métricas de Sucesso

| Métrica | Alvo | Atual |
|---------|------|-------|
| Deploy time | < 30 min | TBD |
| Smoke test pass rate | 100% | TBD |
| Zero errors pós-deploy | 100% | TBD |
| RTO (rollback) | < 30 min | TBD |
| Usuários afetados | 0 | TBD |

---

## 🔗 Links Úteis

- Documentação oficial: `docs/plano-producao.md`
- Supabase Admin: https://app.supabase.com
- GitHub Repo: https://github.com/GuilhermeGDS-XD/superdash-ancli-sp
- Branch DEV: `dev`
- Branch MAIN: `main`

---

## 📝 Histórico de Atualização

| Data | Autor | Alteração |
|------|-------|-----------|
| 02/04/2026 | GitHub Copilot | Criação de Fase 0, 1 e rastreamento geral |

---

**Status Final:** 🟡 AGUARDANDO PREENCHIMENTO DE RESPONSÁVEIS E DATA

**Próximo Passo:** Preencher tabelas de responsáveis em `docs/fase-0-checklist.md`
