import React from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  itemName,
  confirmLabel = 'Excluir',
  cancelLabel = 'Cancelar',
  isDangerous = true,
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#121215] border border-white/[0.12] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/[0.06] transition disabled:opacity-50"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isDangerous
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
            }`}
          >
            {isDangerous ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-snug">{title}</h3>
            {itemName && (
              <p className="text-sm font-semibold text-sky-400 mt-1 break-words font-mono">
                {itemName}
              </p>
            )}
          </div>
        </div>

        {/* Message body */}
        <p className="text-xs text-slate-300 leading-relaxed pl-1">{message}</p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] border border-white/[0.08] transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white transition shadow-sm disabled:opacity-50 ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-500 border border-rose-400/40 shadow-rose-900/30'
                : 'bg-amber-600 hover:bg-amber-500 border border-amber-400/40'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                {isDangerous && <Trash2 className="w-3.5 h-3.5" />}
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
