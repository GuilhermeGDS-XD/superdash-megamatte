'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, ListTree, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpotterFunnel {
  id: number;
  value: string;
  active: boolean;
}

interface Props {
  value: string;
  onChange: (id: string) => void;
  funnels: SpotterFunnel[];
  loading: boolean;
}

export function SpotterListSelect({ value, onChange, funnels, loading }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = funnels.find((f) => String(f.id) === value);

  const visible = funnels.filter((f) => showInactive || f.active);
  const filtered = visible.filter((f) =>
    f.value.toLowerCase().includes(search.toLowerCase())
  );

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Foca na busca ao abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelect = (funnel: SpotterFunnel) => {
    onChange(String(funnel.id));
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !loading && setOpen((prev) => !prev)}
        disabled={loading}
        className={cn(
          'w-full flex items-center justify-between gap-3 bg-slate-50/50 border-2 rounded-[2rem] py-5 px-8 text-left transition-all',
          open
            ? 'border-indigo-500 bg-white shadow-lg shadow-indigo-500/10'
            : 'border-slate-100 hover:border-slate-200',
          loading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
            selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
          )}>
            {loading
              ? <Loader2 size={16} className="animate-spin" />
              : <ListTree size={16} />
            }
          </div>
          <div className="min-w-0">
            {selected ? (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-indigo-500 leading-none mb-0.5">Funil selecionado</p>
                <p className="text-sm font-bold text-slate-900 truncate">{selected.value}</p>
              </>
            ) : (
              <p className="text-base font-bold text-slate-400">
                {loading ? 'Carregando funis...' : `Selecionar funil${funnels.length > 0 ? ` (${funnels.filter(f => f.active).length} ativos)` : '...'}`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selected && (
            <div
              onClick={handleClear}
              className="h-7 w-7 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-500 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X size={13} strokeWidth={3} />
            </div>
          )}
          <ChevronDown
            size={18}
            className={cn('text-slate-400 transition-transform duration-200', open && 'rotate-180')}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-[1.5rem] border-2 border-slate-100 shadow-2xl shadow-slate-200/70 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col max-h-[360px]">
          {/* Campo de busca */}
          <div className="p-4 shrink-0 border-b border-slate-50">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar funil..."
                className="w-full bg-slate-50 rounded-xl py-3 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 pl-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {filtered.length} funil{filtered.length !== 1 ? 'is' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
              </p>
              <button
                type="button"
                onClick={() => setShowInactive((v) => !v)}
                className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-600 transition-colors"
              >
                {showInactive ? 'Ocultar inativos' : 'Mostrar inativos'}
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="overflow-y-auto flex-1 py-2">
            {/* Opção de limpar */}
            {value && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-red-50 text-red-500 transition-colors"
              >
                <div className="h-7 w-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <X size={13} />
                </div>
                <span className="text-sm font-bold">Remover seleção</span>
              </button>
            )}

            {filtered.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Search size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-400">Nenhum funil encontrado</p>
                <p className="text-xs text-slate-300 mt-1">Tente outros termos de busca</p>
              </div>
            ) : (
              filtered.map((funnel) => {
                const isSelected = String(funnel.id) === value;
                return (
                  <button
                    key={funnel.id}
                    type="button"
                    onClick={() => handleSelect(funnel)}
                    className={cn(
                      'w-full flex items-center gap-3 px-5 py-3 text-left transition-colors',
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <div className={cn(
                      'h-7 w-7 rounded-lg flex items-center justify-center shrink-0',
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                    )}>
                      {isSelected ? <Check size={13} strokeWidth={3} /> : <ListTree size={13} />}
                    </div>
                    <span className={cn(
                      'text-sm font-semibold truncate flex-1',
                      isSelected && 'font-bold'
                    )}>
                      {funnel.value}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {!funnel.active && (
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">
                          Inativo
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                          Selecionado
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
