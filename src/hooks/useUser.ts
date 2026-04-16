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
          // 1. Tenta pegar a sessão manual via Cookie
          const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
          };

          const sessionId = getCookie('sb-manual-token');

          if (sessionId) {
            // Busca a sessão na tabela customizada
            const { data: sessionData, error: sessionError } = await supabase
              .from('sessions')
              .select('*, users(*)')
              .eq('id', sessionId)
              .gt('expires_at', new Date().toISOString())
              .single();

            if (!sessionError && sessionData && sessionData.users) {
              const profile = sessionData.users;
              return {
                ...profile,
                name: profile.full_name,
                role: normalizeRole(profile.role)
              };
            }
          }

          // Fallback para Supabase Auth (caso precise migrar gradualmente, 
          // ou se desejar remover de vez, pode retornar null aqui)
          const { data: { user: authUser } } = await supabase.auth.getUser();

          if (authUser) {
            const { data: userProfile, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', authUser.id)
              .single();

            // role vem SEMPRE do public.users (fonte de verdade)
            // fallback para user_metadata.role caso a query falhe (ex: RLS mal configurado)
            // user_metadata.role é sincronizado automaticamente via trigger sync_role_to_metadata
            const authMetadata = authUser.user_metadata || {};

            if (error || !userProfile) {
              console.warn('[useUser] Falha ao buscar public.users, usando fallback de metadata:', error?.message);
              return {
                id: authUser.id,
                email: authUser.email,
                full_name: authMetadata.full_name || authMetadata.name || authUser.email?.split('@')[0],
                name: authMetadata.full_name || authMetadata.name || authUser.email?.split('@')[0],
                role: normalizeRole((authMetadata.role || 'MANAGER') as string),
              };
            }

            const profile = userProfile as any;
            // role de public.users tem prioridade absoluta sobre metadata
            const resolvedRole = normalizeRole(profile.role || authMetadata.role || 'MANAGER');

            return {
              ...profile,
              full_name: profile.full_name || authMetadata.full_name || authMetadata.name || authUser.email?.split('@')[0],
              name: profile.full_name || authMetadata.full_name || authMetadata.name || authUser.email?.split('@')[0],
              role: resolvedRole,
            };
          }
          return null;
        } catch (err) {
          console.error('[useUser] Erro inesperado:', err);
          return null;
        }
      })();
    }

    try {
      const result = await activeProfilePromise;
      cachedProfile = result;
      setUser(result);
    } finally {
      setTimeout(() => {
        activeProfilePromise = null;
      }, 500);
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      cachedProfile = null;
      activeProfilePromise = null;
      fetchProfile(true);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, supabase]);

  return { user, loading, refreshUser: fetchProfile };
}

