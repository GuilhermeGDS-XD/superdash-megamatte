'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  User, 
  Mail, 
  Shield, 
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Files
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { isSuperAdmin, normalizeRole, roleLabel } from '@/lib/roles';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { user: currentUserProfile } = useUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'MANAGER',
    password: '',
    can_view_logs: false
  });

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`/api/admin/users/${userId}`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setFormData({
          name: data.user.full_name || '',
          email: data.user.email || '',
          role: normalizeRole(data.user.role),
          password: '',
          can_view_logs: data.user.can_view_logs || false
        });
      } catch (err: any) {
        setError('Usuário não encontrado ou erro na conexão.');
      } finally {
        setLoading(false);
      }
    }
    if (userId) fetchUser();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          password: formData.password,
          can_view_logs: formData.can_view_logs
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(true);
      setTimeout(() => router.push('/admin/users/list'), 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar usuário.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-sm font-black uppercase tracking-widest text-slate-400 font-space italic">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 px-4">
      <header className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
        <Link 
          href="/admin/users/list" 
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-blue-600 transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          Voltar para Lista
        </Link>
        <h1 className="text-6xl font-black text-slate-900 tracking-tighter font-space italic uppercase leading-none">
          Editar <span className="text-blue-600">Usuário</span>
        </h1>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 space-y-6">
            <div className="space-y-4">
               <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4 mb-2 block">Nome Completo</label>
                <div className="relative group">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 pl-14 pr-6 font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4 mb-2 block">E-mail (Apenas Leitura)</label>
                <div className="relative group opacity-60">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input 
                    type="email" 
                    readOnly
                    value={formData.email}
                    className="w-full bg-slate-100 border-2 border-transparent rounded-2xl py-4 pl-14 pr-6 font-bold text-slate-400 cursor-not-allowed outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4 mb-2 block">Nova Senha (Opcional)</label>
                <div className="relative group">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Deixe em branco para manter a atual"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 pl-14 pr-14 font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4 mb-4 block">Função no Sistema</label>
              <div className="grid grid-cols-2 gap-4">
                {(['MANAGER', 'ADMIN'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFormData({...formData, role})}
                    className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                      formData.role === role 
                        ? 'border-blue-600 bg-blue-50/50 text-blue-600' 
                        : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    <Shield size={24} className={formData.role === role ? 'text-blue-600' : 'text-slate-300'} />
                    <span className="font-black uppercase tracking-widest text-[10px]">{roleLabel(role)}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Permissão de Logs (Apenas para Super Admin e quando Role é Admin) */}
            {isSuperAdmin(currentUserProfile?.role) && formData.role === 'ADMIN' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden mt-8"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Files size={80} className="text-white" />
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <h4 className="text-xl font-black text-white italic uppercase tracking-tighter mb-1">Acesso aos Logs</h4>
                    <p className="text-slate-400 text-xs font-medium tracking-tight">
                      Permitir que este administrador visualize a trilha de auditoria.
                    </p>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={formData.can_view_logs}
                      onChange={(e) => setFormData({...formData, can_view_logs: e.target.checked})}
                    />
                    <div className="w-16 h-8 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-7 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                  </label>
                </div>
              </motion.div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl sticky top-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 px-2">Ações</h4>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 mb-6 animate-in fade-in zoom-in-95 duration-300">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold leading-relaxed">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl flex items-start gap-3 mb-6 animate-in fade-in zoom-in-95 duration-300">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold leading-relaxed">Perfil atualizado com sucesso! Redirecionando...</p>
              </div>
            )}

            <button 
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-blue-500/20 uppercase tracking-widest text-[10px]"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Salvar Alterações
            </button>

            <Link 
              href="/admin/users/list"
              className="w-full mt-3 bg-slate-50 hover:bg-slate-100 text-slate-400 font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all uppercase tracking-widest text-[10px]"
            >
              Cancelar
            </Link>
          </div>
        </aside>
      </form>
    </div>
  );
}
