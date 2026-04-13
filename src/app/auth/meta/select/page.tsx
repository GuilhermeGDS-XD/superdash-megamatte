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
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        // Tenta ler do cookie primeiro
        const cookies = document.cookie.split(';');
        let sessionData = null;

        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'meta_oauth_session') {
            try {
              sessionData = JSON.parse(decodeURIComponent(value));
              console.log('✅ Session encontrada no cookie');
              break;
            } catch (e) {
              console.warn('Cookie exists but invalid JSON:', e);
            }
          }
        }

        if (!sessionData) {
          console.log('❌ Session não encontrada, tentando endpoint...');
          // Tenta endpoint como fallback
          const response = await fetch('/api/auth/meta/session', {
            method: 'GET',
            credentials: 'include',
          });

          if (!response.ok) {
            const error = await response.json();
            setError(error.error || error.message || 'Erro ao carregar contas');
            console.error('Endpoint error:', error);
            setLoading(false);
            return;
          }

          const data = await response.json();
          sessionData = data;
        }

        if (sessionData?.accounts) {
          setAccounts(sessionData.accounts);
          console.log('✅ Contas carregadas:', sessionData.accounts.length);
        } else {
          setError('Nenhuma conta encontrada');
          console.warn('No accounts in session');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching session:', err);
        setError('Erro ao carregar contas: ' + (err instanceof Error ? err.message : 'Unknown'));
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  const handleSelectAccount = async (accountId: string) => {
    setSelecting(accountId);
    setError(null);

    try {
      const response = await fetch('/api/auth/meta/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ account_id: accountId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao conectar conta');
        setSelecting(null);
        return;
      }

      // Sucesso! Redireciona para dashboard
      const data = await response.json();
      
      // Aguarda um pouco para garantir que resposta foi processada
      setTimeout(() => {
        window.location.href = '/dashboard?meta_connected=true';
      }, 500);
    } catch (err) {
      console.error('Error selecting account:', err);
      setError('Erro de conexão. Tente novamente.');
      setSelecting(null);
    }
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
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">📊</div>
          <h1 className="text-2xl font-bold text-gray-800">Qual conta Meta conectar?</h1>
          <p className="text-gray-600 text-sm mt-2">
            Selecione uma conta para sincronizar campanhas
          </p>
        </div>

        {/* Accounts List */}
        <div className="space-y-3 mb-6">
          {accounts.map((account) => (
            <button
              key={account.account_id}
              onClick={() => handleSelectAccount(account.account_id)}
              disabled={selecting !== null}
              className={`
                w-full px-4 py-3 border rounded-lg transition-all
                flex items-center justify-between font-medium
                ${
                  selecting === account.account_id
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : selecting !== null
                    ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-white border-gray-300 text-gray-800 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                }
              `}
            >
              <div>
                <div className="text-left">{account.account_name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {account.account_id} · {account.currency}
                </div>
              </div>

              {selecting === account.account_id && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              )}

              {selecting !== account.account_id && selecting === null && (
                <div className="text-gray-400">→</div>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pt-4 border-t">
          <p>Você será redirecionado após selecionar uma conta</p>
        </div>
      </div>
    </div>
  );
}
