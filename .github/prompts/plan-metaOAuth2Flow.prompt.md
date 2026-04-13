# Plan: OAuth2 Meta com Modal + Seleção de Conta

**Fluxo desejado:**
1. Cliente não conectado → Modal com botão "Conectar com Meta"
2. Click → Abre popup/janela de autorização Meta
3. Se já conectado na Meta → Tira login automaticamente
4. Após autorizar → Pede para escolher qual conta Meta conectar
5. Selecionar conta → Sincroniza campanhas

---

## **Arquitetura do Fluxo OAuth2**

```
┌──────────────────────────┐
│   Dashboard / Page       │
│   (Cliente não conectado)│
└───────────┬──────────────┘
            ↓
    ┌───────────────────────────┐
    │     Modal "Conectar Meta"  │
    │  [Botão "Conectar com Meta"]│
    └───────────┬───────────────┘
                ↓
    ┌──────────────────────────────────┐
    │ Abre popup: /auth/meta/connect    │
    │ (lê Meta Login page)              │
    │                                   │
    │ Se já auth na Meta:               │
    │   → Pula login automaticamente    │
    │                                   │
    │ Mostra: "Permitir acesso?"        │
    │   [Permitir] [Recusar]            │
    └───────────┬──────────────────────┘
                ↓
    ┌──────────────────────────────────┐
    │ Usuário clica [Permitir]         │
    │ Meta retorna: authorization_code │
    └───────────┬──────────────────────┘
                ↓
    ┌──────────────────────────────────┐
    │ Popup redireciona para:           │
    │ /auth/meta/callback?code={CODE}  │
    │                                  │
    │ Backend faz:                     │
    │ 1. Valida authorization_code     │
    │ 2. Troca por access_token + info │
    │ 3. Busca contas Meta do usuário  │
    │ 4. Salva no `meta_sessions` temp │
    │ 5. Redireciona para /meta/select │
    └───────────┬──────────────────────┘
                ↓
    ┌──────────────────────────────────┐
    │  Popup mostra:                   │
    │  "Qual conta Meta conectar?"     │
    │                                  │
    │  [Conta 1] [Conta 2] [Conta 3]   │
    │ (seleciona uma account)          │
    └───────────┬──────────────────────┘
                ↓
    ┌──────────────────────────────────┐
    │ Usuário clica em uma conta       │
    │                                  │
    │ POST /auth/meta/confirm          │
    │ body: { account_id }             │
    │                                  │
    │ Backend faz:                     │
    │ 1. Busca token salvo             │
    │ 2. Encrypt + Save em meta_acc    │
    │ 3. Sincroniza campanhas          │
    │ 4. Retorna sucesso               │
    └───────────┬──────────────────────┘
                ↓
    ┌──────────────────────────────────┐
    │ Popup fecha                      │
    │ Dashboard atualiza:              │
    │ ✅ Campanhas sincronizadas       │
    │ ✅ Modal desaparece              │
    │ ✅ Cards com métricas aparecem   │
    └──────────────────────────────────┘
```

---

## **Implementation Steps**

### **Phase 1: Setup + Estrutura Base**

#### 1. Configurar Meta App
- [ ] Ir para https://developers.facebook.com
- [ ] Criar app (Tipo: "Business/e-commerce" ou "Consumer")
- [ ] Gerar App ID + App Secret
- [ ] Configurar produtos: "Facebook Login for Business"
- [ ] Adicionar permissões: `ads_management`, `pages_show_list`, `business_management`
- [ ] Configurar Redirect URIs: 
  - Dev: `http://localhost:3000/auth/meta/callback`
  - Prod: `https://app.suacompanhia.com/auth/meta/callback`
- [ ] Salvar App ID + App Secret em `.env.development` e `.env.production`

```env
# .env
META_OAUTH_APP_ID=seu_app_id_aqui
META_OAUTH_APP_SECRET=seu_app_secret_aqui
META_OAUTH_REDIRECT_URI=http://localhost:3000/auth/meta/callback
ENCRYPTION_KEY=chave_aes_256_bem_segura_aqui
```

#### 2. Criar tabela `meta_accounts` (nova, armazena tokens)

