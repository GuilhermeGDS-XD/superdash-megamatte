// useMetaConnection — autenticação via variáveis de ambiente (sem OAuth)
// Sempre retorna connected=true pois as credenciais são configuradas no servidor (.env.local).
export function useMetaConnection() {
  const isEnvConfigured = true; // No frontend assumimos que o servidor está configurado

  return {
    connected: isEnvConfigured,
    anyAdminConnected: isEnvConfigured,
    loading: false,
    accounts: [], // Listagem via /api/meta/accounts se necessário
    error: null,
    isStatic: true
  };
}
