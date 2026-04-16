// src/hooks/useUser.ts.new
import { useEffect, useState, useCallback } from 'react';
import { normalizeRole } from '@/lib/roles';

let cachedUser: any | null = null;
let cacheLoaded = false;

export function useUser() {
  const [user, setUser] = useState<any | null>(cachedUser);
  const [loading, setLoading] = useState(!cacheLoaded);

  const fetchUser = useCallback(async (forceRefresh = false) => {
    if (cacheLoaded && !forceRefresh) {
      setUser(cachedUser);
      setLoading(false);
      return;
    }

    try {
      // A única fonte de verdade: o endpoint /api/auth/me que lê o cookie httpOnly
      const response = await fetch('/api/auth/me', { credentials: 'include' });

      if (!response.ok) {
        cachedUser = null;
        cacheLoaded = true;
        setUser(null);
        setLoading(false);
        return;
      }

      const data = await response.json();
      const profile = data.user
        ? { ...data.user, role: normalizeRole(data.user.role) }
        : null;

      cachedUser = profile;
      cacheLoaded = true;
      setUser(profile);
    } catch (err) {
      console.error('[useUser] Falha ao buscar sessão:', err);
      cachedUser = null;
      cacheLoaded = true;
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/me', { method: 'DELETE', credentials: 'include' });
    cachedUser = null;
    cacheLoaded = false;
    setUser(null);
  }, []);

  return { user, loading, refreshUser: fetchUser, logout };
}
