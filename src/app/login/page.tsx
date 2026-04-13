// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/client';
import { useRouter } from 'next/navigation';
import { BarChart3, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('Login detailed error:', signInError);
      setError(`Erro: ${signInError.message}`);
      setLoading(false);
    } else {
      console.log('Login success data:', data);
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a] p-4 font-sans selection:bg-blue-500 selection:text-white">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-12">
          <div className="h-20 w-20 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/20 rotate-12 hover:rotate-0 transition-transform duration-500">
            <BarChart3 className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter font-space">
            Super<span className="text-blue-500">Dash</span>
          </h1>
          <p className="text-slate-500 mt-2 font-black uppercase tracking-[0.3em] text-[10px]">Portal de Gestão de Mídia</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-3xl shadow-black ring-1 ring-white/10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-2">Seu E-mail Corporativo</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                  placeholder="admin@empresa.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-2">Senha de Acesso</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold text-center uppercase tracking-widest">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-blue-500/30 uppercase tracking-[0.2em] text-xs disabled:opacity-50"
            >
              {loading ? 'Validando...' : (
                <>
                  Entrar no Dashboard 
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 mt-10 text-[10px] font-bold uppercase tracking-widest">
          Acesso Restrito a Colaboradores Autorizados
        </p>
      </div>
    </div>
  );
}
