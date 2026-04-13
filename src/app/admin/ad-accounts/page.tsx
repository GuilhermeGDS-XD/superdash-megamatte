'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { 
  RefreshCw, 
  Database,
  ArrowLeft,
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ListFilter
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { isSuperAdmin } from '@/lib/roles';

interface AdAccount {
  account_id: string;
  name: string;
  account_status: number;
  currency: string;
}

export default function AdAccountsPage() {
  const { user: profile, loading: userLoading } = useUser();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'meta' | 'google'>('meta');
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingMap, setSyncingMap] = useState<Record<string, boolean>>({});
  const [resultsMap, setResultsMap] = useState<Record<string, { success: boolean, message: string }>>({});

  useEffect(() => {
    if (!userLoading && (!profile || !isSuperAdmin(profile.role))) {
      router.push('/');
    }
  }, [profile, userLoading, router]);

  const loadAccounts = useCallback(async () => {
    if (activeTab === 'google') {
      setAccounts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/meta/accounts');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar contas');
      }

      setAccounts(data.accounts || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (isSuperAdmin(profile?.role)) {
      loadAccounts();
    }
  }, [profile, loadAccounts, activeTab]);

  const syncAccount = async (accountId: string) => {
    setSyncingMap(prev => ({ ...prev, [accountId]: true }));
    setResultsMap(prev => {
      const next = { ...prev };
      delete next[accountId];
      return next;
    });

    try {
      const response = await fetch('/api/meta/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          account_id: accountId,
          account_name: accounts.find(a => a.account_id === accountId)?.name
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro de Sincronização');
      }

      setResultsMap(prev => ({
        ...prev,
        [accountId]: { 
          success: true, 
          message: `${data.synced}/${data.campaignsFound} campanhas sincronizadas (${data.failed} falhas).` 
        }
      }));
    } catch (err: any) {
       setResultsMap(prev => ({
        ...prev,
        [accountId]: { 
          success: false, 
          message: err.message
        }
      }));
    } finally {
      setSyncingMap(prev => ({ ...prev, [accountId]: false }));
    }
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
              Contas de <span className="text-blue-600">Anúncios</span>
            </h1>
            <p className="text-slate-400 font-medium font-space italic uppercase tracking-widest text-[10px] mt-1">Busque e sincronize campanhas disponíveis</p>
          </div>
        </div>

        <button 
          onClick={loadAccounts}
          disabled={loading || activeTab === 'google'}
          className="flex items-center gap-3 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={cn(loading && "animate-spin")} />
          Recarregar
        </button>
      </header>

      {/* Tabs */}
      <div className="flex space-x-2 bg-slate-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('meta')}
          className={cn(
            "px-6 py-3 rounded-xl font-black text-sm transition-all",
            activeTab === 'meta' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
          )}
        >
          Meta Ads
        </button>
        <button
          onClick={() => setActiveTab('google')}
          className={cn(
            "px-6 py-3 rounded-xl font-black text-sm transition-all",
            activeTab === 'google' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
          )}
        >
          Google Ads
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-6 rounded-[2rem] border border-red-100 flex items-center gap-4">
          <AlertCircle size={24} className="shrink-0" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={48} />
        </div>
      ) : activeTab === 'google' ? (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-slate-100">
           <Database size={48} className="mx-auto text-slate-300 mb-6" />
           <h3 className="text-2xl font-black text-slate-700 italic uppercase">Em Breve</h3>
           <p className="text-slate-400 mt-2 font-medium">A sincronização do Google Ads via API está em desenvolvimento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {accounts.length === 0 && !error ? (
             <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-slate-100">
               <Database size={48} className="mx-auto text-slate-300 mb-6" />
               <h3 className="text-2xl font-black text-slate-700 italic uppercase">Nenhuma conta encontrada</h3>
               <p className="text-slate-400 mt-2 font-medium">Verifique as permissões do seu token do Meta.</p>
             </div>
          ) : (
             accounts.map((account) => {
               const isSyncing = syncingMap[account.account_id];
               const result = resultsMap[account.account_id];
               
               // Status 1 geralmente é "ACTIVE" na Graph API
               const isActive = account.account_status === 1;

               return (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   key={account.account_id}
                   className={cn("bg-white border rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all", isActive ? "border-slate-100" : "border-red-100 opacity-60")}
                 >
                   <div className="flex items-center gap-6">
                      <div className={cn(
                        "h-16 w-16 rounded-[1.5rem] flex items-center justify-center shrink-0",
                        isActive ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
                      )}>
                        <ListFilter size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-slate-800">{account.name}</h3>
                          {!isActive && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-[10px] font-bold uppercase tracking-widest">Inativa</span>
                          )}
                        </div>
                        <p className="text-slate-400 font-medium text-sm mt-1">ID: act_{account.account_id.replace('act_', '')} • Moeda: {account.currency}</p>
                      </div>
                   </div>

                   <div className="flex flex-col items-end gap-3 shrink-0 min-w-[280px]">
                      <button
                        onClick={() => syncAccount(account.account_id)}
                        disabled={isSyncing || !isActive}
                        className="w-full md:w-auto bg-slate-900 hover:bg-blue-600 focus:bg-blue-600 text-white px-8 py-4 rounded-2xl font-black italic uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 disabled:opacity-50 group"
                      >
                        {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />}
                        {isSyncing ? "Sincronizando..." : (!isActive ? "Conta Inativa" : "Sincronizar Campanhas")}
                      </button>
                      
                      <AnimatePresence>
                        {result && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className={cn(
                              "flex items-center gap-2 text-[11px] font-bold px-3 py-2 rounded-lg",
                              result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                            )}
                          >
                            {result.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                            {result.message}
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </div>
                 </motion.div>
               );
             })
          )}
        </div>
      )}
    </div>
  );
}
