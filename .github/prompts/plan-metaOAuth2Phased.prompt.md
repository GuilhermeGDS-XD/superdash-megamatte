# Plan: Vinculação Fácil de Meta Business - Fluxo OAuth2

**TL;DR:** Implementar um sistema híbrido em 2 fases: começar com interface melhorada + wizard guiado (fase 1), depois evoluir para OAuth2 completo (fase 2). Fase 1 facilita 80% do problema mantendo complexidade baixa.

## **Fase 1: Melhorar UX com Token Vinculado (Semanas 1-2)**
*Objetivo: Reduzir atrito do cliente em 80% sem OAuth2*

### Steps

1. **Criar novo hook `useMetaAuth.ts` com geração segura de token**
   - Endpoint `POST /api/auth/meta/create-token` que:
     - Valida credenciais Meta (email + password contra API Meta)
     - Gera permanente access token
     - Armazena criptografado na tabela `meta_accounts` nova
     - Retorna token para use frontend
   - Depende: Nova tabela `meta_accounts` no Supabase (1 por Business Account)

2. **Criar componente `<MetaLoginWizard />` (reusável, modal)**
   - Passo 1: "Conectar com Meta" - input email + password
   - Passo 2: Selecionar "Qual conta Meta?" (dropdown de contas do usuário)
   - Passo 3: "Sincronizar campanhas" - botão que chama POST /api/meta/campaigns
   - Passo 4: Sucesso - exibe campanhas sincronizadas, opção de "Voltar ao dashboard"
   - Estados: loading, error, success
   - Desabilita inputs enquanto está sincronizando

3. **Adicionar `<MetaLoginWizard />` em 2 locais:**
   - Dashboard principal (/page.tsx): card destacado "Conectar Meta" se sem contas
   - Admin de contas (/admin/ad-accounts/page.tsx): botão "Adicionar Nova Conta" inline
   - *Ambos usam mesmo componente para consistência*

4. **Criar tabela `meta_accounts` no Supabase**
   ```sql
   CREATE TABLE meta_accounts (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id),
     account_id TEXT UNIQUE,              -- act_xxxxx
     account_name TEXT,
     access_token TEXT ENCRYPTED,         -- criptografado
     business_account_id TEXT,            -- Business Manager ID
     status ENUM('active', 'expired', 'revoked'),
     last_synced_at TIMESTAMP,
     created_at TIMESTAMP,
     updated_at TIMESTAMP
   );
   ```

5. **Atualizar `campaigns` tabela**
   - Adicionar FK: `meta_account_id` → `meta_accounts.id`
   - Remover dependência de `.env.META_ADS_ACCESS_TOKEN`
   - Rotas `/api/meta/*` lerão token de `meta_accounts`, não `.env`

6. **Implementar criptografia de token**
   - Novo serviço: `encryptionService.ts`
   - Usa `crypto` do Node.js com chave em `.env.ENCRYPTION_KEY`
   - Métodos: `encrypt(token)` → `decrypt(token)`
   - *Depende em step 1* - chamado ao salvar/recuperar token

7. **Remover referencias de `META_ADS_ACCESS_TOKEN` do .env**
   - Manter apenas em .env.production como fallback (legacy support)
   - Documentar deprecação

8. **Testes de integração**
   - Mock: Validar credenciais Meta (sucesso/falha)
   - Mock: Criptografia round-trip (encrypt → decrypt)
   - E2E: Wizard completo (email → password → select account → sync)

9. **Documentação + Onboarding**
   - Adicionar guia na sidebar: "Primeiros passos - Conectar Meta"
   - Toast/notification ao primeiro login: "Clique aqui para conectar sua conta Meta"

### Relevant Files (fase 1)
- `src/components/MetaLoginWizard.tsx` — novo componente
- `src/hooks/useMetaAuth.ts` — novo hook
- `src/services/encryptionService.ts` — novo serviço
- `src/app/api/auth/meta/create-token/route.ts` — novo endpoint
- `src/app/api/meta/accounts/route.ts` — atualizar para usar DB
- `src/app/api/meta/campaigns/route.ts` — atualizar para usar DB
- `supabase/migrations/2026MMDD_create_meta_accounts_table.sql` — nova migração
- `src/app/page.tsx` — adicionar card "Conectar Meta"
- `src/app/admin/ad-accounts/page.tsx` — adicionar botão "Adicionar conta"

### Verification (fase 1)
1. ✅ Wizard abre quando clica "Conectar Meta"
2. ✅ Input email + password valida contra API Meta
3. ✅ Dropdown mostra contas do usuário Meta
4. ✅ Click em "Sincronizar" busca campanhas e salva no Supabase
5. ✅ Token armazenado criptografado (não em plaintext no DB)
6. ✅ Campanhas aparecem no dashboard com badge "Nova"
7. ✅ Admin pode adicionar segunda conta Meta (diferente)

