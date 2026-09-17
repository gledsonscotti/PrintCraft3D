import React, { useState, useEffect } from 'react';
import {
  Mail,
  MessageSquare,
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Send,
  Loader2,
  Sparkles,
  Info,
  HelpCircle,
  Check,
  KeyRound,
  ExternalLink
} from 'lucide-react';

interface DispatchSettingsData {
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_from?: string;
  smtp_secure?: boolean;
  whatsapp_api_url?: string;
  whatsapp_api_token?: string;
  whatsapp_instance?: string;
  company_name?: string;
  is_smtp_configured?: boolean;
  is_whatsapp_configured?: boolean;
}

interface DispatchSettingsViewProps {
  onSettingsSaved?: () => void;
  defaultCompany?: string;
}

export const DispatchSettingsView: React.FC<DispatchSettingsViewProps> = ({
  onSettingsSaved,
  defaultCompany,
}) => {
  const [activeTab, setActiveTab] = useState<'smtp' | 'whatsapp'>('smtp');
  const [settings, setSettings] = useState<DispatchSettingsData>({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    smtp_secure: false,
    whatsapp_api_url: '',
    whatsapp_api_token: '',
    whatsapp_instance: '',
    company_name: defaultCompany || 'Oficina 3D',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Visibility toggles for passwords
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showWaToken, setShowWaToken] = useState(false);

  // Testing states
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testPhone, setTestPhone] = useState('');
  const [testingWa, setTestingWa] = useState(false);
  const [testWaResult, setTestWaResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load current settings from backend
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dispatch/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          smtp_host: data.smtp_host || '',
          smtp_port: data.smtp_port || 587,
          smtp_user: data.smtp_user || '',
          smtp_pass: data.smtp_pass || '',
          smtp_from: data.smtp_from || '',
          smtp_secure: Boolean(data.smtp_secure),
          whatsapp_api_url: data.whatsapp_api_url || '',
          whatsapp_api_token: data.whatsapp_api_token || '',
          whatsapp_instance: data.whatsapp_instance || '',
          company_name: data.company_name || defaultCompany || 'Oficina 3D',
          is_smtp_configured: Boolean(data.is_smtp_configured),
          is_whatsapp_configured: Boolean(data.is_whatsapp_configured),
        });
        if (data.smtp_user && !testEmail) {
          setTestEmail(data.smtp_user);
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar configurações de disparo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/dispatch/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao gravar configurações.');
      }

      const data = await res.json();
      setFeedback({ type: 'success', message: data.message || 'Configurações salvas com sucesso!' });
      fetchSettings();
      if (onSettingsSaved) onSettingsSaved();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao conectar ao servidor.' });
    } finally {
      setSaving(false);
    }
  };

  // Quick Preset Handlers
  const applyPreset = (provider: 'gmail' | 'outlook' | 'hostinger' | 'custom') => {
    if (provider === 'gmail') {
      setSettings(prev => ({
        ...prev,
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        smtp_secure: false,
      }));
    } else if (provider === 'outlook') {
      setSettings(prev => ({
        ...prev,
        smtp_host: 'smtp.office365.com',
        smtp_port: 587,
        smtp_secure: false,
      }));
    } else if (provider === 'hostinger') {
      setSettings(prev => ({
        ...prev,
        smtp_host: 'smtp.hostinger.com',
        smtp_port: 465,
        smtp_secure: true,
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        smtp_host: '',
        smtp_port: 587,
        smtp_secure: false,
      }));
    }
  };

  // Test SMTP Connection
  const handleTestSmtp = async () => {
    setTestingEmail(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/dispatch/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_email: testEmail.trim() || undefined,
          config: settings,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao testar conexão SMTP.');
      }
      setTestEmailResult({ success: true, message: data.message });
    } catch (err: any) {
      setTestEmailResult({ success: false, message: err.message || 'Erro no teste de SMTP.' });
    } finally {
      setTestingEmail(false);
    }
  };

  // Test WhatsApp Connection
  const handleTestWhatsApp = async () => {
    if (!testPhone.trim()) {
      setTestWaResult({ success: false, message: 'Digite um número de telefone com DDD para testar o envio.' });
      return;
    }

    setTestingWa(true);
    setTestWaResult(null);
    try {
      const res = await fetch('/api/dispatch/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_phone: testPhone.trim(),
          config: settings,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao testar gateway de WhatsApp.');
      }
      setTestWaResult({ success: true, message: data.message });
    } catch (err: any) {
      setTestWaResult({ success: false, message: err.message || 'Erro no teste do gateway.' });
    } finally {
      setTestingWa(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400 space-y-3 bg-[#121215] border border-white/[0.08] rounded-3xl p-8">
        <Loader2 className="w-7 h-7 text-amber-400 animate-spin mx-auto" />
        <p className="text-xs">Carregando parâmetros de SMTP & WhatsApp...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Status Overview */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Configuração de Comunicação (SMTP & WhatsApp)
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Disparos
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure os canais automáticos para disparo de convites de cotações (RFP), links interativos e avisos aos fornecedores.
              </p>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
              settings.is_smtp_configured
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-800/60 border-white/[0.08] text-slate-400'
            }`}>
              <Mail className="w-3.5 h-3.5" />
              <span>SMTP: {settings.is_smtp_configured ? 'Ativo' : 'Não configurado'}</span>
            </div>

            <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
              settings.is_whatsapp_configured
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-800/60 border-white/[0.08] text-slate-400'
            }`}>
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp: {settings.is_whatsapp_configured ? 'API Conectada' : 'Modo Web Direto'}</span>
            </div>
          </div>
        </div>

        {/* Subtab Selector */}
        <div className="flex items-center gap-2 border-t border-white/[0.06] pt-4">
          <button
            type="button"
            onClick={() => setActiveTab('smtp')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'smtp'
                ? 'bg-sky-500 text-white font-bold shadow-sm'
                : 'bg-[#1c1c20] text-slate-400 hover:text-white border border-white/[0.04]'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Servidor de E-mail (SMTP)</span>
            {settings.is_smtp_configured && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'bg-[#1c1c20] text-slate-400 hover:text-white border border-white/[0.04]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp API / Gateway</span>
            {settings.is_whatsapp_configured && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 border ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* FORM: SMTP TAB */}
      {activeTab === 'smtp' && (
        <div className="space-y-6">
          <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-sky-400" />
                  Servidor SMTP (Envio Direto de E-mails)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Preencha as credenciais do seu provedor para que o sistema envie convites de cotação com tabela e links interativos.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-medium">Preencher rápido:</span>
                <button
                  type="button"
                  onClick={() => applyPreset('gmail')}
                  className="px-2.5 py-1 rounded-lg bg-[#1c1c20] hover:bg-white/10 text-[11px] font-semibold text-slate-300 border border-white/[0.06] transition cursor-pointer"
                >
                  Gmail
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('outlook')}
                  className="px-2.5 py-1 rounded-lg bg-[#1c1c20] hover:bg-white/10 text-[11px] font-semibold text-slate-300 border border-white/[0.06] transition cursor-pointer"
                >
                  Outlook
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('hostinger')}
                  className="px-2.5 py-1 rounded-lg bg-[#1c1c20] hover:bg-white/10 text-[11px] font-semibold text-slate-300 border border-white/[0.06] transition cursor-pointer"
                >
                  Hostinger
                </button>
              </div>
            </div>

            {/* Info notice about Gmail app passwords */}
            <div className="bg-sky-500/10 border border-sky-500/20 p-3.5 rounded-2xl text-xs text-sky-300 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Dica de Configuração:</span> Se você usa <strong>Gmail ou Google Workspace</strong>, ative a verificação em duas etapas na sua Conta Google e gere uma <strong>Senha de Aplicativo (16 dígitos)</strong> em <em>Segurança &gt; Senhas de app</em>. Use essa senha no campo abaixo.
              </div>
            </div>

            {/* Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Servidor SMTP (Host)</span>
                  <span className="text-[10px] text-slate-500">ex: smtp.gmail.com</span>
                </label>
                <input
                  type="text"
                  placeholder="smtp.gmail.com ou mail.suaempresa.com.br"
                  value={settings.smtp_host || ''}
                  onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                  className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Porta SMTP</span>
                  <span className="text-[10px] text-slate-500">587 ou 465</span>
                </label>
                <input
                  type="number"
                  placeholder="587"
                  value={settings.smtp_port || 587}
                  onChange={(e) => setSettings({ ...settings, smtp_port: Number(e.target.value) })}
                  className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Usuário / E-mail de Login
                </label>
                <input
                  type="text"
                  placeholder="compras@suaempresa.com.br"
                  value={settings.smtp_user || ''}
                  onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                  className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Senha / Senha de Aplicativo</span>
                  <span className="text-[10px] text-slate-500">Senha de App de 16 caracteres</span>
                </label>
                <div className="relative">
                  <input
                    type={showSmtpPass ? 'text' : 'password'}
                    placeholder={settings.smtp_pass ? '••••••••' : 'Senha do e-mail ou app password'}
                    value={settings.smtp_pass || ''}
                    onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass(!showSmtpPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>E-mail do Remetente (From)</span>
                  <span className="text-[10px] text-slate-500">Exibido na caixa do fornecedor</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: Compras Oficina 3D <compras@suaempresa.com.br>"
                  value={settings.smtp_from || ''}
                  onChange={(e) => setSettings({ ...settings, smtp_from: e.target.value })}
                  className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Nome da Empresa / Oficina
                </label>
                <input
                  type="text"
                  placeholder="Oficina 3D Pro"
                  value={settings.company_name || ''}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition"
                />
              </div>
            </div>

            {/* SSL Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="smtp_secure_box"
                checked={Boolean(settings.smtp_secure)}
                onChange={(e) => setSettings({ ...settings, smtp_secure: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 text-sky-500 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="smtp_secure_box" className="text-xs text-slate-300 cursor-pointer select-none">
                Conexão Segura Direta SSL/TLS (marcar obrigatório para Porta 465; desmarcar para 587/STARTTLS)
              </label>
            </div>

            {/* Test Connection Card */}
            <div className="bg-[#0A0A0B] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  Testar Conexão SMTP e Enviar E-mail de Teste
                </h4>
                <span className="text-[11px] text-slate-400">Valida login e envio imediato</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="email"
                  placeholder="Digite seu e-mail para receber um teste"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full sm:flex-1 bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={testingEmail || !settings.smtp_host || !settings.smtp_user}
                  className="w-full sm:w-auto px-4 py-2 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {testingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{testingEmail ? 'Testando...' : 'Testar Conexão'}</span>
                </button>
              </div>

              {testEmailResult && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  testEmailResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  {testEmailResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{testEmailResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FORM: WHATSAPP TAB */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 shadow-sm space-y-6">
            <div className="border-b border-white/[0.06] pb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                Gateway / API do WhatsApp (Envio Automático pelo Servidor)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Integre seu provedor de API do WhatsApp (Evolution API, Z-API, Z-Stack, WhatsApp Cloud API ou webhook HTTP) para disparos 100% automatizados aos fornecedores.
              </p>
            </div>

            {/* Info notice */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl text-xs text-emerald-300 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Como Funciona:</span> Quando a URL e o Token estiverem configurados, o sistema dispara a mensagem diretamente para o telefone do fornecedor via chamada HTTP. Caso não configurado, o sistema abre o WhatsApp Web / Desktop diretamente com o texto pré-formatado e link seguro.
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Endpoint / URL da API do WhatsApp</span>
                  <span className="text-[10px] text-slate-500">Suporta placeholder {'{instance}'}</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: https://api.suaempresa.com/message/sendText ou https://api.z-api.io/instances/..."
                  value={settings.whatsapp_api_url || ''}
                  onChange={(e) => setSettings({ ...settings, whatsapp_api_url: e.target.value })}
                  className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Token / API Key / Bearer</span>
                    <span className="text-[10px] text-slate-500">Chave secreta de autenticação</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showWaToken ? 'text' : 'password'}
                      placeholder={settings.whatsapp_api_token ? '••••••••' : 'Token da API'}
                      value={settings.whatsapp_api_token || ''}
                      onChange={(e) => setSettings({ ...settings, whatsapp_api_token: e.target.value })}
                      className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWaToken(!showWaToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      {showWaToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Nome da Instância (Opcional)</span>
                    <span className="text-[10px] text-slate-500">ex: default ou oficina3d</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ex: oficina_compras"
                    value={settings.whatsapp_instance || ''}
                    onChange={(e) => setSettings({ ...settings, whatsapp_instance: e.target.value })}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Assinatura da Empresa nas Mensagens</span>
                  <span className="text-[10px] text-slate-500">Inserido nas mensagens de WhatsApp</span>
                </label>
                <input
                  type="text"
                  placeholder="Oficina 3D Pro"
                  value={settings.company_name || ''}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition"
                />
              </div>
            </div>

            {/* Test WhatsApp Gateway Card */}
            <div className="bg-[#0A0A0B] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Testar Disparo pelo Gateway do WhatsApp
                </h4>
                <span className="text-[11px] text-slate-400">Valida URL e autenticação com envio real</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  placeholder="Digite seu número com DDD (ex: 11999998888)"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full sm:flex-1 bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={handleTestWhatsApp}
                  disabled={testingWa || !settings.whatsapp_api_url}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {testingWa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{testingWa ? 'Enviando...' : 'Testar WhatsApp'}</span>
                </button>
              </div>

              {testWaResult && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  testWaResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  {testWaResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{testWaResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Action Footer */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            As credenciais são armazenadas de forma segura no banco de dados e nunca são compartilhadas com clientes.
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span>{saving ? 'Gravando...' : 'Salvar Configurações'}</span>
        </button>
      </div>
    </div>
  );
};
