'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/client';
import { 
  User, 
  Mail, 
  Shield, 
  ArrowLeft, 
  Save, 
  Loader2, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';

export default function ProfilePage() {
  const router = useRouter();
  const { user, refreshUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || ''
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: null, message: '' });
    const supabase = createClient();

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Usuário não autenticado.');

      // 1. Atualizar na tabela public.users
      const { error: updateError } = await supabase
        .from('users')
        .update({ name: formData.name })
        .eq('id', authUser.id);

      if (updateError) throw updateError;

      // 2. Registrar Log
      await supabase.from('logs').insert({
        user_id: authUser.id,
        action: 'PROFILE_UPDATE',
        metadata: { old_name: user?.name, new_name: formData.name }
      });

      setStatus({ type: 'success', message: 'Perfil atualizado com sucesso!' });
      
      // Atualizar o contexto do usuário
      if (refreshUser) await refreshUser();

    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Erro ao atualizar perfil.' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 px-4">
      {/* Header Brutalista */}
      <header className="flex items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
        <Link 
          href="/" 
          className="h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm group"
        >
          <ArrowLeft className="text-slate-600 group-hover:-translate-x-1 transition-transform" />
        </Link>
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter font-space italic uppercase">
            Meu <span className="text-blue-600">Perfil</span>
          </h1>
          <p className="text-slate-500 font-medium tracking-tight mt-1">Gerencie suas informações de acesso</p>
        </div>
      </header>

      <div className="bg-white border border-slate-100 rounded-[3rem] p-12 shadow-3xl shadow-slate-200/50 relative overflow-hidden">
        <form onSubmit={handleSubmit} className="space-y-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Nome */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 pl-2">Nome Completo</label>
              <div className="relative group">
                <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={22} />
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-5 pl-16 pr-6 font-bold text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Email (Desabilitado por segurança no Supabase local direto) */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 pl-2">E-mail</label>
              <div className="relative group opacity-60">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={22} />
                <input 
                  disabled
                  type="email" 
                  value={formData.email}
                  className="w-full bg-slate-100 border-2 border-slate-100 rounded-2xl py-5 pl-16 pr-6 font-bold text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Role (Somente Visualização) */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 pl-2">Nível de Acesso</label>
            <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Shield size={24} />
              </div>
              <div>
                <p className="font-black text-slate-900 uppercase tracking-widest text-sm">{formData.role}</p>
                <p className="text-xs font-medium text-slate-500 italic">As permissões são gerenciadas por um Super Admin.</p>
              </div>
            </div>
          </div>

          {/* Feedback de Status */}
          {status.type && (
            <div className={cn(
              "flex items-center gap-4 p-6 rounded-2xl animate-in zoom-in-95 duration-300",
              status.type === 'success' ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-red-50 text-red-800 border border-red-100"
            )}>
              {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              <span className="font-bold text-sm uppercase tracking-wider">{status.message}</span>
            </div>
          )}

          <div className="pt-6 border-t border-slate-50">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-6 rounded-[2rem] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-blue-500/30 uppercase tracking-[0.3em] text-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
