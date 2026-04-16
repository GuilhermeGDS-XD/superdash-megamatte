'use client';

import React, { useState, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Download,
  ArrowLeft,
  Database,
  Table as TableIcon
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import { cn } from '@/lib/utils';
import { isSuperAdmin } from '@/lib/roles';

interface CSVRow {
  id_campanha: string;
  plataforma: string;
  nome_campanha: string;
}

export default function ImportCSVPage() {
  const { user: profile, loading: userLoading } = useUser();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirecionamento se não for Super Admin
  React.useEffect(() => {
    if (!userLoading && (!profile || !isSuperAdmin(profile.role))) {
      router.push('/');
    }
  }, [profile, userLoading, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Por favor, selecione um arquivo CSV válido.');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResults(null);
    }
  };

  const downloadExample = () => {
    const csvContent = "id_campanha,plataforma,nome_campanha\n12345678,GOOGLE_ADS,Campanha Sapato Verão\n98765432,META_ADS,Promoção Tenis Corrida\n55443322,GOOGLE_ADS,Lançamento Outono";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exemplo_importacao.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const startImport = async () => {
    if (!file) return;
    setImporting(true);
    setResults(null);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parsed) => {
        const rows = parsed.data as any[];
        try {
          const res = await fetch('/api/admin/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ rows, user_id: profile?.id })
          });
          const data = await res.json();
          setResults({ success: data.success, errors: data.errors || [] });
        } catch (err: any) {
          setError('Erro ao importar: ' + err.message);
        } finally {
          setImporting(false);
        }
      }, 
      error: (err) => {
        setError('Erro ao ler o arquivo CSV: ' + err.message);
        setImporting(false);
      }
    });
  };

  if (userLoading) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 px-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-6 border-b border-slate-100">
        <div className="flex items-center gap-6">
          <Link 
            href="/" 
            className="h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm group"
          >
            <ArrowLeft className="text-slate-600 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter font-space italic uppercase">
              Importar <span className="text-blue-600">CSV</span>
            </h1>
            <p className="text-slate-400 font-medium font-space italic uppercase tracking-widest text-[10px] mt-1">Carregue campanhas em massa diretamente no banco</p>
          </div>
        </div>

        <button 
          onClick={downloadExample}
          className="flex items-center gap-3 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
        >
          <Download size={16} />
          Baixar Exemplo
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lado Esquerdo: Upload */}
        <div className="lg:col-span-2 space-y-8">
          <div className={cn(
            "relative group bg-white border-4 border-dashed rounded-[3rem] p-16 transition-all duration-500 flex flex-col items-center justify-center text-center",
            file ? "border-blue-500/20 bg-blue-50/10" : "border-slate-100 hover:border-blue-200 hover:bg-slate-50/50"
          )}>
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={importing}
            />
            
            <div className={cn(
              "w-24 h-24 rounded-[2rem] flex items-center justify-center mb-6 transition-all duration-500",
              file ? "bg-blue-600 text-white animate-bounce-short" : "bg-slate-50 text-slate-300 group-hover:scale-110 group-hover:text-blue-500 group-hover:bg-blue-50"
            )}>
              {file ? <FileText size={40} /> : <Upload size={40} />}
            </div>

            <h3 className="text-3xl font-black text-slate-800 italic uppercase tracking-tighter mb-2 leading-none">
              {file ? file.name : "Arraste seu CSV"}
            </h3>
            <p className="text-slate-400 font-medium">O arquivo deve conter as colunas: id_campanha, plataforma, nome_campanha</p>
          </div>

          {file && !results && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <button 
                onClick={startImport}
                disabled={importing}
                className="w-full bg-slate-900 hover:bg-blue-600 text-white p-8 rounded-[2.5rem] font-black italic uppercase tracking-tighter text-2xl transition-all shadow-2xl flex items-center justify-center gap-4 disabled:opacity-50 group"
              >
                {importing ? <Loader2 className="animate-spin" size={32} /> : <Database size={32} className="group-hover:rotate-12 transition-transform" />}
                {importing ? "Processando Banco..." : "Iniciar Importação"}
              </button>
            </motion.div>
          )}

          <AnimatePresence>
            {results && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-2xl space-y-8"
              >
                <div className="flex items-center justify-between border-b border-slate-50 pb-8">
                  <div className="flex items-center gap-4 text-green-500">
                    <CheckCircle2 size={40} />
                    <div>
                      <h4 className="text-4xl font-black italic uppercase tracking-tighter leading-none">{results.success}</h4>
                      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Sucessos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-red-500">
                    <AlertCircle size={40} />
                    <div>
                      <h4 className="text-4xl font-black italic uppercase tracking-tighter leading-none">{results.errors.length}</h4>
                      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Falhas</p>
                    </div>
                  </div>
                </div>

                {results.errors.length > 0 && (
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 px-2">Relatório de Erros</h5>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-4 custom-scrollbar">
                      {results.errors.map((err, i) => (
                        <div key={i} className="bg-red-50 text-red-600 p-4 rounded-2xl text-[11px] font-bold border border-red-100 flex items-center gap-3">
                          <X size={14} className="shrink-0" />
                          {err}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => { setFile(null); setResults(null); }}
                  className="w-full py-4 text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] hover:text-slate-600 transition-colors"
                >
                  Limpar e Importar Outro
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Lado Direito: Instruções */}
        <aside className="space-y-6">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
              <TableIcon size={120} />
            </div>
            
            <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8 relative z-10">Instruções</h3>
            
            <ul className="space-y-6 relative z-10">
              <li className="flex gap-4">
                <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-black italic shrink-0">01</div>
                <p className="text-sm text-slate-300 leading-relaxed font-medium">Use vírgulas como separador no seu arquivo CSV.</p>
              </li>
              <li className="flex gap-4">
                <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-black italic shrink-0">02</div>
                <p className="text-sm text-slate-300 leading-relaxed font-medium">Campos: <code className="text-blue-400">id_campanha</code>, <code className="text-blue-400">plataforma</code> e <code className="text-blue-400">nome_campanha</code>.</p>
              </li>
              <li className="flex gap-4">
                <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-black italic shrink-0">03</div>
                <p className="text-sm text-slate-300 leading-relaxed font-medium">Plataformas suportadas: <span className="text-white font-bold">GOOGLE_ADS</span> ou <span className="text-white font-bold">META_ADS</span>.</p>
              </li>
            </ul>

            <div className="mt-12 p-6 bg-slate-800 rounded-2xl border border-slate-700">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Dica de Master</p>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Você pode importar até 500 campanhas de uma vez para melhor performance do banco.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const X = ({ className, size }: { className?: string, size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
