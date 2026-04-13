'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MetaAccount {
  account_id: string;
  account_name: string;
  account_status: number;
  currency: string;
}

/**
 * Página: /auth/meta/select
 * 
 * Exibe lista de contas Meta que o usuário pode conectar
 * Usuário seleciona uma e é feito POST para /auth/meta/confirm
 */
export default function MetaSelectPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<MetaAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<string[]>([]);

  const toggleAccount = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === accounts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(accounts.map(a => a.account_id)));
    }
  };

  useEffect(() => {
    const fetchSession = async () => {
      console.log('🔍 [SELECT] Buscando sessão OAuth...');
      try {
        const response = await fetch('/api/auth/meta/session', {
          method: 'GET',
          credentials: 'include',
        });

        const data = await response.json();
        console.log('📦 [SELECT] Resposta do endpoint:', { ok: response.ok, data });

        if (!response.ok) {
          setError(data.error || 'Erro ao carregar contas. Tente novamente.');
          setLoading(false);
          return;
        }

        if (data.accounts && data.accounts.length > 0) {
          setAccounts(data.accounts);
          console.log('✅ [SELECT] Contas carregadas:', data.accounts.length);
        } else {
          setError('Nenhuma conta Meta encontrada.');
        }

        setLoading(false);
      } catch (err) {
        console.error('❌ [SELECT] Erro ao buscar sessão:', err);
        setError('Erro de conexão. Tente novamente.');
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  const handleConfirm = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    setError(null);

    const accountIds = Array.from(selected);
    const results: string[] = [];
    const errors: string[] = [];

    for (const accountId of accountIds) {
      try {
        const response = await fetch('/api/auth/meta/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_id: accountId }),
        });

        const data = await response.json();

        if (!response.ok) {
          errors.push(`${accountId}: ${data.error || 'Erro desconhecido'}`);
        } else {
          results.push(accountId);
          setConnected(prev => [...prev, accountId]);
        }
      } catch (err) {
        errors.push(`${accountId}: Erro de conexão`);
      }
    }

    setSubmitting(false);

    if (errors.length > 0 && results.length === 0) {
      setError('Falha ao conectar: ' + errors.join(', '));
      return;
    }

    // Ao menos uma conta conectada com sucesso
    console.log('✅ Contas conectadas:', results);

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'META_CONNECTED', success: true, count: results.length }, '*');
      }
    } catch (_) {}

    setTimeout(() => {
      window.close();
      setTimeout(() => { if (!window.closed) window.location.href = '/'; }, 500);
    }, 800);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando suas contas Meta...</p>
          <p className="text-xs text-gray-400 mt-2">Verifique o console para mais detalhes</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Erro</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-yellow-600 text-5xl mb-4">📦</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Nenhuma conta encontrada</h1>
          <p className="text-gray-600 mb-6">
            Você não tem contas Meta Ads disponíveis para conectar.
          </p>
          <button
            onClick={() => window.close()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📊</div>
          <h1 className="text-2xl font-bold text-gray-800">Contas Meta disponíveis</h1>
          <p className="text-gray-600 text-sm mt-2">
            Selecione uma ou mais contas para sincronizar campanhas
          </p>
        </div>

        {/* Selecionar todos */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-sm text-gray-500">{accounts.length} contas encontradas</span>
          <button
            onClick={toggleAll}
            disabled={submitting}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {selected.size === accounts.length ? 'Desmarcar todas' : 'Selecionar todas'}
          </button>
        </div>

        {/* Accounts List */}
        <div className="space-y-2 mb-6 max-h-72 overflow-y-auto pr-1">
          {accounts.map((account) => {
            const isSelected = selected.has(account.account_id);
            const isConnected = connected.includes(account.account_id);
            return (
              <button
                key={account.account_id}
                onClick={() => !isConnected && toggleAccount(account.account_id)}
                disabled={submitting || isConnected}
                className={`
                  w-full px-4 py-3 border rounded-lg transition-all
                  flex items-center gap-3 text-left
                  ${
                    isConnected
                      ? 'bg-green-50 border-green-400 cursor-default'
                      : isSelected
                      ? 'bg-blue-50 border-blue-500'
                      : submitting
                      ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                      : 'bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                  }
                `}
              >
                {/* Checkbox visual */}
                <div className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                  ${
                    isConnected
                      ? 'bg-green-500 border-green-500'
                      : isSelected
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  }
                `}>
                  {(isSelected || isConnected) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`font-medium truncate ${
                    isConnected ? 'text-green-700' : isSelected ? 'text-blue-700' : 'text-gray-800'
                  }`}>
                    {account.account_name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {account.account_id} · {account.currency}
                  </div>
                </div>

                {isConnected && (
                  <span className="text-xs text-green-600 font-medium flex-shrink-0">✓ Conectada</span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Botão confirmar */}
        <button
          onClick={handleConfirm}
          disabled={selected.size === 0 || submitting}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium transition
            hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Conectando {connected.length + 1} de {selected.size}...
            </>
          ) : (
            `Conectar ${
              selected.size === 0 ? '' :
              selected.size === 1 ? '1 conta' :
              `${selected.size} contas`
            }`
          )}
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">
          O popup fechará automaticamente ao concluir
        </p>
      </div>
    </div>
  );
}
