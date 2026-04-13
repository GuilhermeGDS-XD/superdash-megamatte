// src/hooks/useUser.ts
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/client';
import { normalizeRole } from '@/lib/roles';

let activeProfilePromise: Promise<any> | null = null;
let cachedProfile: any | null = null;

export function useUser() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = useCallback(async (forceRefresh = false) => {
    // Retorna do cache se não for force refresh
    if (cachedProfile && !forceRefresh) {
      setUser(cachedProfile);
      setLoading(false);
      return;
    }

    // Single-flight promise pattern
    if (!activeProfilePromise || forceRefresh) {
      activeProfilePromise = (async () => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();

          if (authUser) {
            const { data: userProfile, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', authUser.id)
              .single();
              
            if (error) {
              const authMetadata = authUser.user_metadata || {};
              return {
                id: authUser.id,
                email: authUser.email,
                name: (authMetadata.full_name || authMetadata.name || authUser.email?.split('@')[0]) as string,
                role: normalizeRole((authMetadata.role || 'MANAGER') as string)
              };
            } else {
              const profile = userProfile as any;
              const authMetadata = authUser.user_metadata || {};
              return {
                ...profile,
                name: (profile.full_name || authMetadata.full_name || authMetadata.name || authUser.email?.split('@')[0]) as string,
                role: normalizeRole((profile.role || authMetadata.role || 'MANAGER') as string)
              };
            }
          }
          return null;
        } catch (err) {
          console.error('Unexpected error in useUser:', err);
          return null;
        }
      })();
    }

    try {
      const result = await activeProfilePromise;
      cachedProfile = result;
      setUser(result);
    } finally {
      // Permitir que as próximas tentativas no mesmo ciclo peguem a promessa, 
      // mas limpe em seguida pra não guardar stale promises longínquas
      setTimeout(() => {
        activeProfilePromise = null;
      }, 500);
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchProfile();
    
    // Escutar mudanças na autenticação (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // Se houver alteração (signOut, signIn), invalidamos o cache e pegamos novo
      cachedProfile = null;
      activeProfilePromise = null;
      fetchProfile(true);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, supabase]);

  return { user, loading, refreshUser: fetchProfile };
}
