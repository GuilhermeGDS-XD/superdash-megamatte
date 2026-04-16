'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, XCircle, Shield, TrendingUp, Zap } from 'lucide-react';
import { canViewLogs } from '@/lib/roles';
import { useUser } from '@/hooks/useUser';

interface SecurityIssue {
  id: string;
  title: string;
  severity: 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO';
  category: 'Infraestrutura' | 'Dependências' | 'API' | 'Autenticação' | 'Session';
  description: string;
  remediation: string;
  status: 'ABERTO' | 'REMEDIADO' | 'MONITORANDO';
}

const SECURITY_ISSUES: SecurityIssue[] = [
  {
    id: '1',
    title: 'Container roda como root em DEV mode',
    severity: 'CRÍTICO',
    category: 'Infraestrutura',
    description: 'Dockerfile executa `npm run dev` sem USER específico. Risco de privilege escalation.',
    remediation: 'Adicionar USER nextjs e usar `npm start` em produção',
    status: 'ABERTO',
  },
  {
    id: '2',
    title: 'Endpoints sem Rate-Limiting',
    severity: 'ALTO',
    category: 'API',
    description: '/api/manual-login e outras rotas críticas sem proteção contra força bruta',
    remediation: 'Implementar Ratelimit middleware com Redis ou database',
    status: 'ABERTO',
  },
  {
    id: '3',
    title: 'Meta Ads Token em variável de ambiente',
    severity: 'ALTO',
    category: 'Autenticação',
    description: 'META_ADS_ACCESS_TOKEN exposto em .env.local (mesmo que gitignored)',
    remediation: 'Usar Vercel Secrets ou AWS Secrets Manager em produção',
    status: 'MONITORANDO',
  },
  {
    id: '4',
    title: 'Sem CSRF Protection',
    severity: 'MÉDIO',
    category: 'API',
    description: 'Endpoints POST/PATCH sem validação CSRF token. Risco de ataque CSRF.',
    remediation: 'Implementar middleware CSRF com double-submit cookies',
    status: 'ABERTO',
  },
  {
    id: '5',
    title: 'Session Cookie sem SameSite',
    severity: 'MÉDIO',
    category: 'Session',
    description: 'Cookie de sessão não tem SameSite=Strict configurado',
    remediation: 'Adicionar SameSite=Strict ao response do login',
    status: 'ABERTO',
  },
  {
    id: '6',
    title: 'Falta de Security Headers',
    severity: 'MÉDIO',
    category: 'Infraestrutura',
    description: 'Sem Content-Security-Policy, X-Frame-Options, X-Content-Type-Options',
    remediation: 'Configurar next-secure-headers ou headers em next.config.ts',
    status: 'ABERTO',
  },
  {
    id: '7',
    title: 'Validação incompleta de RLS',
    severity: 'ALTO',
    category: 'API',
    description: 'RLS implementado mas nem todas as rotas validam corretamente',
    remediation: 'Auditoria completa de policies do Supabase',
    status: 'MONITORANDO',
  },
];

const DEPENDENCY_STATUS = {
  total: 50,
  vulnerabilities: 3,
  outdated: 2,
  acceptable: 45,
};

