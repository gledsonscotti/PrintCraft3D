import React, { useState, useEffect } from 'react';
import {
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Key,
  Eye,
  EyeOff,
  Check,
  Zap,
  Crown
} from 'lucide-react';
import { SubscriptionPlan, CompanyDocumentType, BillingCycle } from '../../types';

interface ProductAuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: any, company: any, token: string, isSuperadmin: boolean) => void;
  onSwitchToSuperadminConsole?: () => void;
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const ProductAuthModal: React.FC<ProductAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onSwitchToSuperadminConsole,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register State
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('plan-pro');
  const [docType, setDocType] = useState<CompanyDocumentType>('CNPJ');
  const [docNumber, setDocNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('mensal');

  // Admin User fields
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminPhone, setAdminPhone] = useState('');

  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccessMsg, setRegisterSuccessMsg] = useState<string | null>(null);

  // Load public plans on mount
  useEffect(() => {
    fetch('/api/public/plans')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPlans(data);
          const popular = data.find((p) => p.is_popular);
          if (popular) {
            setSelectedPlanId(popular.id);
          } else {
            setSelectedPlanId(data[0].id);
          }
        }
      })
      .catch((err) => console.error('Erro ao buscar planos:', err));
  }, []);

  if (!isOpen) return null;

  // Masking for Document
  const handleDocChange = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (docType === 'CNPJ') {
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

  // Masking for Phone
  const handlePhoneChange = (val: string, setter: (v: string) => void) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    let masked = raw;
    if (raw.length > 10) {
      masked = raw.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (raw.length > 6) {
      masked = raw.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
    } else if (raw.length > 2) {
      masked = raw.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
    }
    setter(masked);
  };

  // Handle Login Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setLoginError('Por favor, informe o e-mail ou usuário e a senha.');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginIdentifier.trim(),
          password: loginPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar login.');
      }

      // Save token and info
      localStorage.setItem('printcraft_auth_token', data.token);
      localStorage.setItem('printcraft_auth_user', JSON.stringify(data.user));
      localStorage.setItem('printcraft_auth_company', JSON.stringify(data.company));
      localStorage.setItem('printcraft_is_superadmin', data.is_superadmin ? 'true' : 'false');

      if (data.is_superadmin || data.user?.role === 'superadmin') {
        localStorage.setItem('printcraft_admin_token', data.token);
        localStorage.setItem('printcraft_admin_user', JSON.stringify(data.user));
      }

      onLoginSuccess(data.user, data.company, data.token, Boolean(data.is_superadmin));
    } catch (err: any) {
      setLoginError(err.message || 'Falha na conexão com o servidor.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Quick-fill credentials for demonstration
  const handleQuickFill = (identifier: string, pwd: string) => {
    setLoginIdentifier(identifier);
    setLoginPassword(pwd);
    setLoginError(null);
  };

  // Handle Register Submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    // Basic Validations
    if (!companyName.trim()) {
      setRegisterError('Informe a Razão Social ou Nome Completo da empresa.');
      return;
    }
    if (!docNumber.trim()) {
      setRegisterError(`Informe o número do ${docType}.`);
      return;
    }
    if (!companyEmail.trim()) {
      setRegisterError('Informe o e-mail oficial de contato da empresa.');
      return;
    }
    if (!adminName.trim()) {
      setRegisterError('Informe o nome do usuário administrador.');
      return;
    }
    if (!adminEmail.trim()) {
      setRegisterError('Informe o e-mail de acesso do administrador.');
      return;
    }
    if (!adminPassword || adminPassword.length < 4) {
      setRegisterError('A senha de acesso deve possuir pelo menos 4 caracteres.');
      return;
    }
    if (adminPassword !== adminPasswordConfirm) {
      setRegisterError('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    setRegisterLoading(true);
    try {
      const res = await fetch('/api/auth/register-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlanId,
          company_name: companyName.trim(),
          trade_name: tradeName.trim() || companyName.trim(),
          document_type: docType,
          document_number: docNumber.trim(),
          company_email: companyEmail.trim(),
          company_phone: companyPhone.trim(),
          city: city.trim(),
          state,
          billing_cycle: billingCycle,
          admin_name: adminName.trim(),
          admin_email: adminEmail.trim(),
          admin_password: adminPassword.trim(),
          admin_phone: adminPhone.trim() || companyPhone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar o cadastro da empresa.');
      }

      setRegisterSuccessMsg('Cadastro concluído com sucesso! Acessando a oficina...');

      // Save token and info
      localStorage.setItem('printcraft_auth_token', data.token);
      localStorage.setItem('printcraft_auth_user', JSON.stringify(data.user));
      localStorage.setItem('printcraft_auth_company', JSON.stringify(data.company));
      localStorage.setItem('printcraft_is_superadmin', 'false');

      setTimeout(() => {
        onLoginSuccess(data.user, data.company, data.token, false);
      }, 1000);
    } catch (err: any) {
      setRegisterError(err.message || 'Falha ao cadastrar no servidor.');
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-[#16251C]/70 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl my-auto bg-[#FBF9F4] border border-[#D5CDBD] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Banner - Sage Bento */}
        <div className="bg-gradient-to-r from-[#213F2E] via-[#2F5941] to-[#1E3A2A] px-6 py-5 text-white flex items-center justify-between shrink-0 border-b border-[#1A3425] shadow-sm">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shadow-inner text-[#E2F0E7]">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-[#FAFDFB]">PrintCraft 3D</h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#467356] text-[#E8F5ED] border border-[#6CA07E]/40 uppercase tracking-wider">
                  Oficina & Farm
                </span>
              </div>
              <p className="text-xs text-[#C8E0D2] mt-0.5 font-medium">
                Portal de Acesso Seguro & Cadastro de Empresas de Impressão 3D
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs font-semibold bg-black/25 text-[#E0EFE5] px-3.5 py-1.5 rounded-lg border border-white/15 backdrop-blur-xs">
            <Shield className="w-4 h-4 text-[#8AE0B3]" />
            <span>Multi-Tenant Seguro</span>
          </div>
        </div>

        {/* Tab Toggle Navigation - Sage Bento */}
        <div className="flex border-b border-[#DDD5C7] bg-[#EFEAE0] shrink-0">
          <button
            id="tab-btn-login"
            type="button"
            onClick={() => {
              setActiveTab('login');
              setLoginError(null);
            }}
            className={`flex-1 py-3.5 px-4 text-sm font-bold flex items-center justify-center space-x-2 transition-all border-b-2 ${
              activeTab === 'login'
                ? 'border-[#2F5941] text-[#1E3B2B] bg-[#FBF9F4] shadow-xs'
                : 'border-transparent text-[#5C7265] hover:text-[#1E3B2B] hover:bg-[#E7E1D5]'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>1. Entrar na Oficina (Login)</span>
          </button>
          <button
            id="tab-btn-register"
            type="button"
            onClick={() => {
              setActiveTab('register');
              setRegisterError(null);
            }}
            className={`flex-1 py-3.5 px-4 text-sm font-bold flex items-center justify-center space-x-2 transition-all border-b-2 ${
              activeTab === 'register'
                ? 'border-[#2F5941] text-[#1E3B2B] bg-[#FBF9F4] shadow-xs'
                : 'border-transparent text-[#5C7265] hover:text-[#1E3B2B] hover:bg-[#E7E1D5]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>2. Cadastrar Empresa & Escolher Plano</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 text-[#1E3025] bg-[#FBF9F4]">
          {activeTab === 'login' ? (
            /* ================= TAB 1: LOGIN ================= */
            <div className="max-w-xl mx-auto space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-[#182C20]">Acesso ao Produto PrintCraft</h2>
                <p className="text-xs text-[#526B5D] font-medium">
                  Informe o seu e-mail cadastrado e senha para gerenciar sua oficina ou operar a produção.
                </p>
              </div>

              {loginError && (
                <div className="p-3.5 bg-[#FFF0F0] border border-[#F5C2C2] rounded-xl flex items-start space-x-3 text-[#991B1B] text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                  <div>
                    <strong className="block font-bold">Falha no Login</strong>
                    {loginError}
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#233C2D] mb-1.5">
                    E-mail de Acesso ou Usuário
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#607D6E]" />
                    <input
                      id="login-email-input"
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="ex: carlos.rocha@printcraft3d.com ou admin"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#CDC4B5] rounded-xl text-[#182C20] text-sm placeholder:text-[#8D9F94] focus:outline-none focus:ring-2 focus:ring-[#2F5941]/25 focus:border-[#2F5941] transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#233C2D] mb-1.5">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#607D6E]" />
                    <input
                      id="login-password-input"
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Sua senha secreta"
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#CDC4B5] rounded-xl text-[#182C20] text-sm placeholder:text-[#8D9F94] focus:outline-none focus:ring-2 focus:ring-[#2F5941]/25 focus:border-[#2F5941] transition-all shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#607D6E] hover:text-[#1E3B2B] p-1"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="btn-submit-login"
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-[#2B543D] to-[#3B6E51] hover:from-[#214330] hover:to-[#2F5941] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#2B543D]/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  {loginLoading ? (
                    <span>Autenticando na oficina...</span>
                  ) : (
                    <>
                      <span>Entrar no PrintCraft</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Demo Quick-Fill Section - Sage Bento Cards */}
              <div className="pt-4 border-t border-[#DCD4C5] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4B6656] uppercase tracking-wider">
                    Contas Prontas para Demonstração:
                  </span>
                  <span className="text-[11px] text-[#2F5941] font-bold">Clique para preencher</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
                  {/* Account 1: Company Admin */}
                  <button
                    type="button"
                    onClick={() => handleQuickFill('carlos.rocha@printcraft3d.com', 'senha123')}
                    className="p-3 bg-white hover:bg-[#F2F7F4] border border-[#DDD5C7] hover:border-[#2F5941] rounded-xl transition-all group text-left shadow-xs"
                  >
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-[#1A2E22] group-hover:text-[#2F5941]">
                      <Building2 className="w-3.5 h-3.5 text-[#2F5941]" />
                      <span>Admin Empresa</span>
                    </div>
                    <div className="text-[11px] text-[#4F685B] font-semibold truncate mt-0.5">Carlos Rocha</div>
                    <div className="text-[10px] text-[#71897C] truncate">PrintCraft 3D Studio</div>
                  </button>

                  {/* Account 2: Operator */}
                  <button
                    type="button"
                    onClick={() => handleQuickFill('beatriz.maker@printcraft3d.com', 'senha123')}
                    className="p-3 bg-white hover:bg-[#F0F6F5] border border-[#DDD5C7] hover:border-[#286C66] rounded-xl transition-all group text-left shadow-xs"
                  >
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-[#1A2E22] group-hover:text-[#286C66]">
                      <User className="w-3.5 h-3.5 text-[#286C66]" />
                      <span>Operadora 3D</span>
                    </div>
                    <div className="text-[11px] text-[#4F685B] font-semibold truncate mt-0.5">Beatriz Lima</div>
                    <div className="text-[10px] text-[#71897C] truncate">Permissões: PCP & Estoque</div>
                  </button>

                  {/* Account 3: Superadmin */}
                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin', 'admin123')}
                    className="p-3 bg-white hover:bg-[#F5F2F8] border border-[#DDD5C7] hover:border-[#524484] rounded-xl transition-all group text-left shadow-xs"
                  >
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-[#1A2E22] group-hover:text-[#524484]">
                      <Crown className="w-3.5 h-3.5 text-[#524484]" />
                      <span>Super Admin</span>
                    </div>
                    <div className="text-[11px] text-[#4F685B] font-semibold truncate mt-0.5">Administrador Geral</div>
                    <div className="text-[10px] text-[#71897C] truncate">Acesso Geral & Gestão</div>
                  </button>
                </div>
              </div>

              {/* Invitation to register & Superadmin direct link */}
              <div className="text-center pt-2 space-y-1.5">
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="text-xs text-[#2F5941] hover:text-[#1E3B2B] underline font-bold"
                  >
                    Sua empresa ainda não tem cadastro? Clique aqui para escolher um plano e criar sua conta.
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin', 'admin123')}
                    className="text-[11px] text-[#524484] hover:text-[#3B2F64] font-semibold hover:underline inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[#524484]/5 transition-colors cursor-pointer"
                    title="Preencher credenciais do Super Administrador"
                  >
                    <Crown className="w-3.5 h-3.5 text-[#524484]" />
                    <span>Entrar como Super Admin (/admin)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ================= TAB 2: REGISTER COMPANY & CHOOSE PLAN ================= */
            <form onSubmit={handleRegister} className="space-y-6">
              {registerError && (
                <div className="p-3.5 bg-[#FFF0F0] border border-[#F5C2C2] rounded-xl flex items-start space-x-3 text-[#991B1B] text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                  <div>
                    <strong className="block font-bold">Verifique os dados cadastrais</strong>
                    {registerError}
                  </div>
                </div>
              )}

              {registerSuccessMsg && (
                <div className="p-3.5 bg-[#EDF7F1] border border-[#BCE3CD] rounded-xl flex items-start space-x-3 text-[#166534] text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#16A34A]" />
                  <div>
                    <strong className="block font-bold">Sucesso!</strong>
                    {registerSuccessMsg}
                  </div>
                </div>
              )}

              {/* STEP 1: CHOOSE SUBSCRIPTION PLAN */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-[#2F5941] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      1
                    </span>
                    <h3 className="text-sm font-bold text-[#182C20]">
                      Escolha o Plano de Assinatura Desejado
                    </h3>
                  </div>
                  <span className="text-xs text-[#5F786B] font-medium">
                    O plano pode ser alterado a qualquer momento pelo Superadmin
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {plans.map((p) => {
                    const isSelected = selectedPlanId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlanId(p.id)}
                        className={`cursor-pointer relative p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#EFF6F1] border-[#2F5941] ring-2 ring-[#2F5941]/25 shadow-md'
                            : 'bg-white border-[#DDD5C7] hover:bg-[#F7F4EC] hover:border-[#BFB6A6] shadow-xs'
                        }`}
                      >
                        {p.is_popular && (
                          <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-extrabold text-[10px] rounded-full uppercase tracking-wider shadow-sm">
                            Mais Escolhido
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-[#182C20] text-sm">{p.name}</h4>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-[#2F5941] text-white flex items-center justify-center shadow-xs">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            )}
                          </div>

                          <div className="text-lg font-black text-[#234A34] mb-1">
                            {p.price === 0 ? 'Gratuito' : `R$ ${p.price.toFixed(2).replace('.', ',')}`}
                            <span className="text-[11px] font-normal text-[#627D70] ml-1">/mês</span>
                          </div>

                          <p className="text-xs text-[#526D5F] line-clamp-2 mb-3">{p.description}</p>

                          <div className="space-y-1.5 text-[11px] text-[#293F33] border-t border-[#E2DAD0] pt-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[#647F71]">Usuários da Equipe:</span>
                              <span className="font-bold text-[#182C20]">
                                {p.max_users === -1 ? 'Ilimitado' : `Até ${p.max_users} usuário(s)`}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#647F71]">Impressoras 3D:</span>
                              <span className="font-bold text-[#182C20]">
                                {p.max_printers === -1 ? 'Ilimitadas' : `Até ${p.max_printers}`}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#647F71]">Produtos no Catálogo:</span>
                              <span className="font-bold text-[#182C20]">
                                {p.max_products === -1 ? 'Ilimitados' : `Até ${p.max_products}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-[#E2DAD0] flex items-center justify-between text-[11px]">
                          <span className="text-[#2F5941] font-bold flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {p.features?.length || 5} recursos inclusos
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isSelected
                                ? 'bg-[#2F5941] text-white'
                                : 'bg-[#EAE4D9] text-[#4F685B]'
                            }`}
                          >
                            {isSelected ? 'Selecionado' : 'Selecionar'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: COMPANY INFORMATION (CNPJ/CPF) */}
              <div className="space-y-3 pt-3 border-t border-[#DDD5C7]">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-[#2F5941] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-[#182C20]">
                    Dados Cadastrais da Empresa (CNPJ ou CPF)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {/* Document Type Toggle */}
                  <div>
                    <label className="block text-xs font-bold text-[#233C2D] mb-1.5">
                      Tipo de Inscrição Fiscal
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#EAE3D6] rounded-xl border border-[#D5CDBD]">
                      <button
                        type="button"
                        onClick={() => {
                          setDocType('CNPJ');
                          setDocNumber('');
                        }}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                          docType === 'CNPJ'
                            ? 'bg-[#2F5941] text-white shadow-xs'
                            : 'text-[#526B5D] hover:text-[#182C20]'
                        }`}
                      >
                        CNPJ (PJ)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDocType('CPF');
                          setDocNumber('');
                        }}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                          docType === 'CPF'
                            ? 'bg-[#2F5941] text-white shadow-xs'
                            : 'text-[#526B5D] hover:text-[#182C20]'
                        }`}
                      >
                        CPF (PF / Autônomo)
                      </button>
                    </div>
                  </div>

                  {/* Document Number */}
                  <div className="sm:col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-[#233C2D] mb-1.5">
                      Número do {docType} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="reg-doc-number"
                      type="text"
                      value={docNumber}
                      onChange={(e) => handleDocChange(e.target.value)}
                      placeholder={docType === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                      required
                      className="w-full px-3.5 py-2 bg-white border border-[#CDC4B5] rounded-xl text-[#182C20] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5941]/25 focus:border-[#2F5941] shadow-xs"
                    />
                  </div>

                  {/* Company Name (Razão Social) */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#233C2D] mb-1.5">
                      Razão Social ou Nome Completo da Empresa <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="reg-company-name"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="ex: Alpha 3D Soluções Tecnológicas LTDA"
                      required
                      className="w-full px-3.5 py-2 bg-white border border-[#CDC4B5] rounded-xl text-[#182C20] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5941]/25 focus:border-[#2F5941] shadow-xs"
                    />
                  </div>

                  {/* Trade Name */}
                  <div>
                    <label className="block text-xs font-bold text-[#233C2D] mb-1.5">
                      Nome Fantasia (Opcional)
                    </label>
                    <input
                      id="reg-trade-name"
                      type="text"
                      value={tradeName}
                      onChange={(e) => setTradeName(e.target.value)}
                      placeholder="ex: Alpha 3D Studio"
                      className="w-full px-3.5 py-2 bg-white border border-[#CDC4B5] rounded-xl text-[#182C20] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5941]/25 focus:border-[#2F5941] shadow-xs"
                    />
                  </div>

                  {/* Company Email */}
                  <div>
                    <label className="block text-xs font-bold text-[#233C2D] mb-1.5">
                      E-mail da Empresa <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="reg-company-email"
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="contato@alpha3d.com.br"
                      required
                      className="w-full px-3.5 py-2 bg-white border border-[#CDC4B5] rounded-xl text-[#182C20] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5941]/25 focus:border-[#2F5941] shadow-xs"
                    />
                  </div>

                  {/* Company Phone */}
                  <div>
                    <label className="block text-xs font-bold text-[#233C2D] mb-1.5">
                      Telefone / WhatsApp Comercial
                    </label>
                    <input
                      id="reg-company-phone"
                      type="text"
                      value={companyPhone}
                      onChange={(e) => handlePhoneChange(e.target.value, setCompanyPhone)}
                      placeholder="(11) 98765-4321"
                      className="w-full px-3.5 py-2 bg-white border border-[#CDC4B5] rounded-xl text-[#182C20] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5941]/25 focus:border-[#2F5941] shadow-xs"
                    />
                  </div>

                  {/* City & State */}
                  <div>
                    <label className="block text-xs font-bold text-[#233C2D] mb-1.5">
                      Cidade & Estado (UF)
                    </label>
                    <div className="flex space-x-2">
                      <input
                        id="reg-city"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Cidade"
                        className="flex-1 px-3.5 py-2 bg-white border border-[#CDC4B5] rounded-xl text-[#182C20] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5941]/25 focus:border-[#2F5941] shadow-xs"
                      />
                      <select
                        id="reg-state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-20 px-2.5 py-2 bg-white border border-[#CDC4B5] rounded-xl text-[#182C20] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#2F5941]/25 focus:border-[#2F5941] shadow-xs"
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
              </div>

              {/* STEP 3: COMPANY ADMIN USER CREDENTIALS */}
              <div className="space-y-3 pt-3 border-t border-[#DDD5C7]">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-[#2F5941] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    3
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#182C20]">
                      Usuário Administrador da Empresa (Admin da Conta)
                    </h3>
                    <p className="text-xs text-[#526B5D] font-medium">
                      Este usuário terá privilégios de Admin para cadastrar outros operadores e configurar permissões.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Admin Name */}
                  <div>
                    <label className="block text-xs font-bold text-[#233C2D] mb-1.5">
                      Nome Completo do Administrador <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="reg-admin-name"
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="ex: Rodrigo Santos"
                      required
                      className="w-full px-3.5 py-2 bg-white border border-[#CDC4B5] rounded-xl text-[#182C20] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5941]/25 focus:border-[#2F5941] shadow-xs"
                    />
                  </div>

                  {/* Admin Email */}
                  <div>
                    <label className="block text-xs font-bold text-[#233C2D] mb-1.5">
                      E-mail de Login do Administrador <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="reg-admin-email"
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="ex: rodrigo@alpha3d.com.br"
                      required
                      className="w-full px-3.5 py-2 bg-white border border-[#CDC4B5] rounded-xl text-[#182C20] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5941]/25 focus:border-[#2F5941] shadow-xs"
                    />
                  </div>

                  {/* Admin Password */}
                  <div>
                    <label className="block text-xs font-bold text-[#233C2D] mb-1.5">
                      Senha de Acesso (Mínimo 4 caracteres) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="reg-admin-pwd"
                        type={showAdminPassword ? 'text' : 'password'}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Senha segura"
                        required
                        className="w-full px-3.5 py-2 bg-white border border-[#CDC4B5] rounded-xl text-[#182C20] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5941]/25 focus:border-[#2F5941] shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#607D6E] hover:text-[#1E3B2B] p-1"
                      >
                        {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-bold text-[#233C2D] mb-1.5">
                      Confirmar Senha <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="reg-admin-pwd-confirm"
                      type={showAdminPassword ? 'text' : 'password'}
                      value={adminPasswordConfirm}
                      onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                      placeholder="Repita a senha"
                      required
                      className="w-full px-3.5 py-2 bg-white border border-[#CDC4B5] rounded-xl text-[#182C20] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5941]/25 focus:border-[#2F5941] shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-[#DDD5C7] flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="text-xs text-[#526B5D] hover:text-[#182C20] font-bold"
                >
                  Já possui conta? Clique para fazer Login
                </button>

                <button
                  id="btn-submit-register"
                  type="submit"
                  disabled={registerLoading}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#2B543D] to-[#3B6E51] hover:from-[#214330] hover:to-[#2F5941] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#2B543D]/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  {registerLoading ? (
                    <span>Cadastrando empresa...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Concluir Cadastro & Acessar PrintCraft</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
