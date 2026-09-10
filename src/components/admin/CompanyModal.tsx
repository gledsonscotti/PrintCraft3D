import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  FileText,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Layers,
  Shield,
  AlertCircle,
  Save,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles
} from 'lucide-react';
import { Company, CompanyDocumentType, CompanyStatus, BillingCycle, SubscriptionPlan } from '../../types';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (company: Company) => void;
  companyToEdit?: Company | null;
  availablePlans: SubscriptionPlan[];
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  companyToEdit,
  availablePlans,
}) => {
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [docType, setDocType] = useState<CompanyDocumentType>('CNPJ');
  const [docNumber, setDocNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [planId, setPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('mensal');
  const [status, setStatus] = useState<CompanyStatus>('active');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxUsersOverride, setMaxUsersOverride] = useState<string>('');
  const [maxPrintersOverride, setMaxPrintersOverride] = useState<string>('');
  const [maxProductsOverride, setMaxProductsOverride] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form fields
  useEffect(() => {
    if (companyToEdit) {
      setName(companyToEdit.name || '');
      setTradeName(companyToEdit.trade_name || '');
      setDocType(companyToEdit.document_type || 'CNPJ');
      setDocNumber(companyToEdit.document_number || '');
      setEmail(companyToEdit.email || '');
      setPhone(companyToEdit.phone || '');
      setCity(companyToEdit.city || '');
      setState(companyToEdit.state || 'SP');
      setPlanId(companyToEdit.plan_id || '');
      setBillingCycle(companyToEdit.billing_cycle || 'mensal');
      setStatus(companyToEdit.status || 'active');
      setExpiresAt(companyToEdit.expires_at ? companyToEdit.expires_at.slice(0, 10) : '');
      setMaxUsersOverride(companyToEdit.max_users_override !== null && companyToEdit.max_users_override !== undefined ? String(companyToEdit.max_users_override) : '');
      setMaxPrintersOverride(companyToEdit.max_printers_override !== null && companyToEdit.max_printers_override !== undefined ? String(companyToEdit.max_printers_override) : '');
      setMaxProductsOverride(companyToEdit.max_products_override !== null && companyToEdit.max_products_override !== undefined ? String(companyToEdit.max_products_override) : '');
      setNotes(companyToEdit.notes || '');
    } else {
      setName('');
      setTradeName('');
      setDocType('CNPJ');
      setDocNumber('');
      setEmail('');
      setPhone('');
      setCity('');
      setState('SP');
      setPlanId(availablePlans.length > 0 ? availablePlans[0].id : '');
      setBillingCycle('mensal');
      setStatus('active');
      // Default expiration in 30 days
      const d = new Date(Date.now() + 30 * 86400000);
      setExpiresAt(d.toISOString().slice(0, 10));
      setMaxUsersOverride('');
      setMaxPrintersOverride('');
      setMaxProductsOverride('');
      setNotes('');
    }
    setErrorMsg(null);
  }, [companyToEdit, isOpen, availablePlans]);

  if (!isOpen) return null;

  // Mask functions for CNPJ and CPF
  const handleDocChange = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (docType === 'CNPJ') {
      // 00.000.000/0000-00
      let masked = raw.slice(0, 14);
      if (masked.length > 12) {
        masked = masked.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})$/, '$1.$2.$3/$4-$5');
      } else if (masked.length > 8) {
        masked = masked.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4})$/, '$1.$2.$3/$4');
      } else if (masked.length > 5) {
        masked = masked.replace(/^(\d{2})(\d{3})(\d{1,3})$/, '$1.$2.$3');
      } else if (masked.length > 2) {
        masked = masked.replace(/^(\d{2})(\d{1,3})$/, '$1.$2');
      }
      setDocNumber(masked);
    } else {
      // 000.000.000-00
      let masked = raw.slice(0, 11);
      if (masked.length > 9) {
        masked = masked.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
      } else if (masked.length > 6) {
        masked = masked.replace(/^(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3');
      } else if (masked.length > 3) {
        masked = masked.replace(/^(\d{3})(\d{1,3})$/, '$1.$2');
      }
      setDocNumber(masked);
    }
  };

  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    let masked = raw;
    if (raw.length > 10) {
      masked = raw.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (raw.length > 6) {
      masked = raw.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
    } else if (raw.length > 2) {
      masked = raw.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
    }
    setPhone(masked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Informe a Razão Social ou Nome Completo da Empresa.');
      return;
    }

    const digits = docNumber.replace(/\D/g, '');
    if (docType === 'CNPJ' && digits.length < 14) {
      setErrorMsg('CNPJ incompleto. O formato padrão exige 14 dígitos numéricos.');
      return;
    }
    if (docType === 'CPF' && digits.length < 11) {
      setErrorMsg('CPF incompleto. O formato padrão exige 11 dígitos numéricos.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Informe um endereço de e-mail válido para a empresa.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        trade_name: tradeName.trim(),
        document_type: docType,
        document_number: docNumber.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        plan_id: planId || null,
        status,
        billing_cycle: billingCycle,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        max_users_override: maxUsersOverride.trim() !== '' ? Number(maxUsersOverride) : null,
        max_printers_override: maxPrintersOverride.trim() !== '' ? Number(maxPrintersOverride) : null,
        max_products_override: maxProductsOverride.trim() !== '' ? Number(maxProductsOverride) : null,
        notes: notes.trim(),
      };

      const url = companyToEdit ? `/api/admin/companies/${companyToEdit.id}` : '/api/admin/companies';
      const method = companyToEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao salvar dados da empresa.');
      }

      const savedCompany = await res.json();
      onSaved(savedCompany);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121216] border border-white/[0.12] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl admin-modal">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {companyToEdit ? 'Editar Cadastro da Empresa' : 'Nova Empresa no Ecossistema'}
              </h2>
              <p className="text-xs text-slate-400">
                Gerencie dados fiscais, plano de assinatura contratado e permissões do App
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section: Identificação & Documento */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                1. Identificação Fiscal & Registro
              </span>
              <span className="text-[10px] text-slate-400">CNPJ ou CPF</span>
            </div>

            {/* Document Type Selector (CNPJ vs CPF) */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setDocType('CNPJ');
                  setDocNumber('');
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                  docType === 'CNPJ'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:bg-white/[0.05]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Pessoa Jurídica (CNPJ)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDocType('CPF');
                  setDocNumber('');
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                  docType === 'CPF'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:bg-white/[0.05]'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Pessoa Física / Maker (CPF)</span>
              </button>
            </div>

            {/* Name and Trade Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {docType === 'CNPJ' ? 'Razão Social *' : 'Nome Completo do Titular *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={docType === 'CNPJ' ? 'Ex: PrintCraft Prototipagem LTDA' : 'Ex: João da Silva Maker'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition admin-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nome Fantasia / Nome do Estúdio 3D
                </label>
                <input
                  type="text"
                  placeholder="Ex: PrintCraft 3D Studio"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition admin-input"
                />
              </div>
            </div>

            {/* Document Number and Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {docType === 'CNPJ' ? 'Número do CNPJ *' : 'Número do CPF *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={docType === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                  value={docNumber}
                  onChange={(e) => handleDocChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono admin-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  E-mail de Contato *
                </label>
                <input
                  type="email"
                  required
                  placeholder="contato@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition admin-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="(11) 98765-4321"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono admin-input"
                />
              </div>
            </div>

            {/* City and State */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Cidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition admin-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">UF (Estado)</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#18181D] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-emerald-500 transition admin-input"
                >
                  {BRAZILIAN_STATES.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section: Plano de Assinatura & Faturamento */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                2. Plano Contratado & Licenciamento
              </span>
              <span className="text-[10px] text-slate-400">Controle de Cobrança</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Plano Atribuído</label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#18181D] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-emerald-500 transition admin-input"
                >
                  <option value="">Sem plano específico</option>
                  {availablePlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (R$ {Number(p.price).toFixed(2)}/{p.billing_cycle})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Ciclo de Cobrança</label>
                <select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#18181D] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-emerald-500 transition admin-input"
                >
                  <option value="mensal">Mensal</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual (Desconto)</option>
                  <option value="vitalicio">Vitalício / Permanente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Data de Vencimento / Renovação
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-emerald-500 transition admin-input"
                />
              </div>
            </div>

            {/* Status of Company Account in the App */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Status do Acesso da Empresa no APP
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setStatus('active')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
                    status === 'active'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:bg-white/[0.05]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ativa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('trial')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
                    status === 'trial'
                      ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                      : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:bg-white/[0.05]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Em Testes (Trial)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('suspended')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
                    status === 'suspended'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:bg-white/[0.05]'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Suspensa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('blocked')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
                    status === 'blocked'
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                      : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:bg-white/[0.05]'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Bloqueada</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Empresas com status <strong className="text-rose-400">Bloqueada</strong> ou <strong className="text-amber-400">Suspensa</strong> têm o login de todos os seus usuários imediatamente revogado.
              </p>
            </div>

            {/* Custom Quota Overrides */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Sobrescrita Especial de Limites (Opcional)
                </span>
                <span className="text-[10px] text-slate-500">Deixe vazio para usar os limites do plano</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Máx. Usuários</label>
                  <input
                    type="number"
                    placeholder="Padrão do plano"
                    value={maxUsersOverride}
                    onChange={(e) => setMaxUsersOverride(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-emerald-500 admin-input"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Máx. Impressoras 3D</label>
                  <input
                    type="number"
                    placeholder="Padrão do plano"
                    value={maxPrintersOverride}
                    onChange={(e) => setMaxPrintersOverride(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-emerald-500 admin-input"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Máx. Peças / Modelos</label>
                  <input
                    type="number"
                    placeholder="Padrão do plano"
                    value={maxProductsOverride}
                    onChange={(e) => setMaxProductsOverride(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-emerald-500 admin-input"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Observações Internas da Administração
              </label>
              <textarea
                rows={2}
                placeholder="Anotações comerciais, dados de faturamento, contato de suporte ou requisitos especiais..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition admin-input"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/[0.1] hover:bg-white/[0.05] text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Gravando...' : (companyToEdit ? 'Salvar Alterações' : 'Cadastrar Empresa')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
