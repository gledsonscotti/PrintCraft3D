import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  User,
  Check,
  AlertCircle,
  CheckCircle2,
  Lock,
  Palette,
  Sun,
  Moon,
  Leaf,
  Sparkles
} from 'lucide-react';
import { AdminUser, AppTheme } from '../../types';

interface AdminSettingsTabProps {
  currentUser: AdminUser | null;
  currentTheme?: AppTheme;
  onChangeTheme?: (theme: AppTheme) => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  currentUser,
  currentTheme = 'standard',
  onChangeTheme
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setMessage({ type: 'error', text: 'Preencha a senha atual e a nova senha.' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'A confirmação de senha não confere.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: currentUser?.id || 'admin-1',
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao alterar senha.');
      }

      setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Falha ao trocar senha.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-[#121215] border border-white/[0.08] p-6 rounded-3xl">
        <h2 className="text-xl font-black text-white">Configurações da Conta de Administrador</h2>
        <p className="text-xs text-slate-400 mt-1">
          Gerencie o acesso seguro e as preferências visuais do painel administrativo do PrintCraft
        </p>
      </div>

      {/* Theme Preference for Superadmin */}
      <div className="bg-[#121215] border border-white/[0.08] p-6 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-4 gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-400" />
              Tema Visual das Telas Administrativas (Super Admin)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalize o esquema visual exclusivo do console administrativo (/admin). Não altera o tema da oficina das empresas cadastradas.
            </p>
          </div>
          <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 w-fit">
            Ativo no Admin: <strong className="text-white capitalize">{currentTheme === 'sage-bento' ? 'Sage Bento' : currentTheme === 'high-contrast-light' ? 'Oficina Clara' : currentTheme === 'high-contrast-dark' ? 'Preto Puro' : 'Dark Studio'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onChangeTheme && onChangeTheme('standard')}
            className={`p-3.5 rounded-2xl text-left border transition cursor-pointer ${
              currentTheme === 'standard'
                ? 'bg-sky-500/20 border-sky-400 text-white font-bold ring-2 ring-sky-400'
                : 'bg-[#0A0A0B] border-white/[0.08] text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 text-xs">
              <Moon className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold">Dark Studio</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1.5 leading-tight">Padrão Escuro Suave</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTheme && onChangeTheme('sage-bento')}
            className={`p-3.5 rounded-2xl text-left border transition cursor-pointer ${
              currentTheme === 'sage-bento'
                ? 'bg-emerald-950/40 border-emerald-400 text-emerald-300 font-bold ring-2 ring-emerald-400/80 shadow-sm shadow-emerald-500/20'
                : 'bg-[#0A0A0B] border-white/[0.08] text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Leaf className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Sage Bento</span>
            </div>
            <span className="text-[11px] text-emerald-400/80 block mt-1.5 leading-tight">Verde Sálvia Bento</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTheme && onChangeTheme('high-contrast-light')}
            className={`p-3.5 rounded-2xl text-left border transition cursor-pointer ${
              currentTheme === 'high-contrast-light'
                ? 'bg-amber-400 text-slate-950 border-amber-500 font-bold ring-2 ring-amber-500 shadow-sm'
                : 'bg-[#0A0A0B] border-white/[0.08] text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold">
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Oficina Clara</span>
            </div>
            <span className="text-[11px] block mt-1.5 leading-tight opacity-80">Alto Contraste Diurno</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTheme && onChangeTheme('high-contrast-dark')}
            className={`p-3.5 rounded-2xl text-left border transition cursor-pointer ${
              currentTheme === 'high-contrast-dark'
                ? 'bg-black border-white text-white font-bold ring-2 ring-white shadow-sm'
                : 'bg-[#0A0A0B] border-white/[0.08] text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Preto Puro</span>
            </div>
            <span className="text-[11px] block mt-1.5 leading-tight opacity-80">Alto Contraste Noturno</span>
          </button>
        </div>
      </div>

      {/* Admin Profile Details */}
      <div className="bg-[#121215] border border-white/[0.08] p-6 rounded-3xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-emerald-400" />
          Perfil do Administrador Autenticado
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06]">
            <span className="text-slate-500 block text-[10px] uppercase">Nome</span>
            <span className="text-white font-bold text-sm">{currentUser?.name || 'Administrador Geral'}</span>
          </div>

          <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06]">
            <span className="text-slate-500 block text-[10px] uppercase">Usuário de Login</span>
            <span className="text-emerald-400 font-mono font-bold text-sm">@{currentUser?.username || 'admin'}</span>
          </div>

          <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06]">
            <span className="text-slate-500 block text-[10px] uppercase">E-mail Cadastrado</span>
            <span className="text-slate-200 font-mono">{currentUser?.email || 'admin@printcraft3d.com'}</span>
          </div>

          <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06]">
            <span className="text-slate-500 block text-[10px] uppercase">Nível de Permissão</span>
            <span className="text-sky-400 font-bold uppercase">Super Administrador (Total)</span>
          </div>
        </div>
      </div>

      {/* Change Password Form */}
      <div className="bg-[#121215] border border-white/[0.08] p-6 rounded-3xl space-y-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
          Alterar Senha do Administrador
        </h3>

        {message && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 ${
              message.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Senha Atual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Digite a senha atual"
              className="w-full px-4 py-2.5 rounded-2xl bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 text-xs text-white outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Nova Senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-2.5 rounded-2xl bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 text-xs text-white outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Confirmar Nova Senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-4 py-2.5 rounded-2xl bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 text-xs text-white outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Atualizar Senha</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