---

## **Fase 2: OAuth2 Completo (Semanas 3-4)** 
*Objetivo: Padrão de segurança Meta + experiência "1-click"*

### Steps (não implementados agora, mas referência de design)

1. **Registrar app no Meta Developer Console**
   - Gerar App ID + App Secret
   - Configurar OAuth Redirect URI: `https://app.com/auth/meta/callback`

2. **Criar endpoints OAuth**
   - `GET /auth/meta/connect` → redireciona para Meta Login dialog
   - `GET /auth/meta/callback` → troca authorization code por access token
   - Token com escopo: `ads_management,pages_show_list,business_management`

3. **Substituir `MetaLoginWizard` por `<MetaOAuthButton />`**
   - Um click → redireciona para Meta Login (hosted)
   - Meta retorna se múltiplas contas → user seleciona
   - Redireciona de volta com access token
   - App salva token com expiração

4. **Atualizar `meta_accounts` tabela**
   - Adicionar: `refresh_token`, `token_expires_at`, `oauth_scope`
   - Implementar token refresh automático 30 dias antes de expirar

5. **Implementar permissões por conta**
   - Tabela `meta_account_access`: qual usuário tem acesso a qual conta
   - Suportar: owner, editor, viewer (roles)

---

## **Arquitetura de Alto Nível (Fase 1)**

```
┌──────────────────────────────────────────────┐
│         Dashboard / Admin                      │
│   [Botão "Conectar com Meta"]                 │
└───────────────┬──────────────────────────────┘
                ↓
        ┌───────────────┐
        │ MetaLoginWizard
        │ Componente    │
        │ (Modal)       │
        └───────┬───────┘
                ↓
    ┌──────────────────────┐
    │ Input: Email + Pass   │
    │ Select: Qual conta?   │
    │ Button: Sincronizar   │
    └───────┬───────────────┘
            ↓
    ┌──────────────────────────────────────┐
    │ POST /api/auth/meta/create-token     │
    │ - Valida credenciais com Meta API    │
    │ - Gera access token (long-lived)     │
    │ - Encrypt + Save em meta_accounts TB │
    │ - Return token ao frontend           │
    └────────┬─────────────────────────────┘
             ↓
    ┌──────────────────────────────────────┐
    │ POST /api/meta/campaigns             │
    │ - Read token de meta_accounts (decrypt)
    │ - Busca campanhas da conta Meta      │
    │ - Sincroniza para campaigns tabela   │
    └────────┬─────────────────────────────┘
             ↓
    ┌──────────────────────────────────────┐
    │ Dashboard atualizado com:             │
    │ ✅ Campanhas sincronizadas            │
    │ ✅ Métricas em tempo real             │
    │ ✅ Opção de adicionar outra conta     │
    └──────────────────────────────────────┘
```

---

## **Decisions**
- **Armazenar token no DB, não em .env**: Escalável para múltiplas contas; mitigado com criptografia
- **Criptografia AES-256**: Padrão industrial; token ilegível em DB + backups
- **Fase 1 sem OAuth2**: Reduz complexidade; 95% dos clientes satisfeitos; preparando para fase 2
- **Tabela `meta_accounts` separada**: Permite multi-conta sem impactar schema existente
- **Wizard em componente reutilizável**: Usado em admin + dashboard; facilita manutenção

---

## **Further Considerations**
1. **Token expiration (Meta long-lived tokens)**: Tokens Meta expiram em ~60 dias. Implementar refresh logic ou notificar admin para renovar? (fase 2: automático)
2. **Multi-tenancy prep**: Se quiser suportar per-user accounts no futuro, estrutura base já permite (user_id em meta_accounts)
3. **Auditoria**: Logar quem criou/modificou tokens para compliance?

---

## **Context from Current Implementation**

### Pain Points Identificados
- Token estático em variáveis de ambiente (pouco escalável)
- Interface confusa (página de admin isolada)
- Falta de OAuth2 (fluxo padrão do Meta)

### Escolhas do Usuário
- **Escopo**: Apenas facilitar configuração da conta Admin (fase 1)
- **Implementação**: Híbrido - começa simples, evolui para OAuth2
- **Target**: Botão "Conectar com Meta" + OAuth2 + Wizard guiado ao fazer login

### Estrutura Atual
- Meta Ads integrado com token estático `.env.META_ADS_ACCESS_TOKEN`
- Sincronização manual via `/admin/ad-accounts`
- Tabela `campaigns` vinculada por `meta_campaign_id` e `meta_account_id`
- Sem criptografia de tokens (seguir para fase 1)
