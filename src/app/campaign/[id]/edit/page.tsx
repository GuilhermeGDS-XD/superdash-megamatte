'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/client';
import { 
  ChevronLeft, 
  Save, 
  CheckCircle2,
  AlertCircle,
  Trash2,
  Type
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';
import { useEcompayProducts } from '@/hooks/useEcompayProducts';
import { EcompayProductSelect } from '@/components/ui/EcompayProductSelect';
import { useSpotterFunnels } from '@/hooks/useSpotter';
import { SpotterListSelect } from '@/components/ui/SpotterListSelect';

// Ícones SVG customizados para Google e Meta
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 -13 256 256" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid">
    <path d="M5.888,166.405103 L90.88,20.9 C101.676138,27.2558621 156.115862,57.3844138 164.908138,63.1135172 L79.9161379,208.627448 C70.6206897,220.906621 -5.888,185.040138 5.888,166.396276 L5.888,166.405103 Z" fill="#FBBC04" />
    <path d="M250.084224,166.401789 L165.092224,20.9055131 C153.210293,1.13172 127.619121,-6.05393517 106.600638,5.62496138 C85.582155,17.3038579 79.182155,42.4624786 91.0640861,63.1190303 L176.056086,208.632961 C187.938017,228.397927 213.52919,235.583582 234.547672,223.904686 C254.648086,212.225789 261.966155,186.175582 250.084224,166.419444 L250.084224,166.401789 Z" fill="#4285F4" />
    <ellipse fill="#34A853" cx="42.6637241" cy="187.924414" rx="42.6637241" ry="41.6044138" />
  </svg>
);

const MetaIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.06925,5.00237 C6.47461,4.89183 5.20472,5.81816 4.31715,6.9809 C3.42438,8.15046 2.79487,9.7015 2.44783,11.2489 C2.10089,12.7959 2.01419,14.4379 2.29341,15.813 C2.56477,17.1493 3.25726,18.5227 4.71368,18.9581 C6.10192,19.3731 7.34848,18.783 8.30022,17.9824 C9.25406,17.18 10.0806,16.0364 10.7459,14.9309 C11.2678,14.0637 11.7139,13.1803 12.0636,12.4265 C12.4134,13.1803 12.8595,14.0637 13.3814,14.9309 C14.0467,16.0364 14.8732,17.18 15.8271,17.9824 C16.7788,18.783 18.0254,19.3731 19.4136,18.9581 C20.87,18.5227 21.5625,17.1493 21.8339,15.813 C22.1131,14.4379 22.0264,12.7959 21.6795,11.2489 C21.3324,9.7015 20.7029,8.15046 19.8101,6.9809 C18.9226,5.81816 17.6527,4.89183 16.058,5.00237 C14.3243,5.12255 13.0879,6.47059 12.3715,7.49 C12.2613,7.64685 12.1586,7.80273 12.0636,7.95456 C11.9687,7.80273 11.866,7.64685 11.7558,7.49 C11.0394,6.47059 9.803,5.12255 8.06925,5.00237 Z M10.9193,10.0265 C10.6371,10.7417 9.95004,12.3747 9.03232,13.8996 C8.41066,14.9325 7.71866,15.8581 7.01275,16.4519 C6.30475,17.0474 5.7503,17.1805 5.28652,17.0419 C4.89094,16.9236 4.46993,16.4812 4.25341,15.415 C4.04476,14.3875 4.0958,13.0402 4.39936,11.6866 C4.70282,10.3335 5.23656,9.07262 5.90692,8.19443 C6.58247,7.30944 7.27559,6.95216 7.93095,6.99758 C8.69718,7.0507 9.46077,7.70266 10.1194,8.63992 C10.487,9.16295 10.7616,9.6916 10.9193,10.0265 Z M13.208,10.0265 C13.4902,10.7417 14.1773,12.3747 15.095,13.8996 C15.7166,14.9325 16.4086,15.8581 17.1145,16.4519 C17.8226,17.0474 18.377,17.1805 18.8408,17.0419 C19.2364,16.9236 19.6574,16.4812 19.8739,15.415 C20.0825,14.3875 20.0315,13.0402 19.7279,11.6866 C19.4245,10.3335 18.8907,9.07262 18.2204,8.19443 C17.5448,7.30944 16.8517,6.95216 16.1963,6.99758 C15.4301,7.0507 14.6665,7.70266 14.0079,8.63992 C13.6403,9.16295 13.3657,9.6916 13.208,10.0265 Z" fill="currentColor" fillRule="evenodd" />
  </svg>
);

