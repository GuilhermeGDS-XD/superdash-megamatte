// useMetaConnection — autenticação via variáveis de ambiente (sem OAuth)
// Sempre retorna connected=true pois as credenciais são configuradas no servidor.
export function useMetaConnection() {
  return {
    connected: true,
    anyAdminConnected: true,
    loading: false,
    accounts: [],
    error: null,
  };
}
