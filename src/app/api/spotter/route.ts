import { NextRequest, NextResponse } from 'next/server';
import { getLeads, getFunnels, computeMetrics, STAGES_VENDA } from '@/services/spotterService';
import type { SpotterLead } from '@/services/spotterService';

function buildAggregations(leads: SpotterLead[]) {
  const metrics = computeMetrics(leads);

  const bySdr: Record<string, { name: string; leads: number; meetings: number; sales: number }> = {};
  for (const lead of leads) {
    const email = lead.sdr?.email ?? 'Não atribuído';
    const displayName = lead.sdr
      ? `${lead.sdr.name} ${lead.sdr.lastName}`.trim()
      : 'Não atribuído';
    if (!bySdr[email]) bySdr[email] = { name: displayName, leads: 0, meetings: 0, sales: 0 };
    bySdr[email].leads++;
    if (STAGES_VENDA.some((s) => lead.stage?.toLowerCase() === s.toLowerCase())) bySdr[email].sales++;
  }
  const byVendedor = Object.values(bySdr).sort((a, b) => {
    const convA = a.leads > 0 ? a.sales / a.leads : 0;
    const convB = b.leads > 0 ? b.sales / b.leads : 0;
    return convB - convA;
  });

  const stageMap: Record<string, number> = {};
  for (const lead of leads) {
    const stage = lead.stage ?? 'Desconhecido';
    stageMap[stage] = (stageMap[stage] ?? 0) + 1;
  }
  const byStage = Object.entries(stageMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const sourceMap: Record<string, number> = {};
  for (const lead of leads) {
    const src = lead.source?.value ?? 'Sem origem';
    sourceMap[src] = (sourceMap[src] ?? 0) + 1;
  }
  const bySource = Object.entries(sourceMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8);

  return { metrics, byVendedor, byStage, bySource, total: leads.length };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'leads';
  const top = searchParams.get('top');
  const filter = searchParams.get('filter');

  try {
    if (type === 'funnels') {
      const funnels = await getFunnels();
      return NextResponse.json({ funnels });
    }

    if (type === 'metrics') {
      const since = searchParams.get('since') ?? undefined;
      // Monta filtro OData com DateTimeOffset (sem aspas, exigido pela API)
      const odataFilter = since ? `registerDate ge ${since}T00:00:00Z` : undefined;

      // Streaming SSE — envia progresso página a página e resultado final ao terminar
      const encoder = new TextEncoder();
      const send = (data: object) => encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const PAGE = 500;
            const allLeads: SpotterLead[] = [];
            let skip = 0;

            while (true) {
              const page = await getLeads({ top: PAGE, skip, filter: odataFilter });
              allLeads.push(...page);
              skip += PAGE;
              const hasMore = page.length === PAGE;

              controller.enqueue(send({ type: 'progress', fetched: allLeads.length, hasMore }));

              if (!hasMore) break;
            }

            const { metrics, byVendedor, byStage, bySource, total } = buildAggregations(allLeads);
            controller.enqueue(send({
              type: 'done',
              metrics,
              byVendedor,
              byStage,
              bySource,
              topDiscardReasons: [],
              totalLeadsRaw: total,
            }));
          } catch (err: any) {
            controller.enqueue(send({ type: 'error', message: err.message ?? 'Erro interno' }));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // Tipo padrão: lista de leads
    const leads = await getLeads({
      top: top ? Number(top) : 100,
      filter: filter ?? undefined,
    });

    return NextResponse.json({ leads });
  } catch (error: any) {
    console.error('Erro na rota /api/spotter:', error.message);

    const isTimeout = error.message?.includes('Timeout') || error.message?.includes('timeout');

    if (isTimeout) {
      return NextResponse.json(
        { error: 'Não foi possível conectar ao Exact Spotter. Verifique se o token é válido.', timeout: true },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message ?? 'Erro interno ao buscar dados do Spotter' },
      { status: 500 }
    );
  }
}