```sql
CREATE TABLE meta_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados da conta Meta
  account_id TEXT NOT NULL,              -- act_xxxxx
  account_name TEXT,                      -- "Minha Conta Ads"
  business_account_id TEXT,               -- Business Manager ID
  
  -- Token + segurança
  access_token TEXT NOT NULL,             -- Criptografado (AES-256)
  token_expires_at TIMESTAMP,             -- ~60 dias para long-lived
  refresh_token TEXT,                     -- Para refresh (fase 2)
  
  -- Metadata
  status status_enum DEFAULT 'active',   -- active | expired | revoked
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Constraints
  UNIQUE(user_id, account_id)            -- Um user, uma conta Meta
);

CREATE INDEX idx_meta_accounts_user_id ON meta_accounts(user_id);
```

#### 3. Criar tabela `meta_sessions` (temporária, durante OAuth flow)

```sql
CREATE TABLE meta_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados do OAuth incompleto
  authorization_code TEXT,                -- Code que veio do Meta (curto prazo)
  state TEXT,                             -- Para validação CSRF
  access_token TEXT NOT NULL,             -- Token desbloqueado (ainda não salvo)
  accounts JSONB,                         -- Lista de contas que o user pode escolher
  
  -- Lifecycle
  created_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP,                  -- Expira em 10 minutos
  
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_meta_sessions_user_id ON meta_sessions(user_id);
CREATE INDEX idx_meta_sessions_state ON meta_sessions(state);
```

#### 4. Criar serviço `metaOAuthService.ts`

```typescript
// src/services/metaOAuthService.ts

export class MetaOAuthService {
  private static readonly appId = process.env.META_OAUTH_APP_ID;
  private static readonly appSecret = process.env.META_OAUTH_APP_SECRET;
  private static readonly redirectUri = process.env.META_OAUTH_REDIRECT_URI;

  /**
   * 1️⃣ Gera URL de login Meta que abre em popup
   */
  static getLoginUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      state,
      scope: 'ads_management,pages_show_list',
      response_type: 'code',
      auth_type: 'reauthenticate', // Force re-login se já autenticado
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
  }

  /**
   * 2️⃣ Troca authorization_code por access_token
   */
  static async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
  }> {
    const response = await fetch('https://graph.instagram.com/v19.0/oauth/access_token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: this.appId,
        client_secret: this.appSecret,
        redirect_uri: this.redirectUri,
        code,
      }),
    });

    if (!response.ok) throw new Error('Failed to exchange code for token');
    return response.json();
  }

  /**
   * 3️⃣ Busca contas Ad do usuário com token temporário
   */
  static async getUserAdAccounts(accessToken: string): Promise<any[]> {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id,account_status,currency&access_token=${accessToken}`
    );

    if (!response.ok) throw new Error('Failed to get ad accounts');
    const data = await response.json();
    return data.data || [];
  }
}
```

#### 5. Criar serviço `encryptionService.ts`

```typescript
// src/services/encryptionService.ts

import crypto from 'crypto';

export class EncryptionService {
  private static readonly algorithm = 'aes-256-gcm';
  private static readonly key = Buffer.from(process.env.ENCRYPTION_KEY || 'dev_key_32_chars_1234567890ab', 'utf-8').slice(0, 32);

  static encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Formato: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  static decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    
    return decrypted;
  }
}
```

---

### **Phase 2: Endpoints OAuth**

#### 6. Endpoint: `/auth/meta/connect` (GET)
*Usuário clica "Conectar" → Abre popup com login Meta*

```typescript
// src/app/api/auth/meta/connect/route.ts

export async function GET() {
  const state = crypto.randomBytes(16).toString('hex'); // CSRF token
  
  // Salvar state em session/cookie (temporário, 5min)
  // const response = NextResponse.redirect(loginUrl);
  // response.cookies.set('meta_oauth_state', state, { 
  //   maxAge: 300,
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === 'production'
  // });
  
  const loginUrl = MetaOAuthService.getLoginUrl(state);
  return NextResponse.redirect(loginUrl);
}
```

#### 7. Endpoint: `/auth/meta/callback` (GET)
*Meta redireciona aqui com `code` → Troca por token → Salva em `meta_sessions`*

```typescript
// src/app/api/auth/meta/callback/route.ts

