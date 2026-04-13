# Fase 1 - Higienização Técnica
**Status:** ⏳ AGUARDANDO GO de Fase 0  
**Período previsto:** T-5 até T-1 (5 dias virada para produção)

---

## 1️⃣ Fechar Baseline de Schema de Produção

### 1.1 Extrair Schema Atual Remoto
```sql
-- Executar no Supabase SQL Editor de PRODUÇÃO
-- Copiar resultado para análise local
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Exportar também índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public';

-- Exportar constraints
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints
WHERE table_schema = 'public';
```

**Ação:** Arquivo a ser salvo: `docs/schema-producao-baseline.sql`

---

### 1.2 Listar Migrações Aplicadas em Produção
```bash
# No Supabase, verificar quais migrações foram executadas
# Tabela: _schema_migrations (schema supabase)

SELECT 
  version,
  name,
  executed_at
FROM supabase.schema_migrations
ORDER BY version DESC;
```

**Ação:** Documentar qual é o último `version` aplicado em produção.

---

### 1.3 Comparar com Migrações Locais

```bash
# Listar arquivos de migração locais
ls -la supabase/migrations/

# Identificar: quais são novas? Quais podem ser destrutivas?
```

**Migrações encontradas localmente:**
- `20260302032806_final_rebuild_success.sql` ⚠️ **DESTRUTIVA** (contains DROP TABLE)
- (Adicionar outras conforme encontradas)

**Status:** ⚠️ REQUER REVISÃO CIRÚRGICA

---

## 2️⃣ Criar Trilha de Migração Segura

### 2.1 Revisar Migrações Destrutivas

```markdown
## Arquivo: 20260302032806_final_rebuild_success.sql

### ❌ Problemas Identificados:
- [ ] Contém DROP TABLE campaigns?
- [ ] Contém DROP TABLE users?
- [ ] Contém DELETE de dados existentes?
- [ ] Contém TRUNCATE?

### ✅ Ação Corretiva:
- [ ] Substituir DROP TABLE por ALTER TABLE
- [ ] Tornar script idempotente (IF EXISTS)
- [ ] Separar estrutura de dados
- [ ] Testar em staging ANTES de aplicar em prod
```

**Ação:** Revisar e gerar nova migração `20260402000000_safe_migration_for_production.sql`

---

### 2.2 Criar Script de Validação Pré-Deploy

```sql
-- Executar ANTES da migração em produção
-- Arquivo: supabase/validation/pre-deploy-checks.sql

-- 1. Verificar integridade de tabelas críticas
SELECT 
  'campaigns' as table_name,
  COUNT(*) as row_count
FROM campaigns
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'creatives', COUNT(*) FROM creatives
UNION ALL
SELECT 'api_logs', COUNT(*) FROM api_logs;

-- 2. Verificar índices existem
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('campaigns', 'users', 'creatives')
AND schemaname = 'public';

-- 3. Verificar RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive
FROM pg_policies
WHERE tablename IN ('campaigns', 'users', 'creatives');
```

**Ação:** Arquivo a ser criado e testado.

---

## 3️⃣ Padronizar Roles em Contrato Único

### 3.1 Análise de Roles Atual

**No banco (Supabase):**
```sql
SELECT DISTINCT role FROM users;
-- Verificar quais valores existem
```

**Expected:** Valores inconsistentes como:
- `Super Admin`, `SUPER_ADMIN`, `super_admin`
- `Admin`, `ADMIN`, `admin`
- `Gestor`, `MANAGER`, `manager`

**No app (src/types/roles.ts):**
```typescript
// Verificar definição atual
```

**Ação:** Ler arquivo `src/types/roles.ts`

---

### 3.2 Contrato Padronizado Proposto

```typescript
// PADRONIZAÇÃO OFICIAL
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',    // Nível 1: Acesso total
  ADMIN: 'ADMIN',                // Nível 2: Acesso administrativo
  MANAGER: 'MANAGER'             // Nível 3: Acesso gerencial
} as const;

export type UserRole = ValuesOf<typeof ROLES>;

// Mapeamento visual no frontend (se necessário)
export const ROLE_LABELS: Record<UserRole, string> = {
  'SUPER_ADMIN': 'Super Administrador',
  'ADMIN': 'Administrador',
  'MANAGER': 'Gerenciador'
};
```

**Ação:** Garantir consistência em:
- [ ] `src/types/roles.ts` — definição
- [ ] `src/middleware.ts` — validação de autorização
- [ ] `src/app/admin/**` — proteção de rotas
- [ ] Database — valores normalizados

---

### 3.3 Script de Normalização de Dados

