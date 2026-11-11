import React, { useState } from 'react';
import { Lock, ShieldCheck, X, KeyRound, AlertCircle, Loader2 } from 'lucide-react';
import { verifyAdminPassword } from '../services/adminAuth';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({ isOpen, onClose, onAuthenticated }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    // La clave se valida en la Edge Function de Supabase: nunca se compara
    // contra un valor incrustado en el navegador.
    const result = await verifyAdminPassword(password);

    setLoading(false);

    if (result.ok) {
      setPassword('');
      onAuthenticated();
      onClose();
    } else {
      setError(result.message ?? 'No se pudo verificar la clave. Inténtalo de nuevo.');
    }
  };

  const handleClose = () => {
    if (loading) return;
    setError(null);
    setPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0f0f0f] border border-[#C9A84C]/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-[#C9A84C]/20 text-stone-100">
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C9A84C]/20 to-[#A07830]/10 border border-[#C9A84C]/40 flex items-center justify-center mx-auto text-[#F0D080] shadow-lg shadow-[#C9A84C]/10">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold font-serif-luxury text-stone-100">
            Acceso Administrador Fraganza
          </h3>
          <p className="text-xs text-stone-400 max-w-xs mx-auto leading-relaxed">
            Área protegida para <strong className="text-[#F0D080]">cambiar las fotos reales</strong> de los perfumes, modificar sus notas olfativas y sincronizar con Supabase.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#F0D080] uppercase tracking-wider mb-2">
              Clave de Administrador
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Ingresa la clave de administrador"
                autoFocus
                disabled={loading}
                autoComplete="current-password"
                className="w-full bg-[#141414] border border-stone-800 rounded-xl pl-10 pr-4 py-3 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-all disabled:opacity-60"
              />
            </div>
            {error && (
              <div className="flex items-start gap-1.5 mt-2 text-rose-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 py-3 rounded-xl border border-stone-800 text-stone-300 text-xs font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#F0D080] text-stone-950 text-xs font-bold shadow-lg shadow-[#C9A84C]/25 hover:brightness-110 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando…</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Desbloquear</span>
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-[10px] text-stone-500 text-center mt-6">
          Fraganza Security · La clave se valida en el servidor y nunca se envía al navegador
        </p>
      </div>
    </div>
  );
};
