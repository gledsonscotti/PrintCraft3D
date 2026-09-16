import React, { useState, useMemo } from 'react';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Filter,
  Trash2,
  Check,
  RotateCcw,
  Building,
  Tag,
  DollarSign,
  FileText,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  X
} from 'lucide-react';
import { FinancialAccount, FinancialAccountType, FinancialAccountStatus, FinancialAccountCategory } from '../types';

interface AccountsAgingProps {
  accounts: FinancialAccount[];
  loading: boolean;
  onRefresh: () => void;
  onAddAccount: (account: Partial<FinancialAccount>) => Promise<boolean>;
  onSettleAccount: (id: string, payment_date?: string, payment_method?: string) => Promise<boolean>;
  onReopenAccount: (id: string) => Promise<boolean>;
  onDeleteAccount: (id: string) => Promise<boolean>;
}

export function AccountsAging({
  accounts,
  loading,
  onRefresh,
  onAddAccount,
  onSettleAccount,
  onReopenAccount,
  onDeleteAccount,
}: AccountsAgingProps) {
  const [activeTypeTab, setActiveTypeTab] = useState<'all' | 'payable' | 'receivable'>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBucketFilter, setSelectedBucketFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formType, setFormType] = useState<FinancialAccountType>('payable');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<FinancialAccountCategory>('filament');
  const [formEntityName, setFormEntityName] = useState('');
  const [formDocRef, setFormDocRef] = useState('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDueDate, setFormDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formPaymentMethod, setFormPaymentMethod] = useState('PIX');
  const [formNotes, setFormNotes] = useState('');

  // Quick Settle Modal State
  const [settlingAccount, setSettlingAccount] = useState<FinancialAccount | null>(null);
  const [settleDate, setSettleDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [settleMethod, setSettleMethod] = useState<string>('PIX');
  const [isSettling, setIsSettling] = useState(false);

  // Today string for calculations
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute days difference: negative = overdue, 0 = today, positive = days ahead
  const getDaysDiff = (dueDate: string): number => {
    const dDue = new Date(dueDate + 'T00:00:00');
    const dToday = new Date(todayStr + 'T00:00:00');
    const diffTime = dDue.getTime() - dToday.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  // Classify into Aging Buckets
  const getBucketKey = (acc: FinancialAccount): string => {
    if (acc.status === 'paid') return 'paid';
    const diff = getDaysDiff(acc.due_date);
    if (diff < 0) {
      if (diff <= -30) return 'overdue_30plus';
      if (diff <= -16) return 'overdue_16_30';
      return 'overdue_1_15';
    }
    if (diff === 0) return 'due_today';
    if (diff <= 15) return 'due_1_15';
    if (diff <= 30) return 'due_16_30';
    return 'due_30plus';
  };

  // Filtered accounts list
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // Type Filter
      if (activeTypeTab !== 'all' && acc.type !== activeTypeTab) return false;

      // Status Filter
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'overdue') {
          if (acc.status !== 'overdue' && !(acc.status === 'pending' && acc.due_date < todayStr)) return false;
        } else if (selectedStatusFilter === 'pending') {
          if (acc.status !== 'pending' || acc.due_date < todayStr) return false;
        } else if (acc.status !== selectedStatusFilter) {
          return false;
        }
      }

      // Category Filter
      if (selectedCategoryFilter !== 'all' && acc.category !== selectedCategoryFilter) return false;

      // Bucket Filter
      if (selectedBucketFilter !== 'all') {
        const bucket = getBucketKey(acc);
        if (bucket !== selectedBucketFilter) return false;
      }

      // Search Term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesDesc = acc.description.toLowerCase().includes(term);
        const matchesEntity = acc.entity_name.toLowerCase().includes(term);
        const matchesDoc = (acc.document_ref || '').toLowerCase().includes(term);
        const matchesNotes = (acc.notes || '').toLowerCase().includes(term);
        if (!matchesDesc && !matchesEntity && !matchesDoc && !matchesNotes) return false;
      }

      return true;
    });
  }, [accounts, activeTypeTab, selectedStatusFilter, selectedCategoryFilter, selectedBucketFilter, searchTerm, todayStr]);

  // Totals calculations
  const totals = useMemo(() => {
    let totalPayablePending = 0;
    let totalPayableOverdue = 0;
    let totalPayablePaid = 0;

    let totalReceivablePending = 0;
    let totalReceivableOverdue = 0;
    let totalReceivablePaid = 0;

    accounts.forEach((acc) => {
      const amt = Number(acc.amount) || 0;
      const isOverdue = acc.status === 'overdue' || (acc.status === 'pending' && acc.due_date < todayStr);

      if (acc.type === 'payable') {
        if (acc.status === 'paid') {
          totalPayablePaid += amt;
        } else if (isOverdue) {
          totalPayableOverdue += amt;
        } else {
          totalPayablePending += amt;
        }
      } else {
        if (acc.status === 'paid') {
          totalReceivablePaid += amt;
        } else if (isOverdue) {
          totalReceivableOverdue += amt;
        } else {
          totalReceivablePending += amt;
        }
      }
    });

    const netPendingCashBalance = (totalReceivablePending + totalReceivableOverdue) - (totalPayablePending + totalPayableOverdue);

    return {
      totalPayablePending,
      totalPayableOverdue,
      totalPayablePaid,
      totalReceivablePending,
      totalReceivableOverdue,
      totalReceivablePaid,
      netPendingCashBalance,
    };
  }, [accounts, todayStr]);

  // Aging Summary Buckets
  const agingBuckets = useMemo(() => {
    const buckets = [
      { key: 'overdue_30plus', label: 'Vencido +30 dias', range: '< -30d', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
      { key: 'overdue_16_30', label: 'Vencido 16 a 30 dias', range: '-16 a -30d', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
      { key: 'overdue_1_15', label: 'Vencido 1 a 15 dias', range: '-1 a -15d', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
      { key: 'due_today', label: 'Vence Hoje', range: 'Hoje', color: 'text-amber-300 bg-amber-500/15 border-amber-500/40' },
      { key: 'due_1_15', label: 'A Vencer (1 a 15 dias)', range: '+1 a +15d', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
      { key: 'due_16_30', label: 'A Vencer (16 a 30 dias)', range: '+16 a +30d', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
      { key: 'due_30plus', label: 'A Vencer (+30 dias)', range: '> +30d', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
    ];

    return buckets.map((b) => {
      let payableAmt = 0;
      let receivableAmt = 0;
      let count = 0;

      accounts.forEach((acc) => {
        if (acc.status === 'paid') return;
        const bKey = getBucketKey(acc);
        if (bKey === b.key) {
          count++;
          if (acc.type === 'payable') payableAmt += Number(acc.amount) || 0;
          else receivableAmt += Number(acc.amount) || 0;
        }
      });

      return {
        ...b,
        payableAmt,
        receivableAmt,
        count,
      };
    });
  }, [accounts, todayStr]);

  const handleOpenAddModal = (type: FinancialAccountType = 'payable') => {
    setFormType(type);
    setFormDescription('');
    setFormCategory(type === 'payable' ? 'filament' : 'sale_client');
    setFormEntityName('');
    setFormDocRef('');
    setFormAmount('');
    setFormDueDate(new Date().toISOString().split('T')[0]);
    setFormPaymentMethod('PIX');
    setFormNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim()) {
      setFormError('Informe a descrição do lançamento.');
      return;
    }
    if (!formEntityName.trim()) {
      setFormError('Informe o favorecido ou cliente.');
      return;
    }
    const numAmt = parseFloat(formAmount.replace(',', '.'));
    if (isNaN(numAmt) || numAmt <= 0) {
      setFormError('Informe um valor válido maior que zero.');
      return;
    }
    if (!formDueDate) {
      setFormError('Informe a data de vencimento.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const success = await onAddAccount({
      type: formType,
      description: formDescription.trim(),
      category: formCategory,
      entity_name: formEntityName.trim(),
      document_ref: formDocRef.trim() || undefined,
      amount: numAmt,
      due_date: formDueDate,
      payment_method: formPaymentMethod,
      notes: formNotes.trim() || undefined,
      status: formDueDate < todayStr ? 'overdue' : 'pending',
    });

    setSubmitting(false);
    if (success) {
      setIsModalOpen(false);
    } else {
      setFormError('Erro ao registrar título no servidor.');
    }
  };

  const handleExecuteSettle = async () => {
    if (!settlingAccount) return;
    setIsSettling(true);
    const ok = await onSettleAccount(settlingAccount.id, settleDate, settleMethod);
    setIsSettling(false);
    if (ok) {
      setSettlingAccount(null);
    }
  };

  const getCategoryLabel = (cat: FinancialAccountCategory): string => {
    const map: Record<FinancialAccountCategory, string> = {
      filament: 'Filamentos / Carretéis',
      supply: 'Insumos / Componentes',
      maintenance: 'Peças & Manutenção',
      energy: 'Energia Elétrica',
      equipment: 'Máquinas & Ferramentas',
      rent_fixed: 'Aluguel & Custos Fixos',
      sale_client: 'Venda a Cliente / Encomenda',
      sale_marketplace: 'Repasse de Marketplace',
      consignment_settlement: 'Acerto de Consignação',
      services: 'Serviços Prestados',
      taxes: 'Impostos & Tarifas',
      other: 'Outros Lançamentos',
    };
    return map[cat] || cat;
  };

  return (
    <div className="space-y-6">
      {/* HEADER: TÍTULO, SUBTÍTULO E AÇÕES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141416] p-5 rounded-2xl border border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Aging List & Vencimentos
            </span>
            <span className="text-xs text-slate-400">Contas a Pagar & Receber</span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">Gestão de Vencimentos & Aging List da Oficina</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitore prazos de boletos de matéria-prima, recebíveis de marketplaces e acertos de clientes por faixa de vencimento.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenAddModal('payable')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-rose-400" />
            <span>+ Conta a Pagar</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddModal('receivable')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>+ Conta a Receber</span>
          </button>
        </div>
      </div>

      {/* CARDS INDICADORES LADO A LADO: PAGAR, RECEBER E SALDO PREVISTO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Contas a Pagar */}
        <div className="bg-[#141416] p-5 rounded-2xl border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <ArrowDownLeft className="w-4 h-4 text-rose-400" />
              Contas a Pagar Pendentes
            </span>
            {totals.totalPayableOverdue > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                {accounts.filter(a => a.type === 'payable' && (a.status === 'overdue' || (a.status === 'pending' && a.due_date < todayStr))).length} em atraso
              </span>
            )}
          </div>

          <div className="text-2xl font-black text-rose-400 mt-2">
            R$ {(totals.totalPayablePending + totals.totalPayableOverdue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>

          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Vencidas:{' '}
              <strong className="text-rose-400 font-semibold">
                R$ {totals.totalPayableOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>
            </span>
            <span className="text-slate-400">
              Já Pagas:{' '}
              <strong className="text-slate-300 font-semibold">
                R$ {totals.totalPayablePaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>
            </span>
          </div>
        </div>

        {/* Card Contas a Receber */}
        <div className="bg-[#141416] p-5 rounded-2xl border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              Contas a Receber Pendentes
            </span>
            {totals.totalReceivableOverdue > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {accounts.filter(a => a.type === 'receivable' && (a.status === 'overdue' || (a.status === 'pending' && a.due_date < todayStr))).length} a cobrar
              </span>
            )}
          </div>

          <div className="text-2xl font-black text-emerald-400 mt-2">
            R$ {(totals.totalReceivablePending + totals.totalReceivableOverdue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>

          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Vencidas a Cobrar:{' '}
              <strong className="text-amber-400 font-semibold">
                R$ {totals.totalReceivableOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>
            </span>
            <span className="text-slate-400">
              Já Recebidas:{' '}
              <strong className="text-slate-300 font-semibold">
                R$ {totals.totalReceivablePaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>
            </span>
          </div>
        </div>

        {/* Card Saldo Líquido Previsto */}
        <div className="bg-[#141416] p-5 rounded-2xl border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-sky-400" />
              Saldo Previsto de Compromissos
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              totals.netPendingCashBalance >= 0
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {totals.netPendingCashBalance >= 0 ? 'Superávit Previsto' : 'Déficit Previsto'}
            </span>
          </div>

          <div className={`text-2xl font-black mt-2 ${
            totals.netPendingCashBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {totals.netPendingCashBalance < 0 ? '- ' : '+ '}
            R$ {Math.abs(totals.netPendingCashBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>

          <div className="mt-3 pt-3 border-t border-white/[0.06] text-xs text-slate-400 flex items-center justify-between">
            <span>Previsão líquida de caixa</span>
            <span className="text-[11px] text-slate-500">Recebíveis vs Pagáveis</span>
          </div>
        </div>
      </div>

      {/* MATRIZ DE ENVELHECIMENTO / AGING BUCKETS INTERATIVO */}
      <div className="bg-[#141416] p-5 rounded-2xl border border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Aging List — Distribuição por Faixas de Vencimento
            </h3>
            <p className="text-xs text-slate-400">
              Clique em qualquer faixa para filtrar rapidamente as contas correspondentes na tabela abaixo.
            </p>
          </div>
          {selectedBucketFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedBucketFilter('all')}
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1 self-start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar filtro de faixa ({selectedBucketFilter})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
          {agingBuckets.map((bucket) => {
            const isSelected = selectedBucketFilter === bucket.key;
            return (
              <button
                key={bucket.key}
                type="button"
                onClick={() => setSelectedBucketFilter(isSelected ? 'all' : bucket.key)}
                className={`p-3 rounded-xl border text-left transition relative ${
                  isSelected
                    ? 'ring-2 ring-emerald-500 ' + bucket.color
                    : 'bg-[#1c1c20] hover:bg-white/[0.05] border-white/[0.08]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 truncate">{bucket.label}</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-white/[0.08] text-slate-400">
                    {bucket.count}
                  </span>
                </div>

                <div className="mt-2 space-y-0.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-rose-400">Pagar:</span>
                    <span className="font-semibold text-rose-300">
                      R$ {bucket.payableAmt.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400">Receber:</span>
                    <span className="font-semibold text-emerald-300">
                      R$ {bucket.receivableAmt.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* BARRA DE FILTROS E PESQUISA */}
      <div className="bg-[#141416] p-4 rounded-2xl border border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-3 flex-wrap">
        {/* Filtro por Tipo */}
        <div className="flex items-center gap-1.5 bg-[#1c1c20] p-1 rounded-xl border border-white/[0.06] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTypeTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTypeTab === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({accounts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTypeTab('payable')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTypeTab === 'payable'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
            Contas a Pagar ({accounts.filter(a => a.type === 'payable').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTypeTab('receivable')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTypeTab === 'receivable'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            Contas a Receber ({accounts.filter(a => a.type === 'receivable').length})
          </button>
        </div>

        {/* Filtros Dropdown e Busca */}
        <div className="flex items-center gap-2.5 flex-1 w-full md:w-auto justify-end flex-wrap">
          {/* Status */}
          <div className="flex items-center gap-1.5 bg-[#1c1c20] px-3 py-2 rounded-xl border border-white/[0.06] text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-[#1c1c20] text-white">Status: Todos</option>
              <option value="pending" className="bg-[#1c1c20] text-sky-400">Em Aberto (No Prazo)</option>
              <option value="overdue" className="bg-[#1c1c20] text-rose-400">Vencidos / Atrasados</option>
              <option value="paid" className="bg-[#1c1c20] text-emerald-400">Baixados / Pagos</option>
            </select>
          </div>

          {/* Categoria */}
          <div className="flex items-center gap-1.5 bg-[#1c1c20] px-3 py-2 rounded-xl border border-white/[0.06] text-xs">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-[#1c1c20] text-white">Categoria: Todas</option>
              <option value="filament" className="bg-[#1c1c20]">Filamentos</option>
              <option value="supply" className="bg-[#1c1c20]">Insumos & Montagem</option>
              <option value="energy" className="bg-[#1c1c20]">Energia Elétrica</option>
              <option value="maintenance" className="bg-[#1c1c20]">Manutenção / Peças</option>
              <option value="rent_fixed" className="bg-[#1c1c20]">Aluguel & Custos Fixos</option>
              <option value="sale_client" className="bg-[#1c1c20]">Vendas a Clientes</option>
              <option value="sale_marketplace" className="bg-[#1c1c20]">Marketplaces (Meli/Shopee)</option>
              <option value="consignment_settlement" className="bg-[#1c1c20]">Consignações</option>
              <option value="taxes" className="bg-[#1c1c20]">Impostos / Tarifas</option>
              <option value="other" className="bg-[#1c1c20]">Outros</option>
            </select>
          </div>

          {/* Busca por Texto */}
          <div className="flex items-center gap-2 bg-[#1c1c20] px-3 py-2 rounded-xl border border-white/[0.06] text-xs w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar favorecido, NF, descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-slate-200 placeholder-slate-500 outline-none w-full text-xs"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')} className="text-slate-500 hover:text-slate-300">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABELA DE CONTAS E VENCIMENTOS */}
      <div className="bg-[#141416] rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            Títulos Financeiros ({filteredAccounts.length} lançamentos encontrados)
          </span>
          <span className="text-[11px] text-slate-500">
            Aging List em tempo real • Clique em "Baixar" para liquidar
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs animate-pulse">
            Carregando aging list e vencimentos...
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3 text-slate-500">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">Nenhum lançamento encontrado</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Nenhuma conta a pagar ou receber corresponde aos filtros aplicados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 font-semibold text-[11px]">
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Descrição & Categoria</th>
                  <th className="py-3 px-4">Favorecido / Cliente</th>
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4">Vencimento & Aging</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredAccounts.map((acc) => {
                  const daysDiff = getDaysDiff(acc.due_date);
                  const isOverdue = acc.status === 'overdue' || (acc.status === 'pending' && daysDiff < 0);
                  const isPaid = acc.status === 'paid';

                  return (
                    <tr
                      key={acc.id}
                      className={`hover:bg-white/[0.02] transition ${
                        isOverdue && !isPaid ? 'bg-rose-500/[0.03]' : ''
                      }`}
                    >
                      {/* Tipo */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {acc.type === 'payable' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
                            A Pagar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                            A Receber
                          </span>
                        )}
                      </td>

                      {/* Descrição & Categoria */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white max-w-xs truncate">{acc.description}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-slate-500" />
                          <span>{getCategoryLabel(acc.category)}</span>
                        </div>
                      </td>

                      {/* Favorecido / Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[160px]">{acc.entity_name}</span>
                        </div>
                        {acc.payment_method && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Forma: {acc.payment_method}
                          </div>
                        )}
                      </td>

                      {/* Documento Ref */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 text-xs font-mono">
                        {acc.document_ref || '—'}
                      </td>

                      {/* Vencimento & Faixa Aging */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-200 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(acc.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        </div>

                        <div className="mt-1">
                          {isPaid ? (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Baixado {acc.payment_date ? `em ${new Date(acc.payment_date + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}
                            </span>
                          ) : isOverdue ? (
                            <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Vencido há {Math.abs(daysDiff)} {Math.abs(daysDiff) === 1 ? 'dia' : 'dias'}
                            </span>
                          ) : daysDiff === 0 ? (
                            <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Vence Hoje!
                            </span>
                          ) : (
                            <span className="text-[10px] text-sky-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Vence em {daysDiff} {daysDiff === 1 ? 'dia' : 'dias'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right font-extrabold text-sm">
                        <span className={acc.type === 'payable' ? 'text-rose-400' : 'text-emerald-400'}>
                          R$ {Number(acc.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Liquidado
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                            Atrasado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            Em Aberto
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSettlingAccount(acc);
                                setSettleDate(todayStr);
                                setSettleMethod(acc.payment_method || 'PIX');
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition flex items-center gap-1"
                              title={acc.type === 'payable' ? 'Efetuar Pagamento / Baixar' : 'Confirmar Recebimento / Baixar'}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Baixar</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onReopenAccount(acc.id)}
                              className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-white bg-[#1c1c20] hover:bg-white/[0.08] transition flex items-center gap-1 border border-white/[0.06]"
                              title="Reabrir título para em aberto"
                            >
                              <RotateCcw className="w-3 h-3 text-slate-400" />
                              <span>Reabrir</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Deseja realmente excluir "${acc.description}"?`)) {
                                onDeleteAccount(acc.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Excluir Lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: NOVO TÍTULO / CONTA A PAGAR OU RECEBER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141416] w-full max-w-lg rounded-2xl border border-white/[0.1] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className={`p-2 rounded-xl ${formType === 'payable' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {formType === 'payable' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {formType === 'payable' ? 'Nova Conta a Pagar' : 'Nova Conta a Receber'}
                </h3>
                <p className="text-xs text-slate-400">
                  Cadastre o título financeiro com data de vencimento para monitoramento no Aging List.
                </p>
              </div>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Seletor Tipo */}
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Tipo de Lançamento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormType('payable');
                      setFormCategory('filament');
                    }}
                    className={`p-2.5 rounded-xl font-bold flex items-center justify-center gap-2 border transition ${
                      formType === 'payable'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-[#1c1c20] text-slate-400 border-white/[0.06]'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4 text-rose-400" />
                    <span>Conta a Pagar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormType('receivable');
                      setFormCategory('sale_client');
                    }}
                    className={`p-2.5 rounded-xl font-bold flex items-center justify-center gap-2 border transition ${
                      formType === 'receivable'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-[#1c1c20] text-slate-400 border-white/[0.06]'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    <span>Conta a Receber</span>
                  </button>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Descrição do Título *</label>
                <input
                  type="text"
                  placeholder={formType === 'payable' ? 'Ex: Fatura Filamentos PLA 10kg Voolt3D' : 'Ex: Pedido Corporativo Troféus 3D'}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Grid 2 colunas: Favorecido e Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    {formType === 'payable' ? 'Fornecedor / Beneficiário *' : 'Cliente / Pagador *'}
                  </label>
                  <input
                    type="text"
                    placeholder={formType === 'payable' ? 'Ex: Voolt3D / Enel / 3D Fila' : 'Ex: Agência XYZ / Shopee'}
                    value={formEntityName}
                    onChange={(e) => setFormEntityName(e.target.value)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Categoria de Custo / Receita</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-emerald-500"
                  >
                    {formType === 'payable' ? (
                      <>
                        <option value="filament">Filamentos / Carretéis</option>
                        <option value="supply">Insumos (Argolas, Embalagens)</option>
                        <option value="energy">Energia Elétrica (Oficina)</option>
                        <option value="maintenance">Manutenção & Bicos / Hotends</option>
                        <option value="equipment">Aquisição de Impressoras / Máquinas</option>
                        <option value="rent_fixed">Aluguel & Custos Fixos</option>
                        <option value="taxes">Impostos / Tarifas Bancárias</option>
                        <option value="other">Outros Gastos</option>
                      </>
                    ) : (
                      <>
                        <option value="sale_client">Venda a Cliente (Direta / Pedido)</option>
                        <option value="sale_marketplace">Repasse Marketplace (Meli / Shopee)</option>
                        <option value="consignment_settlement">Acerto de Loja Consignada</option>
                        <option value="services">Serviço de Modelagem / Pintura 3D</option>
                        <option value="other">Outros Recebíveis</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Grid 2 colunas: Valor e Vencimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Valor do Título (R$) *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-emerald-500 font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Data de Vencimento *</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Grid 2 colunas: Documento Ref e Forma de Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Documento de Referência</label>
                  <input
                    type="text"
                    placeholder="Ex: NF 00123 / Boleto 891"
                    value={formDocRef}
                    onChange={(e) => setFormDocRef(e.target.value)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Meio Previsto</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="PIX">PIX (Chave / QR Code)</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Transferência Bancária">Transferência / TED</option>
                    <option value="Dinheiro">Dinheiro em Espécie</option>
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Observações Internas (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais para a gestão financeira..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-400 hover:text-white bg-[#1c1c20] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2.5 rounded-xl font-extrabold text-slate-950 transition ${
                    formType === 'payable'
                      ? 'bg-rose-400 hover:bg-rose-300'
                      : 'bg-emerald-400 hover:bg-emerald-300'
                  }`}
                >
                  {submitting ? 'Salvando...' : 'Cadastrar Título'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE BAIXA / LIQUIDAÇÃO RÁPIDA */}
      {settlingAccount && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141416] w-full max-w-md rounded-2xl border border-white/[0.1] shadow-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setSettlingAccount(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {settlingAccount.type === 'payable' ? 'Liquidar Pagamento' : 'Confirmar Recebimento'}
                </h3>
                <p className="text-xs text-slate-400">
                  Baixar título e confirmar movimentação realizada
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1c1c20] border border-white/[0.06] mb-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Título:</span>
                <span className="font-semibold text-white truncate max-w-[200px]">{settlingAccount.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{settlingAccount.type === 'payable' ? 'Favorecido:' : 'Cliente:'}</span>
                <span className="font-semibold text-slate-200">{settlingAccount.entity_name}</span>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t border-white/[0.06]">
                <span className="text-slate-300 font-bold">Valor:</span>
                <span className="font-black text-emerald-400">
                  R$ {Number(settlingAccount.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Data da Baixa / Pagamento</label>
                <input
                  type="date"
                  value={settleDate}
                  onChange={(e) => setSettleDate(e.target.value)}
                  className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Meio Efetivo de Liquidação</label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value)}
                  className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-emerald-500"
                >
                  <option value="PIX">PIX</option>
                  <option value="Boleto Bancário">Boleto Bancário</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Transferência Bancária">Transferência Bancária (TED/DOC)</option>
                  <option value="Dinheiro">Dinheiro em Espécie</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setSettlingAccount(null)}
                className="px-4 py-2.5 rounded-xl font-bold text-slate-400 hover:text-white bg-[#1c1c20] transition text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSettling}
                onClick={handleExecuteSettle}
                className="px-5 py-2.5 rounded-xl font-extrabold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-4 h-4" />
                <span>{isSettling ? 'Baixando...' : 'Confirmar Baixa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