```sql
-- Executar em produção ANTES do deploy
-- Arquivo: supabase/migrations/20260402000001_normalize_roles.sql

BEGIN;

-- Backup antes (não faz rollback)
SELECT COUNT(*) FROM users WHERE role NOT IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER');

-- Normalizar variações
UPDATE users SET role = 'SUPER_ADMIN' 
WHERE role IN ('Super Admin', 'super_admin', 'SuperAdmin');

UPDATE users SET role = 'ADMIN' 
WHERE role IN ('Admin', 'admin');

UPDATE users SET role = 'MANAGER' 
WHERE role IN ('Gestor', 'manager', 'Manager', 'GESTOR');

-- Validar resultado
SELECT role, COUNT(*) as count FROM users GROUP BY role;

COMMIT;
```

**Ação:** Criar e testar migração.

---

## 4️⃣ Preparar Variáveis de Ambiente de Produção

### 4.1 Checklist de Segredos

```bash
# Verificar se todos os segredos estão presentes em produção

SEGREDOS_NECESSARIOS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY" 
  "SUPABASE_SERVICE_ROLE_KEY"
  "ECOMPAY_EMAIL"
  "ECOMPAY_PASSWORD"
  "META_ADS_ACCESS_TOKEN"
  "META_AD_ACCOUNT_ID"
)

for secret in "${SEGREDOS_NECESSARIOS[@]}"; do
  echo "[ ] $secret — VALIDAR NO PROVIDER"
done
```

**Ação:** Confirmar com DevOps/Platform que todos os segredos estão configurados.

---

### 4.2 Rotacionar Tokens Antigos

```markdown
| Segredo | Rotação Necessária? | Responsável | Data Rotação | Status |
|---------|---|---|---|---|
| META_ADS_ACCESS_TOKEN | ❓ | [DEFINIR] | [DEFINIR] | ⏳ |
| ECOMPAY_PASSWORD | ❓ | [DEFINIR] | [DEFINIR] | ⏳ |
| SUPABASE_SERVICE_ROLE_KEY | ❓ | [DEFINIR] | [DEFINIR] | ⏳ |
```

**Ação:** Decidir e executar rotações conforme necessário.

---

## 5️⃣ Preparar Observabilidade Mínima

### 5.1 Error Tracking (Frontend + API)

```typescript
// Implementar em páginas críticas
// src/app/campaign/[id]/page.tsx

try {
  // Carregamento de dados
} catch (error) {
  console.error('[PROD-ALERT] Campaign loading failed:', error);
  // Enviar para serviço de observabilidade
  // Ex: Sentry, DataDog, LogRocket
}
```

**Ação:** Definir serviço de observabilidade (Sentry, DataDog, etc).

---

### 5.2 Logs de Autenticação

```typescript
// src/middleware.ts
console.log('[AUTH] Login attempt:', {
  email: user.email,
  role: user.role,
  timestamp: new Date().toISOString()
});

console.error('[AUTH-FAILED] Authorization denied:', {
  userId: user.id,
  requiredRole: ALLOWED_ROLES,
  userRole: user.role,
  path: request.nextUrl.pathname
});
```

**Ação:** Garantir que logs de autenticação estão visíveis.

---

### 5.3 Alertas para Rotas Críticas

```markdown
## Rotas Críticas para Monitoramento

| Rota | Método | Alerta se falhar? | Métrica |
|------|--------|---|---|
| `/api/auth/login` | POST | 🔴 SIM | Status 401/403/500 |
| `/api/campaigns` | GET | 🔴 SIM | Latência > 2s |
| `/api/ecompay/products` | GET | 🟡 PARCIAL | Status 500 |
| `/api/meta-creatives` | GET | 🟡 PARCIAL | Status 500 |

```

**Ação:** Configurar alertas no provider de observabilidade.

---

## ✅ Checklist de Saída da Fase 1

- [ ] Schema atual extraído e documentado em `docs/schema-producao-baseline.sql`
- [ ] Migrações destrutivas identificadas e corrigidas
- [ ] Migração segura preparada: `20260402000000_safe_migration_for_production.sql`
- [ ] Script de validação pré-deploy criado
- [ ] Normalização de roles implementada
- [ ] Todos os segredos validados em produção
- [ ] Tokens rotacionados conforme necessário
- [ ] Observabilidade configurada (erro tracking + logs + alertas)
- [ ] **Go/No-Go da Fase 1** aprovado pelo DBA Owner

---

## 🚀 Próximo Passo: Fase 2 - Rehearsal em Staging
**Data prevista:** T-1 (véspera de produção)

Descrição: Restaurar snapshot recente de produção em staging isolado e executar migração completa com smoke test.

---

**Criado:** 02/04/2026  
**Status:** Aguardando go de Fase 0  
**Responsável:** DBA Owner (quando designado)
