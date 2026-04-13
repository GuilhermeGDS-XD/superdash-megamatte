// Serviço de integração com a API Exact Spotter V2
// Documentação: https://exactspotter.docs.apiary.io/
// URL base: https://api.exactspotter.com/v3
// Auth: header token_exact

const BASE_URL = 'https://api.exactspotter.com/v3';
const TOKEN = process.env.SPOTTER_TOKEN || '35c583eb-bc63-42e0-887a-a7827b1dea73';
const TIMEOUT_MS = 10_000;

// Estágios que representam venda ganha
export const STAGES_VENDA = ['Venda Ganha', 'Venda', 'Won', 'Venda Ganha'];
// Estágios que representam descarte
export const STAGES_DESCARTE = ['Descartado', 'Descarte', 'Lost'];
// Estágios que representam reunião agendada (estimativa baseada nos estágios)
export const STAGES_REUNIAO = ['Negociação', 'Em Atendimento', 'Reunião Agendada', 'Reunião', 'Feedback'];

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'token_exact': TOKEN,
  };
}

// Fetch com timeout via AbortController
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Timeout: a API Spotter não respondeu em ${TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Estrutura real da API Spotter v3
export interface SpotterLead {
  id: number;
  lead: string;          // nome do lead
  stage?: string;
  registerDate?: string;
  updateDate?: string;
  phone1?: string;
  phone2?: string;
  website?: string;
  funnelId?: number;
  source?: { id: number; value: string };
  subSource?: { id: number; value: string };
  industry?: { id: number; value: string };
  sdr?: {
    id: number;
    name: string;
    lastName: string;
    email: string;
    active: boolean;
  };
  salesRep?: {
    id: number | null;
    name: string | null;
    lastName: string | null;
    email: string | null;
    active: boolean;
  };
}

export interface SpotterMetrics {
  totalLeads: number;
  totalMeetings: number;
  totalSales: number;
  totalDiscards: number;
  conversionRate: number;
  schedulingRate: number;
  discardRate: number;
}

export interface SpotterFunnel {
  id: number;
  value: string;
  active: boolean;
}

export interface SpotterOrigin {
  id: number;
  value: string;
  active: boolean;
}

// Busca todos os funis disponíveis
export async function getFunnels(): Promise<SpotterFunnel[]> {
  const response = await fetchWithTimeout(`${BASE_URL}/Funnels`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar funis: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data?.value ?? [];
}

// Busca todas as origens disponíveis
export async function getOrigins(): Promise<SpotterOrigin[]> {
  const response = await fetchWithTimeout(`${BASE_URL}/Origins`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar origens: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data?.value ?? [];
}

// Lista leads com suporte a filtros OData
export async function getLeads(params?: {
  top?: number;
  skip?: number;
  filter?: string;
  orderby?: string;
}): Promise<SpotterLead[]> {
  const query = new URLSearchParams();

  if (params?.top) query.set('$top', String(params.top));
  if (params?.skip) query.set('$skip', String(params.skip));
  if (params?.filter) query.set('$filter', params.filter);
  if (params?.orderby) query.set('$orderby', params.orderby);

  const url = `${BASE_URL}/Leads${query.toString() ? `?${query}` : ''}`;

  const response = await fetchWithTimeout(url, { headers: getHeaders() });

  if (!response.ok) {
    throw new Error(`Erro ao buscar leads: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data?.value ?? [];
}

// Busca um lead específico por ID
export async function getLeadById(id: number): Promise<SpotterLead> {
  const response = await fetchWithTimeout(`${BASE_URL}/Leads/${id}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar lead ${id}: ${response.status}`);
  }

  return response.json();
}

// Busca todos os leads página por página sem limite fixo
// onProgress é chamado após cada página com o total acumulado
export async function getAllLeads(
  onProgress?: (fetched: number, hasMore: boolean) => void
): Promise<SpotterLead[]> {
  const PAGE = 500;
  const results: SpotterLead[] = [];
  let skip = 0;

  while (true) {
    const page = await getLeads({ top: PAGE, skip });
    results.push(...page);
    skip += PAGE;
    const hasMore = page.length === PAGE;
    onProgress?.(results.length, hasMore);
    if (!hasMore) break;
  }

  return results;
}

// Calcula métricas derivadas apenas a partir dos leads
export function computeMetrics(leads: SpotterLead[]): SpotterMetrics {
  const totalLeads = leads.length;

  const totalSales = leads.filter((l) =>
    STAGES_VENDA.some((s) => l.stage?.toLowerCase() === s.toLowerCase())
  ).length;

  const totalDiscards = leads.filter((l) =>
    STAGES_DESCARTE.some((s) => l.stage?.toLowerCase() === s.toLowerCase())
  ).length;

  // Estimativa: leads que chegaram em estágios avançados tiveram reunião
  const totalMeetings = leads.filter((l) =>
    STAGES_REUNIAO.some((s) => l.stage?.toLowerCase() === s.toLowerCase())
  ).length + totalSales;

  const activeLeads = leads.filter((l) =>
    !STAGES_DESCARTE.some((s) => l.stage?.toLowerCase() === s.toLowerCase())
  ).length;

  const conversionRate = activeLeads > 0 ? (totalSales / activeLeads) * 100 : 0;
  const schedulingRate = totalLeads > 0 ? (totalMeetings / totalLeads) * 100 : 0;
  const discardRate = totalLeads > 0 ? (totalDiscards / totalLeads) * 100 : 0;

  return {
    totalLeads,
    totalMeetings,
    totalSales,
    totalDiscards,
    conversionRate,
    schedulingRate,
    discardRate,
  };
}