export default function SecurityDashboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { user } = useUser();
  const router = useRouter();

  // Event listener para o atalho CTRL+ALT+SHIFT+S
  useEffect(() => {
    setIsMounted(true);

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Verificar autorização
  useEffect(() => {
    if (isVisible && !canViewLogs(user?.role)) {
      setIsVisible(false);
      router.push('/');
    }
  }, [isVisible, user, router]);

  if (!isMounted || !isVisible) return null;

  const criticalCount = SECURITY_ISSUES.filter((i) => i.severity === 'CRÍTICO').length;
  const highCount = SECURITY_ISSUES.filter((i) => i.severity === 'ALTO').length;
  const mediumCount = SECURITY_ISSUES.filter((i) => i.severity === 'MÉDIO').length;
  const lowCount = SECURITY_ISSUES.filter((i) => i.severity === 'BAIXO').length;
  const complianceScore = Math.round((1 - (criticalCount * 25 + highCount * 15 + mediumCount * 5) / 100) * 100);

  const severityColors = {
    CRÍTICO: 'bg-red-100 border-red-300 text-red-900',
    ALTO: 'bg-orange-100 border-orange-300 text-orange-900',
    MÉDIO: 'bg-yellow-100 border-yellow-300 text-yellow-900',
    BAIXO: 'bg-green-100 border-green-300 text-green-900',
  };

  const severityIcons = {
    CRÍTICO: <XCircle className="w-5 h-5 text-red-600" />,
    ALTO: <AlertCircle className="w-5 h-5 text-orange-600" />,
    MÉDIO: <TrendingUp className="w-5 h-5 text-yellow-600" />,
    BAIXO: <CheckCircle className="w-5 h-5 text-green-600" />,
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm overflow-auto">
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Shield className="w-8 h-8 text-blue-500" />
                <Zap className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">🔒 Security Dashboard</h1>
                <p className="text-slate-400 text-sm mt-1">Auditoria de Segurança em Tempo Real | Pressione CTRL+ALT+SHIFT+S para fechar</p>
              </div>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-slate-400 hover:text-white text-2xl font-bold transition"
            >
              ✕
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 hover:bg-red-900/40 transition">
              <p className="text-red-400 text-sm font-bold uppercase">🔴 Críticos</p>
              <p className="text-3xl font-black text-red-300 mt-2">{criticalCount}</p>
            </div>
            <div className="bg-orange-900/30 border border-orange-600 rounded-lg p-4 hover:bg-orange-900/40 transition">
              <p className="text-orange-400 text-sm font-bold uppercase">🟠 Altos</p>
              <p className="text-3xl font-black text-orange-300 mt-2">{highCount}</p>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 hover:bg-yellow-900/40 transition">
              <p className="text-yellow-400 text-sm font-bold uppercase">🟡 Médios</p>
              <p className="text-3xl font-black text-yellow-300 mt-2">{mediumCount}</p>
            </div>
            <div className="bg-green-900/30 border border-green-600 rounded-lg p-4 hover:bg-green-900/40 transition">
              <p className="text-green-400 text-sm font-bold uppercase">🟢 Baixos</p>
              <p className="text-3xl font-black text-green-300 mt-2">{lowCount}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-purple-600 rounded-lg p-4 hover:from-blue-900/40 hover:to-purple-900/40 transition">
              <p className="text-blue-400 text-sm font-bold uppercase">Compliance Score</p>
              <p className="text-3xl font-black text-blue-300 mt-2">{complianceScore}%</p>
            </div>
          </div>

          {/* Issues Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-700">
              <h2 className="text-xl font-black text-white">📋 Problemas Identificados ({SECURITY_ISSUES.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900">
                  <tr className="border-b border-slate-700">
                    <th className="px-6 py-3 text-left text-slate-300 font-bold">Severidade</th>
                    <th className="px-6 py-3 text-left text-slate-300 font-bold">Título</th>
                    <th className="px-6 py-3 text-left text-slate-300 font-bold">Categoria</th>
                    <th className="px-6 py-3 text-left text-slate-300 font-bold">Descrição</th>
                    <th className="px-6 py-3 text-left text-slate-300 font-bold">Status</th>
                    <th className="px-6 py-3 text-left text-slate-300 font-bold">Remediação</th>
                  </tr>
                </thead>
                <tbody>
                  {SECURITY_ISSUES.map((issue, idx) => (
                    <tr
                      key={issue.id}
                      className="border-b border-slate-700 hover:bg-slate-700/50 transition"
                      style={{
                        backgroundColor:
                          issue.severity === 'CRÍTICO' ? 'rgba(239, 68, 68, 0.05)' : undefined,
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {severityIcons[issue.severity]}
                          <span className={`px-2 py-1 rounded text-xs font-bold ${severityColors[issue.severity]}`}>
                            {issue.severity}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-200 font-semibold">{issue.title}</td>
                      <td className="px-6 py-4 text-slate-400 text-xs">{issue.category}</td>
                      <td className="px-6 py-4 text-slate-400 max-w-xs text-xs">{issue.description}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            issue.status === 'REMEDIADO'
                              ? 'bg-green-900/30 text-green-300'
                              : issue.status === 'MONITORANDO'
                                ? 'bg-blue-900/30 text-blue-300'
                                : 'bg-red-900/30 text-red-300'
                          }`}
                        >
                          {issue.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300 max-w-xs text-xs">{issue.remediation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-slate-400 text-xs space-y-2">
            <p className="font-bold">✅ Para fechar: Pressione CTRL+ALT+SHIFT+S</p>
            <p>Relatório gerado em: {new Date().toLocaleString('pt-BR')}</p>
            <p className="text-slate-500 text-[10px]">Dashboard de Segurança - Acesso Restrito a Admins</p>
          </div>
        </div>
      </div>
    </div>
  );
}
