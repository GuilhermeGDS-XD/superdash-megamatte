import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface MetaAccount {
  id: string;
  account_id: string;
  account_name: string;
  status: string;
  last_synced_at: string | null;
}

/**
 * Hook: useMetaConnection
 * 
 * Verifica se o usuário tem contas Meta conectadas
 * Retorna lista de contas e status de carregamento
 */
export function useMetaConnection() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<MetaAccount[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Pega usuário autenticado
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        // Busca contas Meta do usuário
        const { data, error: queryError } = await supabase
          .from('meta_accounts')
          .select('id, account_id, account_name, status, last_synced_at')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (queryError) {
          console.error('Error fetching meta accounts:', queryError);
          setError(queryError.message);
          setConnected(false);
        } else {
          setAccounts(data || []);
          setConnected((data || []).length > 0);
        }
      } catch (err) {
        console.error('Error checking meta connection:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setConnected(false);
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, []);

  return {
    connected,
    loading,
    accounts,
    error,
  };
}
