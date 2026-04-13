# Fase 0 - Congelamento e Governança
**Status:** 🚀 INICIADO - 02/04/2026

## 📋 Objetivo
Estabelecer governança, responsáveis e congelar mudanças para seguir com plano de produção.

---

## 👥 Responsáveis (DEFINIR)

| Role | Nome | Telefone/Email | Status |
|------|------|---|---|
| **Release Owner** | `[AGUARDANDO]` | - | ❌ |
| **DBA Owner** | `[AGUARDANDO]` | - | ❌ |
| **Tech Lead** | `[AGUARDANDO]` | - | ❌ |
| **Dev Responsável (Deploy)** | `[AGUARDANDO]` | - | ❌ |
| **Product/Operação** | `[AGUARDANDO]` | - | ❌ |

**Ação:** Preencher a tabela acima e confirmar disponibilidade durante janela de manutenção.

---

## 📅 Janela de Manutenção

| Aspecto | Definição | Status |
|---------|-----------|--------|
| **Data proposta** | `[AGUARDANDO]` | ❌ |
| **Horário início** | `[AGUARDANDO]` | ❌ |
| **Duração estimada** | 2-3 horas | ⏱️ |
| **Timezone** | Brazil/São_Paulo (UTC-3) | ✅ |
| **Comunicação já feita?** | Não | ❌ |
| **Stakeholders notificados?** | Não | ❌ |

**Ação:** Agenda data e hora com todos os responsáveis e notifique clientes/usuários.

---

## 🔒 Congelamento de Merge

### Status de Sincronização
```bash
# Verificar commits no DEV que ainda não estão em MAIN
git log main..dev --oneline
```

**Commits pendentes em DEV:**
```
45120c6b fix: make scrollbar visible in product dropdown
f6a180f3 feat: add custom scrollbar styling to product dropdown
f33ef1c1 fix: resolve dropdown clipping by removing overflow-hidden
35895a4a feat: hide platform filter from main dashboard
2e6cd85b feat: integracao Ecompay + dashboard individual com funil
```

**Ação:** Esses commits vão para MAIN na Fase 3 (após sucesso em staging).

### Regra de Congelamento
```markdown
⚠️ A partir de AGORA:
- ❌ Não fazer merge em MAIN (exceto hotfix crítico com aprovação do Release Owner)
- ❌ Não fazer merge em DEV (exceto bugfix com aprovação do Tech Lead)
- ✅ Apenas commits de HOTFIX são permitidos com tag [HOTFIX]
```

---

## 🏷️ Branch e Tag de Release

### Criar Branch de Release
```bash
# Criar branch de release
git checkout -b release/v1.0.0-prod

# Tag candidata
git tag -a v1.0.0-rc1 -m "Release Candidate 1 - Production Deployment"

# Não fazer push ainda! Apenas localmente até validação em Fase 2
```

**Status:** ⏳ Aguardando confirmação para criar

---

## 📝 Artefatos de Governança

### [ ] Checklist de Prontidão Final
Link: `docs/plano-producao.md#checklist-de-prontidao-final`

### [ ] Plano de Rollback
Link: `docs/plano-producao.md#rollback`

### [ ] Matriz de Responsabilidade
Link: `docs/plano-producao.md#matriz-de-responsabilidade`

---

## ✅ Checklist de Saída da Fase 0

- [ ] **Responsáveis** confirmados e designados
- [ ] **Janela de manutenção** agendada e aprovada
- [ ] **Stakeholders** notificados da janela
- [ ] **Congelamento de merge** anunciado (DEV + MAIN)
- [ ] **Branch de release** criada localmente
- [ ] **Tag candidata** v1.0.0-rc1 criada
- [ ] **Go/No-Go da Fase 0** aprovado pelo Release Owner
- [ ] **Próximos passos da Fase 1** comunicados ao time

---

## 🚨 Status Final

**Pode prosseguir para Fase 1?** ❌ Aguardando preenchimento das informações acima.

**Go/No-Go decision:** `[PENDENTE]`

---

## 📞 Próximas Ações

1. ✅ **Agora:** Preencher tabelas de responsáveis e data
2. ✅ **Próximo:** Notificar time do congelamento
3. ✅ **Então:** Prosseguir com Fase 1 - Higienização Técnica

---

**Criado:** 02/04/2026  
**Última atualização:** 02/04/2026  
**Responsável por atualização:** GitHub Copilot
