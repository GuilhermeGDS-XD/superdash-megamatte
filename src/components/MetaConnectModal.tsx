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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Conectar Meta</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Autorize o acesso à sua conta Meta Business para sincronizar campanhas automaticamente.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 text-lg">ℹ️</div>
              <div className="text-sm text-blue-700">
                <strong>Informações seguras:</strong> Seus tokens são criptografados e armazenados com segurança.
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="text-red-600 text-lg">⚠️</div>
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Conectando...
              </>
            ) : (
              <>
                <span>🔗</span>
                Conectar com Meta
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
