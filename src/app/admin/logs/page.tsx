'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Loader2,
  RefreshCcw,
  Clock,
  User as UserIcon,
  Calendar,
  Activity,
  History,
  Search,
  Filter as FilterIcon,
  X
} from 'lucide-react';
import Link from 'next/link';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { canViewLogs } from '@/lib/roles';
import { motion, AnimatePresence } from 'framer-motion';

const LOG_ACTIONS: Record<string, { label: string; color: string; icon: any }> = {
  'CAMPAIGN_CREATE': { label: 'CRIAÇÃO', color: 'bg-green-500', icon: Activity },
  'CAMPAIGN_UPDATE': { label: 'EDIÇÃO', color: 'bg-blue-500', icon: Activity },
  'CAMPAIGN_DELETE': { label: 'EXCLUSÃO', color: 'bg-red-500', icon: Activity },
  'USER_LOGIN': { label: 'LOGIN', color: 'bg-purple-500', icon: UserIcon },
  'USER_CREATE': { label: 'NOVO USUÁRIO', color: 'bg-orange-500', icon: UserIcon },
};

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: profile, loading: userLoading } = useUser();
  const router = useRouter();
  
  // Estados de Filtro
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterDate, setFilterDate] = useState('');

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/logs', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setLogs(data.logs || []);
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userLoading) {
      if (!profile) {
        router.push('/login');
        return;
      }
      
      const hasAccessToLogs = canViewLogs(profile.role, profile.can_view_logs);

      if (!hasAccessToLogs) {
        console.warn('Acesso negado aos logs para o usuário:', profile.name);
        router.push('/');
        return;
      }
      
      fetchLogs();
    }
  }, [profile, userLoading, router]);

  // Lógica de Filtragem por NOME do usuário
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const userName = log.users?.full_name || 'SISTEMA';
      const matchAction = !filterAction || log.action === filterAction;
      const matchUser = !filterUser || userName.toLowerCase().includes(filterUser.toLowerCase());
      const matchCampaign = !filterCampaign || (log.metadata?.campaign_name && log.metadata.campaign_name.toLowerCase().includes(filterCampaign.toLowerCase()));
      const matchDate = !filterDate || (log.created_at && isSameDay(parseISO(log.created_at), parseISO(filterDate)));
      
      return matchAction && matchUser && matchCampaign && matchDate;
    });
  }, [logs, filterAction, filterUser, filterCampaign, filterDate]);

  const uniqueActions = useMemo(() => Array.from(new Set(logs.map(l => l.action))), [logs]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 min-h-screen pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <Link href="/" className="h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm group">
              <ArrowLeft className="text-slate-600 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter font-space italic uppercase">
              Auditoria <span className="text-blue-600">Logs</span>
            </h1>
          </div>
          <p className="text-slate-500 font-medium tracking-wide pl-2 uppercase text-[10px] tracking-[0.3em]">Monitoramento e Filtros Avançados</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="bg-slate-900 text-white font-black py-4 px-8 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl hover:bg-blue-600 uppercase tracking-widest text-xs"
        >
          <RefreshCcw size={20} className={cn(loading && "animate-spin")} />
          Sincronizar
        </button>
      </header>

      <div className="bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-inner">
        <div className="flex items-center gap-3 mb-6 text-slate-400">
          <FilterIcon size={18} strokeWidth={3} />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Filtrar Resultados</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
            <div className="relative">
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition-all pr-10"
              />
              {filterDate && (
                <button onClick={() => setFilterDate('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500">
                  <X size={16} strokeWidth={3} />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Ação</label>
            <select 
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="">TODAS AS AÇÕES</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>
                  {LOG_ACTIONS[action]?.label || action}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário (Nome)</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input 
                type="text" 
                placeholder="BUSCAR NOME..."
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-full bg-white border-2 border-slate-100 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition-all placeholder:text-slate-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Campanha</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input 
                type="text" 
                placeholder="NOME DA CAMP..."
                value={filterCampaign}
                onChange={(e) => setFilterCampaign(e.target.value)}
                className="w-full bg-white border-2 border-slate-100 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition-all placeholder:text-slate-200"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-visible shadow-xl shadow-slate-200/40 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="text-blue-500 animate-spin" size={48} strokeWidth={3} />
            <p className="font-black text-slate-300 uppercase tracking-widest text-[10px]">Filtrando registros...</p>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="divide-y divide-slate-50">
            <AnimatePresence mode="popLayout">
              {filteredLogs.map((log, index) => {
                const action = LOG_ACTIONS[log.action] || { label: log.action, color: 'bg-slate-900', icon: Activity };
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    key={log.id}
                    className="group flex flex-col md:flex-row items-center gap-5 p-5 hover:bg-slate-50/80 transition-all"
                  >
                    <div className={cn("h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-white shadow-md", action.color)}>
                      <action.icon size={20} strokeWidth={3} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base font-black text-slate-900 italic uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                          {action.label}
                        </span>
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">
                          #{log.id.split('-')[0]}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 opacity-60">
                          <UserIcon size={12} className="text-blue-500" />
                          <span className="text-[10px] font-black uppercase italic tracking-tighter">
                            {log.users?.name || 'SISTEMA'}
                          </span>
                        </div>
                        {log.metadata?.campaign_name && (
                          <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100/50">
                            <div className="w-1 h-1 rounded-full bg-blue-500" />
                            <span className="text-[10px] font-black text-blue-700 uppercase italic">{log.metadata.campaign_name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      <div className="flex items-center gap-2 text-slate-900">
                        <Clock size={16} className="text-blue-500" />
                        <span className="text-base font-black italic tracking-tighter">
                          {format(new Date(log.created_at), "HH:mm")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest font-mono">
                          {format(new Date(log.created_at), "dd/MM/yy")}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 text-slate-300">
            <History className="mb-6 opacity-10" size={80} />
            <p className="text-2xl font-black italic uppercase tracking-tighter text-slate-400">Nenhum resultado encontrado</p>
            <button 
              onClick={() => { setFilterAction(''); setFilterUser(''); setFilterCampaign(''); setFilterDate(''); }}
              className="mt-4 text-blue-500 font-black uppercase text-[10px] tracking-widest hover:underline"
            >
              Limpar todos os filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
