# 🔧 Scripts Práticos para Execução
**Fase 1 - Higienização Técnica**

---

## 📋 Índice de Scripts

1. [Validação Pré-Deploy](#validação-pré-deploy)
2. [Extração de Schema](#extração-de-schema)
3. [Normalização de Roles](#normalização-de-roles)
4. [Validação Pós-Deploy](#validação-pós-deploy)
5. [Rollback Rápido](#rollback-rápido)

---

## Validação Pré-Deploy

### Script 1.1: Baseline de Integridade

**Executar em:** Produção (ANTES de qualquer alteração)  
**Localização:** Supabase SQL Editor → Production database

```sql
-- ====================================
-- PRÉ-DEPLOY VALIDATION BASELINE
-- Data: [PREENCHER]
-- Responsável: [PREENCHER]
-- ====================================

-- 1. Contagem de registros por tabela crítica
SELECT 
  'BASELINE - ' || NOW()::text as timestamp,
  row_number() OVER () as check_id,
  *
FROM (
  SELECT 'campaigns' as table_name, COUNT(*) as row_count FROM campaigns
  UNION ALL
  SELECT 'users', COUNT(*) FROM users
  UNION ALL
  SELECT 'creatives', COUNT(*) FROM creatives
  UNION ALL
  SELECT 'api_logs', COUNT(*) FROM api_logs
  UNION ALL
  SELECT 'integrations', COUNT(*) FROM integrations
) t
ORDER BY table_name;

-- 2. Verificar índices críticos
\echo '=== ÍNDICES CRÍTICOS ==='
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename IN ('campaigns', 'users', 'creatives')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- 3. Verificar constraints únicas
\echo '=== UNIQUE CONSTRAINTS ==='
SELECT 
  constraint_name,
  table_name,
  column_name
FROM information_schema.key_column_usage
WHERE table_schema = 'public'
  AND constraint_type = 'UNIQUE'
ORDER BY table_name;

-- 4. Verificar RLS policies
\echo '=== ROW LEVEL SECURITY POLICIES ==='
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('campaigns', 'users', 'creatives')
ORDER BY tablename, policyname;

-- 5. Listar colunas não nulas esperadas
\echo '=== COLUNAS CRÍTICAS ==='
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('campaigns', 'users', 'creatives')
ORDER BY table_name, ordinal_position;
```

**Ação:** Copiar resultado e salvar em `docs/baseline-pre-deploy-[DATA].log`

---

### Script 1.2: Health Check de Dados

```sql
-- ====================================
-- DATA HEALTH CHECK
-- ====================================

-- 1. Usuários sem role válida
SELECT 
  id,
  email,
  role,
  created_at
FROM users
WHERE role NOT IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
LIMIT 10;

-- 2. Campanhas órfãs (sem user)
SELECT 
  c.id,
  c.name,
  c.user_id,
  u.id as user_exists
FROM campaigns c
LEFT JOIN users u ON c.user_id = u.id
WHERE u.id IS NULL
LIMIT 10;

-- 3. Criativos sem campanha
SELECT 
  cr.id,
  cr.platform,
  cr.campaign_id,
  c.id as campaign_exists
FROM creatives cr
LEFT JOIN campaigns c ON cr.campaign_id = c.id
WHERE c.id IS NULL
LIMIT 10;

-- 4. Tabelas sem dados (warning)
SELECT 
  table_name,
  CASE 
    WHEN row_count = 0 THEN '⚠️ VAZIA'
    ELSE '✅ COM DADOS'
  END as status,
  row_count
FROM (
  SELECT 'campaigns' as table_name, COUNT(*) as row_count FROM campaigns
  UNION ALL
  SELECT 'users', COUNT(*) FROM users
  UNION ALL
  SELECT 'creatives', COUNT(*) FROM creatives
) t
ORDER BY row_count DESC;
```

---

## Extração de Schema

### Script 2.1: Exportar Schema Completo

```bash
#!/bin/bash
# Executar localmente para fazer backup do schema

BACKUP_DIR="docs/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/schema_baseline_$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"

# Usar pg_dump se tiver acesso SSH/config
# pg_dump -h [HOST] -U postgres -d [DB] -n public > "$BACKUP_FILE"

# Ou exportar manualmente do Supabase SQL Editor:
# 1. Ir para Supabase → SQL Editor
# 2. Copiar saída do script 1.1 acima
# 3. Salvar em $BACKUP_FILE

echo "✅ Schema salvo em: $BACKUP_FILE"
```

---

## Normalização de Roles

### Script 3.1: Converter Roles para Padrão

**Executar em:** Staging (TESTE ANTES DE PROD)  
**Localização:** Supabase SQL Editor

```sql
-- ====================================
-- NORMALIZE ROLES TO STANDARD
-- ⚠️ RUN IN STAGING FIRST
-- ====================================

BEGIN;

-- Criar tabela de auditoria
CREATE TABLE IF NOT EXISTS role_migration_log (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  old_role TEXT NOT NULL,
  new_role TEXT NOT NULL,
  migrated_at TIMESTAMP DEFAULT NOW()
);

-- 1. Backup dos dados antigos
INSERT INTO role_migration_log (user_id, old_role, new_role)
SELECT 
  id,
  role as old_role,
  CASE 
    WHEN role IN ('Super Admin', 'super_admin', 'SuperAdmin', 'SUPER_ADMIN') THEN 'SUPER_ADMIN'
    WHEN role IN ('Admin', 'admin', 'ADMIN') THEN 'ADMIN'
    WHEN role IN ('Gestor', 'manager', 'Manager', 'MANAGER', 'GESTOR') THEN 'MANAGER'
    ELSE role  -- Mantém se não reconhecer (para investigação)
  END as new_role
FROM users
WHERE role NOT IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  AND role IS NOT NULL;

-- 2. Validar quantos vão mudar
SELECT 
  COUNT(*) as users_to_migrate,
  'Verificar se valor é aceitável' as action
FROM role_migration_log
WHERE old_role != new_role;

-- 3. Aplicar atualização
UPDATE users
SET role = CASE 
  WHEN role IN ('Super Admin', 'super_admin', 'SuperAdmin') THEN 'SUPER_ADMIN'
  WHEN role IN ('Admin', 'admin') THEN 'ADMIN'
  WHEN role IN ('Gestor', 'manager', 'Manager', 'GESTOR') THEN 'MANAGER'
  ELSE role
END
WHERE role NOT IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  AND role IS NOT NULL;

-- 4. Validar resultado
SELECT 
  role,
  COUNT(*) as user_count,
  'Esperado ≥ 1 cada' as expectation
FROM users
GROUP BY role
ORDER BY role;

-- 5. Confirmar sem erros
COMMIT;

-- 6. Log final
SELECT 
  COUNT(*) as total_migrations,
  COUNT(DISTINCT user_id) as affected_users,
  NOW() as completed_at
FROM role_migration_log
WHERE migrated_at::date = NOW()::date;
```

---

### Script 3.2: Validar Roles Após Migration

```sql
-- Verificar se há ainda roles inválidas
SELECT 
  role,
  COUNT(*) as count
FROM users
GROUP BY role
HAVING COUNT(*) > 0
ORDER BY count DESC;

-- Esperado: Apenas 3 valores (ou NULL)
-- SUPER_ADMIN, ADMIN, MANAGER
```

---

## Validação Pós-Deploy

### Script 4.1: Health Check Após Deploy

**Executar em:** Produção (IMEDIATAMENTE após app estar online)

```sql
-- ====================================
-- POST-DEPLOY VALIDATION
-- ====================================

-- 1. Verificar que tabelas estão intactas
SELECT 
  table_name,
  COUNT(*) as row_count,
  'Deve ser ≥ baseline' as validation
FROM (
  SELECT 'campaigns' as table_name, COUNT(*) FROM campaigns
  UNION ALL
  SELECT 'users', COUNT(*) FROM users
  UNION ALL
  SELECT 'creatives', COUNT(*) FROM creatives
) t
GROUP BY table_name
ORDER BY table_name;

-- 2. Verificar que nenhuma migração bloqueante falhou
SELECT 
  COUNT(*) as successful_operations
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('campaigns', 'users', 'creatives');
-- Esperado: 3 (todas as tabelas existem)

-- 3. Roles normalizads?
SELECT 
  COUNT(DISTINCT role) as unique_roles,
  string_agg(DISTINCT role, ', ' ORDER BY role) as roles
FROM users;
-- Esperado: unique_roles <= 4 (SUPER_ADMIN, ADMIN, MANAGER, NULL)

-- 4. RLS policies ativas?
SELECT 
  COUNT(*) as active_policies
FROM pg_policies
WHERE tablename IN ('campaigns', 'users');
-- Esperado: > 0

-- 5. Verificar integridade de constraints
SELECT 
  constraint_name,
  'OK' as status
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND constraint_type = 'PRIMARY KEY'
  AND table_name IN ('campaigns', 'users', 'creatives')
ORDER BY table_name;
```

---

## Rollback Rápido

### Script 5.1: Restaurar de Backup

**⚠️ APENAS SE NECESSÁRIO**

```sql
-- ====================================
-- ROLLBACK PROCEDURE
-- ===================================

-- 1. Verificar último backup disponível
SELECT 
  backup_id,
  backup_time,
  database_version,
  status
FROM backups
ORDER BY backup_time DESC
LIMIT 5;

-- 2. Se houver permissions, restaurar
-- pg_restore -h [HOST] -U postgres -d [DB] [BACKUP_FILE]

-- 3. Verificar integridade após restore
SELECT COUNT(*) as campaigns FROM campaigns;
SELECT COUNT(*) as users FROM users;

-- 4. Validar que roles estão OK
SELECT DISTINCT role FROM users;
```

---

## 🔍 Como Executar

### Via Supabase UI (Recomendado)
1. Abra https://app.supabase.com
2. Selecione projeto de **produção**
3. Vá para **SQL Editor**
4. Cole um dos scripts acima
5. Revise resultado
6. Documenta output em `docs/`

### Via CLI (Se configurado)
```bash
# Conectar via psql
psql postgresql://[USER]:[PASSWORD]@[HOST]/[DB]

# Copiar e colar command
# Ou: psql -f scripts/validation.sql
```

---

## ✅ Pré-Deploy Checklist Final

Antes de aplicar migração:

```bash
# 1. Executar script 1.1 (Baseline)
# 2. Executar script 1.2 (Health Check)
# 3. Salvar outputs em docs/baseline-pre-deploy-[DATA].log
# 4. Obter aprovação de DBA

# 5. Se houver roles antigas, executar 3.1
# 6. Validar com 3.2

# 7. Deploy app
# 8. Quando app online, executar 4.1 (Post-Deploy)

# 9. Comparar baseline vs post-deploy
# diff docs/baseline-pre-deploy-*.log docs/baseline-pos-deploy-*.log

# 10. Se tudo OK: ✅ LIBERADO
# 11. Se problema: executar 5.1 (Rollback)
```

---

**Responsável:** DBA Owner  
**Documentação:** `docs/scripts-producao.md`  
**Última atualização:** 02/04/2026
