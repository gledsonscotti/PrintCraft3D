import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  Phone,
  Building2,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  Key,
  ShieldAlert,
  CheckSquare,
  Square
} from 'lucide-react';
import { AppUser, AppUserRole, AppUserStatus, Company } from '../../types';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (user: AppUser) => void;
  userToEdit?: AppUser | null;
  companies: Company[];
  initialCompanyId?: string;
}

const SYSTEM_MODULE_PERMISSIONS = [
  { key: 'calculator', label: 'Calculadora de Custos 3D', desc: 'Cálculo de hora-máquina, filamento e margens' },
  { key: 'model_analyzer', label: 'Analisador 3D & IA', desc: 'Leitura de STL/G-code e otimização por IA' },
  { key: 'pcp', label: 'Ordens de Produção (PCP)', desc: 'Fila de impressão, apontamentos e status' },
  { key: 'printers', label: 'Parque de Impressoras 3D', desc: 'Gestão de impressoras, bicos e AMS' },
  { key: 'stock', label: 'Estoque de Filamentos & Resinas', desc: 'Carretéis, pesagem e alertas de fim' },
  { key: 'ready_stock', label: 'Catálogo de Peças Prontas', desc: 'Estoque físico para pronta entrega' },
  { key: 'clients', label: 'Banco de Clientes (CRM)', desc: 'Cadastro de clientes CPF/CNPJ e histórico' },
  { key: 'sales', label: 'Orçamentos & Vendas', desc: 'Emissão de propostas PDF e WhatsApp' },
  { key: 'consignments', label: 'Consignações & Lojas', desc: 'Pontos de venda externos e acertos' },
  { key: 'integrations', label: 'Integrações Marketplaces', desc: 'Shopee, Mercado Livre e APIs' },
  { key: 'backups', label: 'Backup & Configurações', desc: 'Exportação de banco e ajustes da oficina' },
];

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  userToEdit,
  companies,
  initialCompanyId,
}) => {
  const [companyId, setCompanyId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<AppUserRole>('operator');
  const [status, setStatus] = useState<AppUserStatus>('active');
  const [permissions, setPermissions] = useState<string[]>(['all']);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setCompanyId(userToEdit.company_id || '');
      setName(userToEdit.name || '');
      setEmail(userToEdit.email || '');
      setPassword('');
      setPhone(userToEdit.phone || '');
      setRole(userToEdit.role || 'operator');
      setStatus(userToEdit.status || 'active');
      setPermissions(Array.isArray(userToEdit.permissions) ? userToEdit.permissions : ['all']);
    } else {
      setCompanyId(initialCompanyId || (companies.length > 0 ? companies[0].id : ''));
      setName('');
      setEmail('');
      setPassword('printcraft123');
      setPhone('');
      setRole('operator');
      setStatus('active');
      setPermissions(['pcp', 'printers', 'stock']);
    }
    setErrorMsg(null);
  }, [userToEdit, isOpen, companies, initialCompanyId]);

  if (!isOpen) return null;

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

  const handleRoleChange = (newRole: AppUserRole) => {
    setRole(newRole);
    if (newRole === 'admin') {
      setPermissions(['all']);
    } else if (newRole === 'manager') {
      setPermissions(['calculator', 'model_analyzer', 'pcp', 'printers', 'stock', 'ready_stock']);
    } else if (newRole === 'operator') {
      setPermissions(['pcp', 'printers', 'stock']);
    } else if (newRole === 'sales') {
      setPermissions(['calculator', 'clients', 'sales', 'consignments', 'ready_stock']);
    } else if (newRole === 'financial') {
      setPermissions(['calculator', 'sales', 'consignments', 'clients']);
    } else if (newRole === 'viewer') {
      setPermissions(['pcp', 'stock', 'printers']);
    }
  };

  const togglePermission = (key: string) => {
    if (permissions.includes('all')) {
      // If was 'all', convert to explicit list without this key
      const allKeys = SYSTEM_MODULE_PERMISSIONS.map((p) => p.key).filter((k) => k !== key);
      setPermissions(allKeys);
      return;
    }

    if (permissions.includes(key)) {
      setPermissions(permissions.filter((p) => p !== key));
    } else {
      const next = [...permissions, key];
      if (next.length === SYSTEM_MODULE_PERMISSIONS.length) {
        setPermissions(['all']);
      } else {
        setPermissions(next);
      }
    }
  };

  const selectAllPermissions = () => {
    setPermissions(['all']);
  };

  const clearAllPermissions = () => {
    setPermissions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Informe o nome completo do usuário.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Informe um e-mail de login válido.');
      return;
    }
    if (!companyId) {
      setErrorMsg('Selecione a empresa associada a este usuário.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        company_id: companyId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
        status,
        permissions: permissions.length === 0 ? ['none'] : permissions,
      };

      if (!userToEdit && password.trim()) {
        payload.password = password.trim();
      }

      const url = userToEdit ? `/api/admin/users/${userToEdit.id}` : '/api/admin/users';
      const method = userToEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao salvar dados do usuário.');
      }

      const savedUser = await res.json();
      onSaved(savedUser);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao conectar ao servidor.');
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
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {userToEdit ? 'Editar Usuário do Sistema' : 'Novo Usuário & Controle de Acesso'}
              </h2>
              <p className="text-xs text-slate-400">
                Vincule o operador a uma empresa e defina suas permissões no App
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Empresa Vinculada */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              Empresa / Oficina Vinculada *
            </label>
            <select
              required
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#18181D] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-sky-500 transition admin-input"
            >
              <option value="">Selecione uma empresa...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.document_type}: {c.document_number}) {c.status === 'blocked' ? ' [BLOQUEADA]' : ''}
                </option>
              ))}
            </select>
            {companyId && (
              <p className="text-[11px] text-slate-400 mt-1">
                O usuário herdará o plano e os limites configurados para esta empresa.
              </p>
            )}
          </div>

          {/* Nome e E-mail */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Nome Completo *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Carlos Oliveira Rocha"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-sky-500 transition admin-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                E-mail de Login *
              </label>
              <input
                type="email"
                required
                placeholder="carlos@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-sky-500 transition admin-input"
              />
            </div>
          </div>

          {/* Telefone e Senha (apenas na criação) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                placeholder="(11) 98765-4321"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-sky-500 transition font-mono admin-input"
              />
            </div>

            {!userToEdit && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Senha Inicial de Acesso
                </label>
                <input
                  type="text"
                  placeholder="printcraft123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-sky-500 transition font-mono admin-input"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Padrão: printcraft123 (o usuário poderá alterar após o primeiro login)
                </span>
              </div>
            )}
          </div>

          {/* Perfil de Acesso (Role) */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              Perfil de Acesso (Role no App)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'admin', label: 'Administrador', desc: 'Acesso Irrestrito' },
                { id: 'manager', label: 'Gerente de PCP', desc: 'Produção & Estoque' },
                { id: 'operator', label: 'Operador 3D', desc: 'Fila & Impressoras' },
                { id: 'sales', label: 'Vendas & CRM', desc: 'Orçamentos & Clientes' },
                { id: 'financial', label: 'Financeiro', desc: 'Custos & Precificação' },
                { id: 'viewer', label: 'Somente Leitura', desc: 'Auditoria & Visualização' },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoleChange(r.id as AppUserRole)}
                  className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                    role === r.id
                      ? 'bg-sky-500/20 border-sky-500/50 text-white shadow-sm'
                      : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="font-bold text-xs">{r.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Status do Usuário */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Status da Conta do Usuário
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                  status === 'active'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:bg-white/[0.05]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ativo</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('inactive')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                  status === 'inactive'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:bg-white/[0.05]'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Inativo</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('blocked')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                  status === 'blocked'
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                    : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:bg-white/[0.05]'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Bloqueado</span>
              </button>
            </div>
          </div>

          {/* Permissões Granulares por Módulo */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                Módulos do App Permitidos
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllPermissions}
                  className="text-[10px] text-emerald-400 hover:underline"
                >
                  Marcar Todos
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={clearAllPermissions}
                  className="text-[10px] text-slate-400 hover:underline"
                >
                  Desmarcar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SYSTEM_MODULE_PERMISSIONS.map((mod) => {
                const isChecked = permissions.includes('all') || permissions.includes(mod.key);
                return (
                  <button
                    key={mod.key}
                    type="button"
                    onClick={() => togglePermission(mod.key)}
                    className={`p-2 rounded-xl text-left border transition flex items-start gap-2.5 cursor-pointer ${
                      isChecked
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                        : 'bg-white/[0.01] border-white/[0.05] text-slate-400 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="mt-0.5 text-emerald-400">
                      {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-500" />}
                    </div>
                    <div>
                      <span className="font-semibold text-xs block leading-tight">{mod.label}</span>
                      <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                        {mod.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
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
              className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-sky-500/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Gravando...' : (userToEdit ? 'Salvar Alterações' : 'Criar Usuário')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
