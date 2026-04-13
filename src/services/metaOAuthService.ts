/**
 * Serviço OAuth2 para Meta/Facebook
 * Gerencia a autenticação e comunicação com a API Meta
 */
export class MetaOAuthService {
  private static readonly appId = process.env.META_OAUTH_APP_ID;
  private static readonly appSecret = process.env.META_OAUTH_APP_SECRET;
  private static readonly redirectUri = process.env.META_OAUTH_REDIRECT_URI;

  /**
   * Valida se as variáveis de ambiente estão configuradas
   */
  private static validateConfig(): void {
    if (!this.appId || !this.appSecret || !this.redirectUri) {
      throw new Error(
        'Credenciais OAuth2 Meta não configuradas. '
        + 'Configure: META_OAUTH_APP_ID, META_OAUTH_APP_SECRET, META_OAUTH_REDIRECT_URI'
      );
    }
  }

  /**
   * 1️⃣ Gera URL de login Meta que será aberta em popup
   * 
   * @param state - Token CSRF para validação
   * @returns URL completa para redirect no popup
   */
  static getLoginUrl(state: string): string {
    this.validateConfig();

    const params = new URLSearchParams({
      client_id: this.appId!,
      redirect_uri: this.redirectUri!,
      state,
      scope: 'ads_management,pages_show_list,business_management',
      response_type: 'code',
      auth_type: 'reauthenticate', // Force re-login se já autenticado
      display: 'popup', // Abre em popup
    });

    return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
  }

  /**
   * 2️⃣ Troca authorization_code por access_token
   * Chamado pelo backend após usuário autorizar
   * 
   * @param code - Authorization code vindo de Meta
   * @returns Token de acesso e info relacionada
   */
  static async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
  }> {
    this.validateConfig();

    try {
      const response = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.appId!,
          client_secret: this.appSecret!,
          redirect_uri: this.redirectUri!,
          code,
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Meta token exchange error:', errorData);
        throw new Error(`Failed to exchange code for token: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return {
        access_token: data.access_token,
        token_type: data.token_type || 'bearer',
        expires_in: data.expires_in || 5184000, // 60 dias
      };
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
    }
  }

  /**
   * 3️⃣ Busca contas Ad do usuário com token temporário
   * Chamado após obter access_token
   * 
   * @param accessToken - Token de acesso temporário
   * @returns Array de contas Meta disponíveis
   */
  static async getUserAdAccounts(accessToken: string): Promise<any[]> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id,account_status,currency&access_token=${accessToken}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Meta get ad accounts error:', errorData);
        throw new Error(`Failed to get ad accounts: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // Filtra e formata as contas
      return (data.data || []).map((account: any) => ({
        account_id: account.account_id,
        account_name: account.name,
        account_status: account.account_status,
        currency: account.currency,
      }));
    } catch (error) {
      console.error('Error getting ad accounts:', error);
      throw error;
    }
  }

  /**
   * 4️⃣ Busca informações do business account
   * Opcional - para exibir mais detalhes
   * 
   * @param accessToken - Token de acesso
   * @returns Dados do business account
   */
  static async getBusinessAccount(accessToken: string): Promise<any> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${accessToken}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get business account info');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting business account:', error);
      throw error;
    }
  }

  /**
   * Gera um token state aleatório para CSRF protection
   * @returns String aleatória de 32 caracteres hex
   */
  static generateStateToken(): string {
    return require('crypto').randomBytes(16).toString('hex');
  }
}
