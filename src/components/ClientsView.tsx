import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Building2,
  User,
  Store,
  Phone,
  Mail,
  MapPin,
  Edit3,
  Trash2,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Shield
} from 'lucide-react';
import { Client, AppUser, Company } from '../types';
import { CompanyTeamView } from './CompanyTeamView';

interface ClientsViewProps {
  clients: Client[];
  onRefreshData: () => void;
  theme?: string;
  currentUser?: AppUser | null;
  currentCompany?: Company | null;
  isSuperadmin?: boolean;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  onRefreshData,
  theme = 'standard',
  currentUser,
  currentCompany,
  isSuperadmin = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'clients' | 'team'>('clients');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pf' | 'cnpj' | 'store'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [type, setType] = useState<'pf' | 'cnpj' | 'store'>('pf');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation State
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const handleOpenCreate = () => {
    setEditingClient(null);
    setName('');
    setType('pf');
    setDocument('');
    setPhone('');
    setEmail('');
    setAddress('');
    setErrorMsg('');
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setType(client.type || 'pf');
    setDocument(client.document || '');
    setPhone(client.phone || '');
    setEmail(client.email || '');
    setAddress(client.address || '');
    setErrorMsg('');
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('O nome do cliente é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        name: name.trim(),
        type,
        document: document.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim()
      };

      let res: Response;
      if (editingClient) {
        res = await fetch(`/api/clients/${editingClient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao salvar cliente.');
      }

      setSuccessMsg(editingClient ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
      onRefreshData();
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg('');
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir cliente.');
      setClientToDelete(null);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir.');
    }
  };

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.document && c.document.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(searchQuery));

    const matchesType = filterType === 'all' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  const pfCount = clients.filter((c) => c.type === 'pf').length;
  const cnpjCount = clients.filter((c) => c.type === 'cnpj').length;
  const storeCount = clients.filter((c) => c.type === 'store').length;

  return (
    <div className="space-y-6">
      {/* Top Sub-Navigation Tabs: Clientes vs Equipe */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2 p-1 bg-[#131316] border border-white/[0.08] rounded-xl shadow-xs">
          <button
            type="button"
            id="tab-sub-clients"
            onClick={() => setActiveSubTab('clients')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'clients'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes & Lojas</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
              activeSubTab === 'clients' ? 'bg-slate-950/20 text-slate-950' : 'bg-white/10 text-slate-300'
            }`}>
              {clients.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-sub-team"
            onClick={() => setActiveSubTab('team')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'team'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Equipe da Oficina</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'clients' ? (
        <>
          {/* Header & Stats Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#131316] border border-white/[0.08] p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Cadastro de Clientes & Lojas</h1>
              <p className="text-xs text-slate-400">
                Gerencie seus clientes, pessoas físicas, jurídicas e lojas parceiras de consignação.
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-sky-500/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      {/* Quick Metrics Bento Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#131316] border border-white/[0.08] p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium block">Total Cadastrados</span>
          <span className="text-xl font-bold text-white mt-0.5 block">{clients.length}</span>
        </div>
        <div className="bg-[#131316] border border-white/[0.08] p-3.5 rounded-xl">
          <span className="text-[11px] text-sky-400 font-medium flex items-center gap-1">
            <User className="w-3 h-3" /> Pessoas Físicas
          </span>
          <span className="text-xl font-bold text-white mt-0.5 block">{pfCount}</span>
        </div>
        <div className="bg-[#131316] border border-white/[0.08] p-3.5 rounded-xl">
          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <Building2 className="w-3 h-3" /> CNPJ / Empresas
          </span>
          <span className="text-xl font-bold text-white mt-0.5 block">{cnpjCount}</span>
        </div>
        <div className="bg-[#131316] border border-white/[0.08] p-3.5 rounded-xl">
          <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
            <Store className="w-3 h-3" /> Lojas Parceiras
          </span>
          <span className="text-xl font-bold text-white mt-0.5 block">{storeCount}</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#131316] border border-white/[0.08] p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, CPF/CNPJ, email ou telefone..."
            className="w-full bg-[#0A0A0B] border border-white/[0.08] rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 transition"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              filterType === 'all' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-white bg-[#0A0A0B]'
            }`}
          >
            Todos ({clients.length})
          </button>
          <button
            onClick={() => setFilterType('pf')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              filterType === 'pf' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-white bg-[#0A0A0B]'
            }`}
          >
            Pessoa Física ({pfCount})
          </button>
          <button
            onClick={() => setFilterType('cnpj')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              filterType === 'cnpj' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white bg-[#0A0A0B]'
            }`}
          >
            CNPJ ({cnpjCount})
          </button>
          <button
            onClick={() => setFilterType('store')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              filterType === 'store' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-white bg-[#0A0A0B]'
            }`}
          >
            Lojas ({storeCount})
          </button>
        </div>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div className="bg-[#131316] border border-white/[0.08] rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">Nenhum cliente encontrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || filterType !== 'all'
              ? 'Tente ajustar os filtros ou termo de busca.'
              : 'Comece cadastrando seu primeiro cliente ou loja parceira.'}
          </p>
          {!searchQuery && filterType === 'all' && (
            <button
              onClick={handleOpenCreate}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-sky-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-sky-400 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Cadastrar Cliente Agora
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const isStore = client.type === 'store';
            const isCnpj = client.type === 'cnpj';
            return (
              <div
                key={client.id}
                className="bg-[#131316] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-4 flex flex-col justify-between transition group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isStore
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : isCnpj
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}
                      >
                        {isStore ? <Store className="w-4 h-4" /> : isCnpj ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition line-clamp-1">
                          {client.name}
                        </h3>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold mt-0.5 ${
                            isStore
                              ? 'bg-amber-500/10 text-amber-400'
                              : isCnpj
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-sky-500/10 text-sky-400'
                          }`}
                        >
                          {isStore ? 'Loja Parceira' : isCnpj ? 'Pessoa Jurídica (CNPJ)' : 'Pessoa Física (PF)'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleOpenEdit(client)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition"
                        title="Editar Cliente"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setClientToDelete(client)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        title="Excluir Cliente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-white/[0.06] text-xs text-slate-300">
                    {client.document && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="font-mono">{client.document}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-start gap-2 text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{client.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500">
                  <span>Cadastrado em {new Date(client.created_at).toLocaleDateString('pt-BR')}</span>
                  <a
                    href={`https://wa.me/55${client.phone?.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`font-semibold hover:underline ${client.phone ? 'text-emerald-400' : 'text-slate-600 pointer-events-none'}`}
                  >
                    {client.phone ? 'WhatsApp ↗' : ''}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#131316] border border-white/[0.1] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">
                  {editingClient ? 'Editar Cliente / Loja' : 'Novo Cadastro de Cliente'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nome / Razão Social *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João Silva ou Geek Store Ltda"
                  className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tipo de Cadastro</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400 transition"
                  >
                    <option value="pf">Pessoa Física (CPF)</option>
                    <option value="cnpj">Pessoa Jurídica (CNPJ)</option>
                    <option value="store">Loja Parceira (Consignação)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {type === 'cnpj' || type === 'store' ? 'CNPJ' : 'CPF'} (Opcional)
                  </label>
                  <input
                    type="text"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    placeholder={type === 'pf' ? '000.000.000-00' : '00.000.000/0001-00'}
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400 transition font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Endereço Completo</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, bairro, cidade - UF, CEP"
                  className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400 transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-medium rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-sky-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#131316] border border-white/[0.1] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Cliente?</h3>
                <p className="text-xs text-slate-400">Esta ação removerá o cliente permanentemente.</p>
              </div>
            </div>

            <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-white font-medium">
              {clientToDelete.name}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-medium rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteClient(clientToDelete.id)}
                className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-rose-500/20"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      ) : (
        <CompanyTeamView
          companyId={currentCompany?.id || (isSuperadmin ? 'superadmin' : 'comp-1')}
          companyName={currentCompany?.trade_name || currentCompany?.name || (isSuperadmin ? 'Superadmin Console' : 'Oficina')}
          isSuperadmin={isSuperadmin}
          currentUser={currentUser}
          theme={theme}
        />
      )}
    </div>
  );
};