import { supabaseServerClient } from '@/lib/supabase';
import { MetaOAuthService } from '@/services/metaOAuthService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Se usuário recusou
  if (error) {
    return NextResponse.redirect(new URL('/dashboard?auth_error=user_denied', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard?auth_error=missing_code', request.url));
  }

  try {
    // 1. Troca code por access_token
    const { access_token } = await MetaOAuthService.exchangeCodeForToken(code);

    // 2. Busca contas do usuário
    const accounts = await MetaOAuthService.getUserAdAccounts(access_token);

    // 3. Pega user_id da sessão autenticada
    const { data: { user } } = await supabaseServerClient.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // 4. Salva em meta_sessions (temporário)
    await supabaseServerClient.from('meta_sessions').insert({
      user_id: user.id,
      access_token,
      accounts: accounts.map(acc => ({
        account_id: acc.account_id,
        account_name: acc.name,
        currency: acc.currency,
      })),
      expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    // 5. Redireciona para página de seleção
    return NextResponse.redirect(new URL('/auth/meta/select', request.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/dashboard?auth_error=callback_failed', request.url));
  }
}
```

#### 8. Página: `/auth/meta/select` (GET)
*Mostra lista de contas → Usuário seleciona → POST /auth/meta/confirm*

```typescript
// src/app/auth/meta/select/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase';

export default function MetaSelectPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      // Busca meta_sessions do usuário
      const { data: { user } } = await supabaseClient.auth.getUser();
      const { data } = await supabaseClient
        .from('meta_sessions')
        .select('accounts')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setAccounts(data.accounts);
      }
      setLoading(false);
    };

    fetchSession();
  }, []);

  const handleSelectAccount = async (accountId: string) => {
    setSelecting(accountId);
    
    const response = await fetch('/auth/meta/confirm', {
      method: 'POST',
      body: JSON.stringify({ account_id: accountId }),
    });

    if (response.ok) {
      // Sucesso! Redireciona para dashboard
      router.push('/dashboard?meta_connected=true');
    } else {
      setSelecting(null);
      alert('Erro ao conectar conta. Tente novamente.');
    }
  };

  if (loading) return <div>Carregando contas...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <h1 className="text-2xl font-bold">Qual conta Meta conectar?</h1>
      
      <div className="grid gap-3">
        {accounts.map((account) => (
          <button
            key={account.account_id}
            onClick={() => handleSelectAccount(account.account_id)}
            disabled={selecting !== null}
            className="px-6 py-3 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            {account.account_name} ({account.currency})
            {selecting === account.account_id && '... conectando'}
          </button>
        ))}
      </div>
    </div>
  );
}
```

#### 9. Endpoint: `/auth/meta/confirm` (POST)
*Último passo: Salva token criptografado em `meta_accounts` + sincroniza campanhas*

```typescript
// src/app/api/auth/meta/confirm/route.ts

import { supabaseServerClient } from '@/lib/supabase';
import { EncryptionService } from '@/services/encryptionService';

