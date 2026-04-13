'use client';

import { useState, useEffect, useRef } from 'react';

interface MetaConnectModalProps {
  open: boolean;
  onClose: () => void;
  onConnecting?: (isConnecting: boolean) => void;
}

/**
 * Componente: MetaConnectModal
 * 
 * Modal para conectar conta Meta
 * Abre popup com login Meta quando usuário clica
 */
export function MetaConnectModal({
  open,
  onClose,
  onConnecting,
}: MetaConnectModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ouve mensagem de sucesso do popup (postMessage)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'META_CONNECTED' && event.data?.success) {
        console.log('✅ META_CONNECTED recebido! Recarregando...');
        clearInterval(intervalRef.current!);
        popupRef.current?.close();
        setLoading(false);
        onConnecting?.(false);
        onClose();
        window.location.reload();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClose, onConnecting]);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    onConnecting?.(true);

    console.log('🔗 Iniciando fluxo de conexão Meta...');

    try {
      // Abre popup com login Meta
      const width = 500;
      const height = 700;
      const left = typeof window !== 'undefined' ? (window.innerWidth - width) / 2 : 0;
      const top = typeof window !== 'undefined' ? (window.innerHeight - height) / 2 : 0;

      console.log('📱 Abrindo popup:', {
        url: '/api/auth/meta/connect',
        width,
        height,
        left,
        top,
      });

      const popup = window.open(
        '/api/auth/meta/connect',
        'MetaLogin',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      console.log('✅ Popup object:', popup ? 'CREATED' : 'BLOCKED/NULL');

      if (!popup) {
        console.error('❌ Popup bloqueado! Bloqueador de popups ativado?');
        setError('Bloqueador de pop-ups ativado. Desative para continuar.');
        setLoading(false);
        onConnecting?.(false);
        return;
      }

      popupRef.current = popup;

      console.log('👁️ Monitorando popup...');
      // Monitora se o popup foi fechado sem completar o fluxo
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          console.log('ℹ️ Popup fechado manualmente (sem META_CONNECTED)');
          clearInterval(checkPopup);
          intervalRef.current = null;
          setLoading(false);
          onConnecting?.(false);
        }
      }, 500);
      intervalRef.current = checkPopup;
    } catch (err) {
      console.error('❌ Erro ao abrir popup:', err);
      setError('Erro ao abrir popup de login');
      setLoading(false);
      onConnecting?.(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl shadow-black/40 max-w-md w-full p-8 relative overflow-hidden">
        {/* Glow decorativo */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
              <img src="/meta-svgrepo-com.svg" className="w-6 h-6" alt="Meta" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wide">Conectar Meta</h2>
              <p className="text-slate-500 text-xs font-medium mt-0.5">Autorize o acesso à sua conta</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="h-8 w-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="relative mb-8 space-y-4">
          <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-blue-400 text-sm">🔒</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-300">Conexão segura</p>
                <p className="text-xs text-slate-500 mt-1">Seus tokens são criptografados e armazenados com segurança. Sincronize campanhas e métricas automaticamente.</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-red-400 text-sm mt-0.5">⚠️</span>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-2xl hover:bg-slate-700 transition-all font-bold text-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="flex-1 px-4 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Conectando...
              </>
            ) : (
              <>
                <img src="/meta-svgrepo-com.svg" className="w-4 h-4" alt="Meta" />
                Conectar com Meta
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
