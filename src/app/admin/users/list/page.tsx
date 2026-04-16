'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  ArrowLeft,
  Loader2,
  Shield,
  ShieldCheck,
  MoreVertical,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { isAdmin, roleLabel } from '@/lib/roles';

export default function UsersListPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteStatus, setDeleteStatus] = useState<{ id: string | null; loading: boolean }>({ id: null, loading: false });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users || []);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (userId: string, userEmail: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${userEmail}?`)) return;

    setDeleteStatus({ id: userId, loading: true });
    try {
      // Nota: No Supabase, deletar da public.users geralmente exige permissão
      // ou um trigger que delete do auth.users. 
      // Em ambiente local sem triggers complexos, deletamos do public.users primeiro.
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: userId })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      alert('Erro ao excluir usuário: ' + err.message);
    } finally {
      setDeleteStatus({ id: null, loading: false });
    }
  };

  const filteredUsers = users.filter(user => 
    (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4">
      {/* Header Brutalista */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="space-y-4">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-blue-600 transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Voltar ao Dashboard
          </Link>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter font-space italic uppercase leading-none">
            Gestão de <span className="text-blue-600">Usuários</span>
          </h1>
          <p className="text-slate-500 font-medium text-lg max-w-xl">
            Administre perfis, permissões e acessos da plataforma (Super Admin oculto).
          </p>
        </div>

        <Link 
          href="/admin/users/create"
          className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-5 rounded-3xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-blue-500/20 uppercase tracking-widest text-xs"
        >
          <UserPlus size={20} />
          Novo Usuário
        </Link>
      </header>

      {/* Busca e Tabela */}
      <section className="bg-white border border-slate-100 rounded-[3rem] shadow-3xl shadow-slate-200/50 overflow-hidden ring-1 ring-slate-50">
        <div className="p-8 border-b border-slate-50 flex items-center gap-4 bg-slate-50/30">
          <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 pl-14 pr-6 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Usuário</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Função</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode='popLayout'>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-blue-600" size={40} />
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Carregando usuários...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <AlertCircle className="text-slate-200" size={48} />
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Nenhum usuário encontrado.</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.map((user) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    key={user.id} 
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-slate-400 text-lg uppercase group-hover:from-blue-50 group-hover:to-blue-100 group-hover:text-blue-600 transition-all duration-500">
                          {user.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{user.full_name || 'Usuário sem nome'}</p>
                          <p className="text-xs font-medium text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                        isAdmin(user.role)
                          ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200" 
                          : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
                      )}>
                        {isAdmin(user.role) ? <ShieldCheck size={14} /> : <Shield size={14} />}
                        {roleLabel(user.role)}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`/admin/users/edit/${user.id}`}
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                          title="Editar Usuário"
                        >
                          <Edit3 size={18} />
                        </Link>
                        <button 
                          onClick={() => handleDelete(user.id, user.email)}
                          disabled={deleteStatus.id === user.id && deleteStatus.loading}
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-red-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                          title="Excluir Usuário"
                        >
                          {deleteStatus.id === user.id && deleteStatus.loading ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
