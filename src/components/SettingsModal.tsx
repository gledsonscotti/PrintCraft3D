import React, { useState } from 'react';
import { Settings as SettingsIcon, X, CheckCircle2, Zap, DollarSign, Percent, Clock, Sun, Moon, Sparkles } from 'lucide-react';
import { AppSettings, AppTheme } from '../types';

interface SettingsModalProps {
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
  onSaveSettings: (newSettings: AppSettings) => void;
  currentTheme?: AppTheme;
  onChangeTheme?: (theme: AppTheme) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSaveSettings,
  currentTheme = 'standard',
  onChangeTheme,
}) => {
  const [energyKwhRate, setEnergyKwhRate] = useState(settings.energy_kwh_rate);
  const [currency, setCurrency] = useState(settings.currency);
  const [defaultLossMargin, setDefaultLossMargin] = useState(settings.default_loss_margin);
  const [hourlyLaborRate, setHourlyLaborRate] = useState(settings.hourly_labor_rate);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated: AppSettings = {
        energy_kwh_rate: Number(energyKwhRate),
        currency,
        default_loss_margin: Number(defaultLossMargin),
        hourly_labor_rate: Number(hourlyLaborRate),
        default_infill: settings.default_infill || 20,
        default_layer_height: settings.default_layer_height || 0.2,
      };

      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      onSaveSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      alert('Erro ao salvar configurações: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#121215] border border-white/[0.12] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-sky-400" />
            Configurações Globais de Custos
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {savedSuccess ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 p-4 rounded-2xl flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            Configurações salvas no banco de dados SQLite com sucesso!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Tarifa de Energia Elétrica (R$ / kWh)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={energyKwhRate}
                onChange={(e) => setEnergyKwhRate(Number(e.target.value))}
                className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sky-400/60"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Consulte sua conta de luz (média no Brasil varia entre R$ 0,75 e R$ 1,10 / kWh).
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Valor da Hora de Trabalho / Mão de Obra (R$ / h)
              </label>
              <input
                type="number"
                step="1"
                required
                value={hourlyLaborRate}
                onChange={(e) => setHourlyLaborRate(Number(e.target.value))}
                className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sky-400/60"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Custo atribuído ao tempo de preparação, fatiamento e pós-processamento.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-rose-400" />
                Margem Padrão de Perda / Falhas de Impressão (%)
              </label>
              <input
                type="number"
                required
                value={defaultLossMargin}
                onChange={(e) => setDefaultLossMargin(Number(e.target.value))}
                className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sky-400/60"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Percentual adicionado ao filamento para cobrir purgas, brim, suportes e falhas.
              </span>
            </div>

            {/* High Contrast / Workshop Lighting Theme */}
            <div className="pt-2 border-t border-white/[0.08]">
              <label className="block text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                Modo de Contraste Bento Grid (Oficina de Impressão)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeTheme && onChangeTheme('standard')}
                  className={`p-2.5 rounded-2xl text-left border transition ${
                    currentTheme === 'standard'
                      ? 'bg-sky-500/20 border-sky-400 text-white font-bold ring-1 ring-sky-400'
                      : 'bg-[#0A0A0B] border-white/[0.08] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <Moon className="w-3.5 h-3.5 text-slate-400" />
                    Padrão Dark
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1 leading-tight">Dark Studio</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeTheme && onChangeTheme('high-contrast-light')}
                  className={`p-2.5 rounded-2xl text-left border transition ${
                    currentTheme === 'high-contrast-light'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold ring-2 ring-amber-400'
                      : 'bg-[#0A0A0B] border-white/[0.08] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    Oficina Clara
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1 leading-tight">Anti-reflexo solar</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeTheme && onChangeTheme('high-contrast-dark')}
                  className={`p-2.5 rounded-2xl text-left border transition ${
                    currentTheme === 'high-contrast-dark'
                      ? 'bg-sky-500/20 border-sky-400 text-white font-bold ring-1 ring-sky-400'
                      : 'bg-[#0A0A0B] border-white/[0.08] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Preto Puro
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1 leading-tight">Linhas sólidas</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3.5 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
              >
                Fechar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="bg-sky-500 hover:bg-sky-400 text-white px-5 py-2.5 rounded-2xl text-xs font-semibold shadow transition"
              >
                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