export default function EditCampaignPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    platforms: [] as string[],
    google_id: '',
    meta_id: '',
    google_start: '',
    meta_start: '',
    ecompay_product_id: '',
    spotter_list_id: ''
  });
  
  const { products: ecompayProducts, loading: ecompayLoading } = useEcompayProducts();
  const { funnels: spotterFunnels, loading: spotterLoading } = useSpotterFunnels();

  const supabase = createClient();

  useEffect(() => {
    async function loadCampaign() {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (data) {
        setFormData({
          name: data.name,
          platforms: data.platforms || [],
          google_id: data.google_campaign_id || '',
          meta_id: data.meta_campaign_id || '',
          google_start: data.google_start_date || '',
          meta_start: data.meta_start_date || '',
          ecompay_product_id: data.ecompay_product_id || '',
          spotter_list_id: data.spotter_list_id || ''
        });
      } else if (error) {
        setStatus({ type: 'error', message: 'Erro ao carregar campanha.' });
      }
      setInitialLoading(false);
    }
    if (id) loadCampaign();
  }, [id, supabase]);

  const togglePlatform = (p: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p) 
        ? prev.platforms.filter(x => x !== p) 
        : [...prev.platforms, p]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.platforms.length === 0) {
      setStatus({ type: 'error', message: 'Selecione ao menos uma plataforma.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          name: formData.name,
          platforms: formData.platforms,
          google_campaign_id: formData.platforms.includes('GOOGLE_ADS') ? formData.google_id : null,
          meta_campaign_id: formData.platforms.includes('META_ADS') ? formData.meta_id : null,
          google_start_date: formData.platforms.includes('GOOGLE_ADS') ? (formData.google_start || null) : null,
          meta_start_date: formData.platforms.includes('META_ADS') ? (formData.meta_start || null) : null,
          ecompay_product_id: formData.ecompay_product_id || null,
          spotter_list_id: formData.spotter_list_id || null,
        })
        .eq('id', id);

      if (error) throw error;

      // Registrar Log
      await supabase.from('logs').insert({
        user_id: user?.id,
        action: 'UPDATE_CAMPAIGN',
        metadata: { campaign_id: id, campaign_name: formData.name }
      });

      setStatus({ type: 'success', message: 'Campanha atualizada com sucesso!' });
      setTimeout(() => router.push(`/campaign/${id}`), 2000);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Erro ao atualizar campanha.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta campanha? Esta ação é irreversível.')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;

      await supabase.from('logs').insert({
        user_id: user?.id,
        action: 'DELETE_CAMPAIGN',
        metadata: { campaign_id: id, campaign_name: formData.name }
      });

      router.push('/');
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Erro ao excluir campanha.' });
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/')}
            className="h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm group"
          >
            <ChevronLeft className="text-slate-600 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-4xl font-black text-slate-900 font-space italic uppercase">Editar <span className="text-blue-600">Campanha</span></h1>
            <p className="text-slate-500 font-medium tracking-tight mt-1">Atualize as configurações da campanha selecionada</p>
          </div>
        </div>

        <button 
          onClick={handleDelete}
          className="h-14 px-6 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center gap-2 hover:bg-rose-100 transition-all font-black uppercase text-[10px] tracking-widest"
        >
          <Trash2 size={18} />
          Excluir
        </button>
      </header>

      <div className="bg-white border border-slate-100 rounded-[3rem] p-12 shadow-3xl shadow-slate-200/50 relative overflow-visible ring-1 ring-slate-50">
        <form onSubmit={handleSubmit} className="space-y-12 relative z-10">
          
          {/* Nome da Campanha */}
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 pl-2">Identificação Principal</label>
            <div className="relative group">
              <Type className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={24} />
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Lançamento Coleção Outono/Inverno"
                className="w-full bg-slate-50/50 border-2 border-slate-50 rounded-[2rem] py-6 pl-16 pr-8 text-xl font-bold focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-200"
              />
            </div>
          </div>

          {/* Seleção de Plataformas */}
          <div className="space-y-6">
            <label className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 pl-2">Plataformas Ativas</label>
            <div className="grid grid-cols-1 gap-6">
              {/* Google Ads temporariamente oculto */}
              <PlatformToggle 
                active={formData.platforms.includes('META_ADS')} 
                onClick={() => togglePlatform('META_ADS')}
                icon={<MetaIcon className="w-8 h-8" />}
                label="Meta Ads"
                color="blue"
              />
            </div>
          </div>

          {/* Campos Condicionais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Google Ads Config temporariamente oculto */}
            {false && formData.platforms.includes('GOOGLE_ADS') && (
              <div className="space-y-6 p-8 bg-yellow-50 border border-yellow-200 rounded-[2.5rem] animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-3 mb-2">
                   <div className="h-8 w-8 bg-yellow-400 rounded-lg flex items-center justify-center text-white shadow-lg shadow-yellow-400/20 p-1.5">
                      <GoogleIcon className="w-full h-full filter brightness-0 invert" />
                   </div>
                   <h3 className="font-black text-yellow-700 uppercase italic tracking-tighter text-sm">Configuração Google</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-yellow-600/60 pl-2">Campaign ID</label>
                    <input 
                      required
                      type="text" 
                      value={formData.google_id}
                      onChange={e => setFormData({...formData, google_id: e.target.value})}
                      className="w-full bg-white border border-yellow-100 rounded-2xl py-4 px-6 font-bold text-yellow-900 focus:ring-4 focus:ring-yellow-400/10 transition-all outline-none"
                      placeholder="Ex: 123456789"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-yellow-600/60 pl-2">Data Inicial</label>
                    <input 
                      type="date" 
                      value={formData.google_start}
                      onChange={e => setFormData({...formData, google_start: e.target.value})}
                      className="w-full bg-white border border-yellow-100 rounded-2xl py-4 px-6 font-bold text-yellow-900 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Meta Ads Config */}
            {formData.platforms.includes('META_ADS') && (
              <div className="space-y-6 p-8 bg-blue-50 border border-blue-200 rounded-[2.5rem] animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-3 mb-2">
                   <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-400/20 p-1.5">
                      <MetaIcon className="w-full h-full filter brightness-0 invert" />
                   </div>
                   <h3 className="font-black text-blue-700 uppercase italic tracking-tighter text-sm">Configuração Meta</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-600/60 pl-2">Campaign ID</label>
                    <input 
                      required
                      type="text" 
                      value={formData.meta_id}
                      onChange={e => setFormData({...formData, meta_id: e.target.value})}
                      className="w-full bg-white border border-blue-100 rounded-2xl py-4 px-6 font-bold text-blue-900 focus:ring-4 focus:ring-blue-400/10 transition-all outline-none"
                      placeholder="Ex: act_123456"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-600/60 pl-2">Data Inicial</label>
                    <input 
                      type="date" 
                      value={formData.meta_start}
                      onChange={e => setFormData({...formData, meta_start: e.target.value})}
                      className="w-full bg-white border border-blue-100 rounded-2xl py-4 px-6 font-bold text-blue-900 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Produto Ecompay (Opcional) */}
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 pl-2">Produto Ecompay (Opcional)</label>
            <EcompayProductSelect
              value={formData.ecompay_product_id}
              onChange={(id) => setFormData({...formData, ecompay_product_id: id})}
              products={ecompayProducts}
              loading={ecompayLoading}
            />
          </div>

          {/* Lista Exact Spotter (Opcional) */}
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 pl-2">Lista Exact Spotter (Opcional)</label>
            <SpotterListSelect
              value={formData.spotter_list_id}
              onChange={(id) => setFormData({...formData, spotter_list_id: id})}
              funnels={spotterFunnels}
              loading={spotterLoading}
            />
            <p className="text-xs text-slate-400 pl-2">
              Vincula os leads do Exact Spotter a esta campanha na tela Comercial.
            </p>
          </div>

          {status && (
            <div className={cn(
               "p-6 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top-2",
               status.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
            )}>
               {status.type === 'success' ? <CheckCircle2 /> : <AlertCircle />}
               <p className="font-bold text-sm tracking-tight">{status.message}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] flex items-center justify-center gap-4 transition-all hover:bg-black active:scale-[0.98] shadow-2xl hover:shadow-slate-300 disabled:opacity-50 uppercase tracking-[0.3em] text-sm group"
          >
            {loading ? 'Processando...' : (
              <>
                Salvar Alterações
                <Save className="group-hover:translate-x-1 transition-transform" size={20} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function PlatformToggle({ active, onClick, icon, label, color }: any) {
  const activeClasses = color === 'yellow' 
    ? "border-yellow-400 bg-yellow-400 text-slate-900 shadow-2xl shadow-yellow-400/30" 
    : "border-blue-600 bg-blue-600 text-white shadow-2xl shadow-blue-500/30";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between p-8 rounded-[2.5rem] border-2 transition-all duration-300 group relative overflow-hidden",
        active 
          ? activeClasses 
          : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
      )}
    >
      <div className="flex items-center gap-5 relative z-10">
        <div className={cn(
          "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors overflow-hidden p-2",
          active ? "bg-white text-slate-900" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
        )}>
          {icon}
        </div>
        <span className="text-lg font-black italic uppercase tracking-tighter">{label}</span>
      </div>
      <div className={cn(
        "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all relative z-10",
        active ? "bg-white border-white scale-110" : "border-slate-200"
      )}>
        {active && <CheckCircle2 className={color === 'yellow' ? "text-yellow-400" : "text-blue-600"} size={14} strokeWidth={4} />}
      </div>
      {active && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 animate-in slide-in-from-left duration-[2000ms]"></div>
      )}
    </button>
  );
}
