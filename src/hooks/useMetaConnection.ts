import { useEffect, useState } from 'react';
import { createClient } from '@/lib/client';

interface MetaAccount {
  id: string;
  account_id: string;
  account_name: string;
  status: string;
}

export function useMetaConnection() {
  const [connected, setConnected] = useState(false);
  const [anyAdminConnected, setAnyAdminConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<MetaAccount[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const supabase = createClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        // Contas do próprio usuário
        const { data: ownAccounts, error: queryError } = await supabase
          .from('meta_accounts')
          .select('id, account_id, account_name, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (queryError) {
          console.error('Error fetching meta accounts:', queryError);
          setError(queryError.message);
        } else {
          setAccounts(ownAccounts || []);
          setConnected((ownAccounts || []).length > 0);
        }

        // Verifica se qualquer admin conectou (para esconder o banner globalmente)
        const { count } = await supabase
          .from('meta_accounts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active');

        setAnyAdminConnected((count ?? 0) > 0);
      } catch (err) {
        console.error('Error checking meta connection:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, []);

  return {
    connected,
    anyAdminConnected,
    loading,
    accounts,
    error,
  };
}
