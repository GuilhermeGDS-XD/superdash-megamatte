'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/client';
import { 
  ArrowLeft, 
  UserPlus, 
  Loader2, 
  User, 
  Mail, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  Files
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/hooks/useUser';
import { isSuperAdmin } from '@/lib/roles';

export default function CreateUserPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user: currentUserProfile } = useUser();
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'MANAGER' as 'ADMIN' | 'MANAGER',
    password: '',
    confirmPassword: '',
    can_view_logs: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: null, message: '' });

    // 1. Validar Senhas
    if (formData.password !== formData.confirmPassword) {
      setStatus({ type: 'error', message: 'As senhas não coincidem.' });
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setStatus({ type: 'error', message: 'A senha deve ter pelo menos 6 caracteres.' });
      setLoading(false);
      return;
    }

    try {
      // 1. Criar o usuário no Supabase Auth usando as credenciais fornecidas
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário na autenticação.');

      const newUserId = authData.user.id;

      // 2. Inserir na tabela public.users (com o ID gerado pelo Auth)
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: newUserId,
          full_name: formData.name,
          email: formData.email,
          role: formData.role,
          can_view_logs: formData.role === 'ADMIN' ? formData.can_view_logs : false 
        });

      if (insertError) throw insertError;

      // 3. Log da ação
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      await supabase.from('logs').insert({
        user_id: currentUser?.id,
        action: 'USER_CREATE',
        metadata: { 
          new_user_id: newUserId,
          new_user_email: formData.email,
          new_user_role: formData.role,
          new_user_name: formData.name
        }
      });

      setStatus({ type: 'success', message: 'Usuário criado com sucesso!' });
      setTimeout(() => router.push('/'), 2000);

    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Erro ao criar usuário.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <header className="flex items-center gap-6">
        <Link 
          href="/" 
          className="h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm group"
        >
          <ArrowLeft className="text-slate-600 group-hover:-translate-x-1 transition-transform" />
        </Link>
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter font-space italic uppercase">
            Novo <span className="text-blue-600">Usuário</span>
          </h1>
          <p className="text-slate-500 font-medium tracking-tight mt-1">Defina o perfil de acesso e permissões</p>
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
                  placeholder="Nome do usuário"
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-5 pl-16 pr-6 font-bold text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 pl-2">E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={22} />
                <input 
                  required
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="email@exemplo.com"
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-5 pl-16 pr-6 font-bold text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Senha */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 pl-2">Senha de Acesso</label>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={22} />
                <input 
                  required
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-5 pl-16 pr-14 font-bold text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirmação */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 pl-2">Confirmar Senha</label>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={22} />
                <input 
                  required
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-5 pl-16 pr-6 font-bold text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 pl-2">Nível de Acesso</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: 'MANAGER', label: 'Gestor', desc: 'Apenas suas campanhas' },
                { id: 'ADMIN', label: 'Administrador', desc: 'Gerencia tudo (exceto Master)' },
              ].map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setFormData({...formData, role: role.id as any})}
                  className={cn(
                    "p-6 rounded-[2rem] border-2 transition-all text-left relative overflow-hidden group",
                    formData.role === role.id 
                      ? "border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-500/10" 
                      : "border-slate-100 hover:border-slate-200 bg-white"
                  )}
                >
                  <div className={cn(
                    "h-10 w-10 rounded-xl mb-4 flex items-center justify-center transition-all",
                    formData.role === role.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                  )}>
                    <ShieldCheck size={20} strokeWidth={3} />
                  </div>
                  <p className={cn(
                    "font-black uppercase italic tracking-tighter text-lg leading-none mb-1",
                    formData.role === role.id ? "text-blue-700" : "text-slate-800"
                  )}>{role.label}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{role.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Permissão de Logs (Apenas para Super Admin e quando Role é ADMIN) */}
          {isSuperAdmin(currentUserProfile?.role) && formData.role === 'ADMIN' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Files size={80} className="text-white" />
              </div>
              
              <div className="relative z-10 flex items-center justify-between gap-6">
                <div className="flex-1">
                  <h4 className="text-xl font-black text-white italic uppercase tracking-tighter mb-1">Acesso aos Logs</h4>
                  <p className="text-slate-400 text-xs font-medium tracking-tight">
                    Permite que este Administrador visualize a trilha de auditoria completa do sistema.
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

          {/* Feedback */}
          {status.type && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-6 rounded-3xl flex items-center gap-4 border-2 shadow-sm",
                status.type === 'success' ? "bg-green-50 border-green-100 text-green-700" : "bg-rose-50 border-rose-100 text-rose-700"
              )}
            >
              {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              <span className="font-black uppercase italic tracking-tighter">{status.message}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black py-6 rounded-[2rem] text-xl transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3 uppercase italic tracking-tighter disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <UserPlus />}
            {loading ? 'Processando...' : 'Finalizar Cadastro'}
          </button>
        </form>
      </div>
    </div>
  );
}