export async function POST(request: NextRequest) {
  const { account_id } = await request.json();

  try {
    // 1. Pega user
    const { data: { user } } = await supabaseServerClient.auth.getUser();

    // 2. Busca session temporária
    const { data: session } = await supabaseServerClient
      .from('meta_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!session) throw new Error('Session expired');

    // 3. Encontra conta selecionada
    const selectedAccount = session.accounts.find(
      (acc: any) => acc.account_id === account_id
    );

    // 4. Criptografa token
    const encryptedToken = EncryptionService.encrypt(session.access_token);

    // 5. Salva em meta_accounts
    await supabaseServerClient.from('meta_accounts').upsert({
      user_id: user.id,
      account_id,
      account_name: selectedAccount.account_name,
      access_token: encryptedToken,
      token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 dias
      status: 'active',
    });

    // 6. Limpa meta_sessions
    await supabaseServerClient
      .from('meta_sessions')
      .delete()
      .eq('id', session.id);

    // 7. Dispara sincronização de campanhas (async)
    // await syncMetaCampaigns(user.id, account_id, session.access_token);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

---

### **Phase 3: Frontend Components**

#### 10. Modal Component: `MetaConnectModal.tsx`

```typescript
// src/components/MetaConnectModal.tsx

'use client';

import { Dialog } from '@headlessui/react';
import { useEffect, useState } from 'react';

export function MetaConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    // Abre popup
    const width = 500;
    const height = 600;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    window.open(
      '/api/auth/meta/connect',
      'MetaLogin',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Escuta mensagens do popup (quando fechar)
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'META_AUTH_SUCCESS') {
        onClose();
        // Reload ou refetch data
        window.location.reload();
      }
    };

    window.addEventListener('message', handleMessage);
    setLoading(false);

    return () => window.removeEventListener('message', handleMessage);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="flex flex-col items-center gap-4 p-6">
        <h2 className="text-xl font-bold">Conectar Meta Business</h2>
        <p className="text-slate-600 text-center">
          Autorize o acesso à sua conta Meta para sincronizar campanhas
        </p>
        
        <button
          onClick={handleConnect}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Conectando...' : 'Conectar com Meta'}
        </button>
      </div>
    </Dialog>
  );
}
```

#### 11. Hook: `useMetaConnection.ts`

```typescript
// src/hooks/useMetaConnection.ts

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase';

export function useMetaConnection() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    const checkConnection = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      const { data } = await supabaseClient
        .from('meta_accounts')
        .select('*')
        .eq('user_id', user?.id);

      setAccounts(data || []);
      setConnected(data && data.length > 0);
      setLoading(false);
    };

    checkConnection();
  }, []);

  return { connected, loading, accounts };
}
```

#### 12. Update Dashboard: `src/app/page.tsx`

```typescript
// Adicionar ao dashboard

import { useMetaConnection } from '@/hooks/useMetaConnection';
import { MetaConnectModal } from '@/components/MetaConnectModal';

export default function Dashboard() {
  const { connected, loading } = useMetaConnection();
  const [showMetaModal, setShowMetaModal] = useState(false);

  return (
    <div>
      {!loading && !connected && (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-900 font-semibold">
              Meta não conectado
            </p>
            <button
              onClick={() => setShowMetaModal(true)}
              className="mt-2 px-4 py-2 bg-amber-600 text-white rounded"
            >
              Conectar agora
            </button>
          </div>

          <MetaConnectModal 
            open={showMetaModal} 
            onClose={() => setShowMetaModal(false)} 
          />
        </>
      )}

      {/* Resto do dashboard... */}
    </div>
  );
}
```

---

## **Fluxo Final (Resumido)**

1. ✅ Cliente não conectado → Dashboard mostra alert
2. ✅ Click "Conectar com Meta" → Abre modal com botão
3. ✅ Click botão → Popup abre /auth/meta/connect
4. ✅ Meta Login aparece (ou se já autenticado, pula)
5. ✅ Usuário autoriza → Redireciona para /auth/meta/callback
6. ✅ Backend troca code por token + busca contas
7. ✅ Redireciona para /auth/meta/select
8. ✅ Usuário seleciona conta → POST /auth/meta/confirm
9. ✅ Token salvo criptografado + campanhas sincronizadas
10. ✅ Popup fecha, dashboard recarrega com campanhas

---

## **Checklist de Implementação**

- [ ] Configurar Meta App (App ID + Secret)
- [ ] Atualizar `.env` com credenciais OAuth
- [ ] Criar `metaOAuthService.ts`
- [ ] Criar `encryptionService.ts`
- [ ] Criar tabelas `meta_accounts` + `meta_sessions`
- [ ] Implementar endpoints `/auth/meta/*`
- [ ] Criar página `/auth/meta/select`
- [ ] Criar componentes `MetaConnectModal` + hook `useMetaConnection`
- [ ] Atualizar dashboard para mostrar modal
- [ ] Testar fluxo completo (login → connect → select → sync)
- [ ] Documentar para clientes

---

## **Security Considerations**

✅ **CSRF Protection**: State token gerado e validado  
✅ **Token Encryption**: Tokens salvos com AES-256-GCM  
✅ **Session Expiry**: meta_sessions válidas por 10 min  
✅ **HTTPOnly Cookies**: State pode ser salvo em cookie httpOnly  
✅ **Scope Limitation**: Apenas `ads_management` + `pages_show_list`  
🔄 **Token Refresh**: Fase 2 (refresh tokens antes de expirar)

