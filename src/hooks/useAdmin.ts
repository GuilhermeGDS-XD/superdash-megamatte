// src/hooks/useAdmin.ts
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/client';
import { User, Log } from '@/types';

export function useAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (data) {
      // Mapeia full_name para name para compatibilidade se necessário
      const formattedUsers = data.map((u: any) => ({
        ...u,
        name: u.full_name || u.name
      }));
      setUsers(formattedUsers);
    }
  };

  const fetchLogs = async () => {
    const { data: logsData, error } = await supabase
      .from('logs')
      .select('*, users(full_name)')
      .order('created_at', { ascending: false });
    
    if (!error && logsData) {
      // Mapeia users.full_name para users.name para os logs
      const formattedLogs = logsData.map((log: any) => ({
        ...log,
        users: log.users ? { ...log.users, name: log.users.full_name } : null
      }));
      setLogs(formattedLogs as any);
    }
  };

  const createLog = async (action: string, metadata: any) => {
     try {
       const { data: { user: authUser } } = await supabase.auth.getUser();
       if (authUser) {
          console.log('Registrando log para:', authUser.id, action);
          const { error } = await supabase.from('logs').insert({
             user_id: authUser.id,
             action,
             metadata: metadata || {}
          });
          if (error) console.error('Erro ao inserir log no Supabase:', error.message);
       } else {
         console.warn('Tentativa de log sem usuário autenticado');
       }
     } catch (e) {
       console.error('Falha crítica ao criar log:', e);
     }
  };

  useEffect(() => {
    Promise.all([fetchUsers(), fetchLogs()]).finally(() => setLoading(false));
  }, []);

  return { users, logs, loading, createLog, refreshUsers: fetchUsers, refreshLogs: fetchLogs };
}
