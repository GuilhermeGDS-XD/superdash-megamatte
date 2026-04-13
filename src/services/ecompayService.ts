// Serviço estático para integração com API Ecompay
// Sempre autentica a cada chamada — sem cache de token

class EcompayService {
  private static readonly apiUrl = 'https://api.ecompay.app';
  private static readonly credentials = {
    email: process.env.ECOMPAY_EMAIL || 'seu_email@ecompay.com.br',
    password: process.env.ECOMPAY_PASSWORD || 'sua_senha_aqui',
  };

  // Autentica com API Ecompay — chamado a cada request
  static async authenticate(): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro na autenticação Ecompay:', response.status, errorData);
        throw new Error(`Falha na autenticação Ecompay: ${response.status}`);
      }

      const data = await response.json();
      const token = data.access_token || data.token || data.accessToken;
      if (!token) throw new Error('Token não encontrado na resposta de login');
      console.log('✅ Autenticação Ecompay bem-sucedida');
      return token;
    } catch (error: any) {
      console.error('❌ Erro ao autenticar com Ecompay:', error.message);
      throw error;
    }
  }

  // Obtém o ID do perfil — sempre busca após autenticar
  static async getProfileId(): Promise<string> {
    try {
      const token = await this.authenticate();
      const response = await fetch(`${this.apiUrl}/team/my/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        console.error('❌ Erro ao buscar perfis:', response.status);
        throw new Error('Falha ao buscar perfil');
      }

      const data = await response.json();
      console.log('📋 Perfis disponíveis:', data);
      
      // Tenta encontrar o perfil específico
      const profile = data.find(
        (t: any) => t.email === 'ecompay@anclivepa-sp.com.br'
      );

      // Se não encontrar, usa o primeiro perfil disponível
      const finalProfile = profile || data?.[0];

      if (!finalProfile) {
        throw new Error('Nenhum perfil encontrado na conta Ecompay');
      }

      const profileId = finalProfile._id || finalProfile.id;
      console.log('✅ Perfil carregado:', finalProfile.email, '- ID:', profileId);
      return profileId as string;
    } catch (error: any) {
      console.error('❌ Erro ao obter profileId:', error.message);
      throw error;
    }
  }

  // Lista de produtos
  static async getProducts() {
    const token = await this.authenticate();
    const profileId = await this.getProfileId();

    const response = await fetch(`${this.apiUrl}/product/list/type/single`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-profile-id': profileId,
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8',
      },
    });

    if (!response.ok) {
      throw new Error('Falha ao buscar produtos');
    }

    return response.json();
  }

  // Pedidos de um produto, filtrado por status
  static async getOrders(productId?: string, status?: string) {
    const token = await this.authenticate();
    const profileId = await this.getProfileId();

    const body: any = { adminMode: false };
    if (productId) body.products = productId;
    if (status) body.status = status;

    const response = await fetch(`${this.apiUrl}/order/list/1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-profile-id': profileId,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Falha ao buscar pedidos');
    }

    return response.json();
  }

  // Busca todas as páginas de pedidos e soma totalPrice
  // Limitado a maxPages para evitar timeout — suficiente para qualquer produto de campanha
  static async sumOrdersAllPages(productId?: string, status?: string, maxPages = 100): Promise<number> {
    // Sem productId não pagina — evita timeout com milhares de pedidos
    if (!productId) return 0;

    const token = await this.authenticate();
    const profileId = await this.getProfileId();

    const body: any = { adminMode: false, products: productId };
    if (status) body.status = status;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-profile-id': profileId,
    };

    // Busca a primeira página para obter o total de páginas
    const firstResp = await fetch(`${this.apiUrl}/order/list/1`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!firstResp.ok) throw new Error('Falha ao buscar pedidos');
    const firstData = await firstResp.json();

    const totalPages: number = Math.min(firstData.pages || 1, maxPages);
    let sum = 0;

    for (const order of (firstData.data || [])) {
      sum += order.totalPrice || 0;
    }

    // Busca demais páginas em lotes de 5 simultaneamente
    for (let page = 2; page <= totalPages; page += 5) {
      const batch: Promise<any>[] = [];
      for (let p = page; p < page + 5 && p <= totalPages; p++) {
        batch.push(
          fetch(`${this.apiUrl}/order/list/${p}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          }).then(r => r.json())
        );
      }
      const results = await Promise.all(batch);
      for (const pageData of results) {
        for (const order of (pageData.data || [])) {
          sum += order.totalPrice || 0;
        }
      }
    }

    return sum;
  }

  // Soma de valores
  static async getOrdersSum(productId?: string, status: string[] = ['paid', 'pending']) {
    const token = await this.authenticate();
    const profileId = await this.getProfileId();

    const body: any = { status };
    if (productId) body.products = productId;

    const response = await fetch(`${this.apiUrl}/order/sum`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-profile-id': profileId,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Falha ao buscar somas');
    }

    return response.json();
  }

  // Consolidação de dados de vendas
  static async getSalesData(productId?: string) {
    try {
      // Busca contagens e somas em paralelo
      const [paidOrders, pendingOrders, totalPaid, totalPending] = await Promise.all([
        this.getOrders(productId, 'paid'),
        this.getOrders(productId, 'pending'),
        this.sumOrdersAllPages(productId, 'paid'),
        this.sumOrdersAllPages(productId, 'pending'),
      ]);

      const completedCount = paidOrders.count || 0;
      const processingCount = pendingOrders.count || 0;

      return {
        completedPurchases: completedCount,
        processingPurchases: processingCount,
        totalProcessed: totalPaid,
        totalProcessing: totalPending,
        totalExpected: totalPaid + totalPending,
      };
    } catch (error: any) {
      console.error('❌ Erro ao consolidar dados de vendas:', error.message);
      throw error;
    }
  }
}

export default EcompayService;
