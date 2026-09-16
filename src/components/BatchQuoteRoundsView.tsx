import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  CreditCard,
  Send,
  ExternalLink,
  Copy,
  Mail,
  MessageSquare,
  Award,
  ChevronRight,
  TrendingDown,
  FileText,
  Trash2,
  Edit3,
  X,
  Users,
  Check,
  Building2,
  Printer,
  Eye,
  DollarSign
} from 'lucide-react';
import { QuoteRound, QuoteRoundItem, QuoteRoundSupplier, QuoteProposal, Supplier, Filament, Supply } from '../types';
import { SupplierQuotePortal } from './SupplierQuotePortal';

interface BatchQuoteRoundsViewProps {
  suppliers: Supplier[];
  filaments: Filament[];
  supplies: Supply[];
  onPurchasesUpdated?: () => void;
  theme?: string;
}

export const BatchQuoteRoundsView: React.FC<BatchQuoteRoundsViewProps> = ({
  suppliers,
  filaments,
  supplies,
  onPurchasesUpdated,
  theme = 'standard',
}) => {
  const [rounds, setRounds] = useState<QuoteRound[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active views / modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRoundForAnalysis, setSelectedRoundForAnalysis] = useState<QuoteRound | null>(null);
  const [selectedRoundForLinks, setSelectedRoundForLinks] = useState<QuoteRound | null>(null);
  const [activeSimulationToken, setActiveSimulationToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [awardingProposal, setAwardingProposal] = useState<string | null>(null);

  // New Round Form State
  const [roundTitle, setRoundTitle] = useState('');
  const [roundDesc, setRoundDesc] = useState('');
  const [roundDeadline, setRoundDeadline] = useState(() => {
    // Default 5 days in the future at 18:00
    const d = new Date();
    d.setDate(d.getDate() + 5);
    d.setHours(18, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  const [roundItems, setRoundItems] = useState<QuoteRoundItem[]>([
    {
      id: 'item-1',
      name: '',
      item_type: 'filament',
      quantity: 5,
      unit: 'carretéis',
      target_price: 0,
      notes: ''
    }
  ]);

  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);

  // Fetch rounds
  const fetchRounds = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quote-rounds');
      if (res.ok) {
        const data = await res.json();
        setRounds(data);

        // If currently viewing analysis of a round, update it with fresh data
        if (selectedRoundForAnalysis) {
          const updated = data.find((r: QuoteRound) => r.id === selectedRoundForAnalysis.id);
          if (updated) setSelectedRoundForAnalysis(updated);
        }
      }
    } catch (err) {
      console.error('Error fetching quote rounds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
  }, []);

  // Pre-select all suppliers when opening modal
  const handleOpenCreateModal = () => {
    setRoundTitle(`Cotação de Suprimentos - ${new Date().toLocaleDateString('pt-BR', { month: 'long' })}`);
    setRoundDesc('Solicitação de cotação de insumos para reposição do estoque da oficina. Gentileza informar preços unitários, disponibilidade, condições de parcelamento e frete.');
    setSelectedSupplierIds(suppliers.slice(0, 4).map((s) => s.id));
    setRoundItems([
      {
        id: `item-${Date.now()}-1`,
        name: filaments[0]?.name ? `${filaments[0].name} (${filaments[0].brand})` : 'Filamento PLA 1kg 1.75mm',
        item_type: 'filament',
        quantity: 5,
        unit: 'carretéis',
        target_price: filaments[0]?.cost_per_spool || 85,
        notes: 'Carretel com tolerância ±0.02mm, compatível com AMS'
      }
    ]);
    setIsCreateModalOpen(true);
  };

  const handleAddItem = (type: 'filament' | 'supply' | 'other' = 'filament') => {
    setRoundItems([
      ...roundItems,
      {
        id: `item-${Date.now()}-${roundItems.length + 1}`,
        name: '',
        item_type: type,
        quantity: type === 'filament' ? 5 : 100,
        unit: type === 'filament' ? 'carretéis' : 'unidades',
        target_price: 0,
        notes: ''
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (roundItems.length <= 1) return;
    setRoundItems(roundItems.filter((_, idx) => idx !== index));
  };

  const handleSelectFilamentPreset = (index: number, filId: string) => {
    const fil = filaments.find((f) => f.id === filId);
    if (!fil) return;
    const updated = [...roundItems];
    updated[index] = {
      ...updated[index],
      name: `${fil.name} - ${fil.color_name || fil.color} (${fil.brand})`,
      item_type: 'filament',
      unit: 'carretéis',
      target_price: fil.cost_per_spool || 0,
      notes: `Filamento ${fil.material_type} 1.75mm`
    };
    setRoundItems(updated);
  };

  const handleSelectSupplyPreset = (index: number, supId: string) => {
    const sup = supplies.find((s) => s.id === supId);
    if (!sup) return;
    const updated = [...roundItems];
    updated[index] = {
      ...updated[index],
      name: sup.name,
      item_type: 'supply',
      unit: sup.unit || 'unidades',
      target_price: sup.unit_cost || 0,
      notes: sup.category ? `Categoria: ${sup.category}` : ''
    };
    setRoundItems(updated);
  };

  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roundTitle.trim()) {
      alert('Informe o título da rodada de cotação.');
      return;
    }

    const validItems = roundItems.filter((it) => it.name.trim().length > 0);
    if (validItems.length === 0) {
      alert('Adicione pelo menos um item com nome e quantidade para cotar.');
      return;
    }

    if (selectedSupplierIds.length === 0) {
      alert('Selecione pelo menos um fornecedor para participar da cotação.');
      return;
    }

    const invitedSuppliers = suppliers.filter((s) => selectedSupplierIds.includes(s.id));

    try {
      const res = await fetch('/api/quote-rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: roundTitle,
          description: roundDesc,
          deadline: new Date(roundDeadline).toISOString(),
          items: validItems,
          suppliers: invitedSuppliers
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao criar rodada');
      }

      const data = await res.json();
      setIsCreateModalOpen(false);
      fetchRounds();
      setFeedback({ type: 'success', text: 'Rodada de cotação criada com sucesso! Os links exclusivos foram gerados.' });

      // Automatically open links modal for easy distribution
      if (data.round) {
        setSelectedRoundForLinks(data.round);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar cotação');
    }
  };

  const handleDeleteRound = async (id: string, title: string) => {
    if (!confirm(`Deseja realmente excluir a rodada de cotação "${title}" e todas as suas propostas?`)) return;

    try {
      const res = await fetch(`/api/quote-rounds/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchRounds();
        setFeedback({ type: 'success', text: 'Rodada excluída com sucesso.' });
        if (selectedRoundForAnalysis?.id === id) setSelectedRoundForAnalysis(null);
        if (selectedRoundForLinks?.id === id) setSelectedRoundForLinks(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyLink = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}?quote_token=${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleSendEmailMailto = (round: QuoteRound, sup: QuoteRoundSupplier) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}?quote_token=${sup.access_token}`;

    const itemsSummary = round.items.map((it, idx) => `  ${idx + 1}. ${it.quantity} ${it.unit || 'un'} - ${it.name}`).join('\n');
    const deadlineStr = new Date(round.deadline).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

    const subject = encodeURIComponent(`[Cotação de Compras] Solicitação de Cotação de Materiais - ${round.title}`);
    const body = encodeURIComponent(
      `Olá, ${sup.supplier_name}!\n\n` +
      `Estamos realizando uma rodada de cotação para aquisição dos seguintes materiais para nossa oficina:\n\n` +
      `${itemsSummary}\n\n` +
      `Por favor, acesse nosso portal de cotação pelo link seguro abaixo para informar seus preços unitários, disponibilidade, opções de parcelamento e frete:\n\n` +
      `👉 LINK DE RESPOSTA DA COTAÇÃO:\n${fullUrl}\n\n` +
      `📅 Data limite para envio da proposta: ${deadlineStr}\n\n` +
      `Contamos com a sua participação e ficamos à disposição para quaisquer dúvidas.\n\n` +
      `Atenciosamente,\nSetor de Suprimentos e Compras`
    );

    const email = sup.supplier_email || '';
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handleSendWhatsApp = (round: QuoteRound, sup: QuoteRoundSupplier) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}?quote_token=${sup.access_token}`;
    const deadlineStr = new Date(round.deadline).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

    const text = encodeURIComponent(
      `Olá, *${sup.supplier_name}*! Tudo bem?\n\n` +
      `Estamos cotando suprimentos para nossa oficina (*${round.title}*).\n\n` +
      `Você pode acessar nosso portal para preencher seus valores, parcelamento e frete pelo link:\n` +
      `👉 ${fullUrl}\n\n` +
      `⏰ Prazo limite: ${deadlineStr}\n` +
      `Agradecemos a parceria!`
    );

    const cleanPhone = (sup.supplier_phone || '').replace(/\D/g, '');
    const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  // Award winning proposal
  const handleAwardProposal = async (roundId: string, proposalId: string, supplierName: string) => {
    if (!confirm(`Confirmar a aprovação da proposta de "${supplierName}" como vencedora desta cotação? Os itens cotados serão lançados automaticamente no histórico de compras da oficina.`)) return;

    setAwardingProposal(proposalId);
    try {
      const res = await fetch(`/api/quote-rounds/${roundId}/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: proposalId,
          create_purchases: true
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Falha ao aprovar proposta');
      }

      const data = await res.json();
      setFeedback({
        type: 'success',
        text: `Proposta de "${supplierName}" aprovada com sucesso! ${data.created_purchases?.length || 0} itens foram adicionados às compras da oficina.`
      });

      fetchRounds();
      if (onPurchasesUpdated) onPurchasesUpdated();
    } catch (err: any) {
      alert(err.message || 'Erro ao aprovar proposta');
    } finally {
      setAwardingProposal(null);
    }
  };

  // Render supplier portal simulation if active
  if (activeSimulationToken) {
    return (
      <SupplierQuotePortal
        token={activeSimulationToken}
        isSimulated={true}
        onBack={() => {
          setActiveSimulationToken(null);
          fetchRounds();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with Action Button */}
      <div className="bg-[#131316] border border-white/[0.08] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-bold rounded-full uppercase tracking-wider">
              Cotações em Lote (RFP)
            </span>
            <span className="text-xs text-slate-400">
              {rounds.length} rodada(s) registrada(s)
            </span>
          </div>
          <h2 className="text-lg font-bold text-white">
            Cotação de Conjunto de Itens com Seleção de Fornecedores
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Crie requisições de compras coletivas, convide fornecedores homologados por e-mail/WhatsApp com link seguro exclusivo. Os fornecedores preenchem preços, opções de parcelamento ("quantas vezes"), frete e prazos diretamente no portal.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition shadow-md cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Nova Cotação de Conjunto
        </button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-4 rounded-xl text-sm flex items-center justify-between gap-3 border ${
          feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quote Rounds List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 space-y-3">
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Carregando cotações em lote...</p>
        </div>
      ) : rounds.length === 0 ? (
        <div className="bg-[#131316] border border-dashed border-white/[0.1] rounded-2xl p-10 text-center space-y-4">
          <Package className="w-12 h-12 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Nenhuma Cotação em Lote Criada</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Inicie uma nova rodada selecionando um lote de filamentos ou insumos e convide seus fornecedores para informarem seus valores e condições de pagamento.
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Criar Primeira Cotação
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {rounds.map((round) => {
            const isClosed = round.status === 'closed' || round.status === 'awarded' || new Date() > new Date(round.deadline);
            const isAwarded = round.status === 'awarded';
            const proposalsCount = round.proposals_count || (round.proposals || []).length;
            const suppliersCount = round.invited_suppliers.length;

            return (
              <div
                key={round.id}
                className={`bg-[#131316] border rounded-2xl p-5 transition space-y-4 shadow-sm hover:border-amber-500/40 ${
                  isAwarded ? 'border-emerald-500/40' : 'border-white/[0.08]'
                }`}
              >
                {/* Round Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider border ${
                        isAwarded
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : isClosed
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                          : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                      }`}>
                        {isAwarded ? 'Vencedor Aprovado' : isClosed ? 'Prazo Encerrado' : 'Cotação Aberta'}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Limite: {new Date(round.deadline).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {round.title}
                    </h3>
                    {round.description && (
                      <p className="text-xs text-slate-400 line-clamp-1">{round.description}</p>
                    )}
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setSelectedRoundForAnalysis(round)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-xl transition cursor-pointer"
                      title="Ver tabela comparativa com todos os fornecedores lado a lado"
                    >
                      <TrendingDown className="w-4 h-4" />
                      Análise de Resultados ({proposalsCount})
                    </button>

                    <button
                      onClick={() => setSelectedRoundForLinks(round)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1c20] hover:bg-white/10 text-slate-300 border border-white/[0.08] text-xs font-medium rounded-xl transition cursor-pointer"
                      title="Copiar links ou enviar por e-mail/WhatsApp aos fornecedores"
                    >
                      <Send className="w-3.5 h-3.5 text-amber-400" />
                      Links & Convites ({suppliersCount})
                    </button>

                    <button
                      onClick={() => handleDeleteRound(round.id, round.title)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 bg-[#1c1c20] hover:bg-white/10 rounded-xl transition cursor-pointer"
                      title="Excluir Cotação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Items & Suppliers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Items list */}
                  <div className="bg-[#0c0c0e] p-3.5 rounded-xl border border-white/[0.04] space-y-2">
                    <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-amber-400" />
                        Itens Solicitados ({round.items.length})
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {round.items.map((item, idx) => (
                        <div key={item.id || idx} className="flex justify-between items-center text-slate-300 border-b border-white/[0.02] pb-1">
                          <span className="font-medium text-white truncate max-w-[200px]" title={item.name}>
                            {idx + 1}. {item.name}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {item.quantity} {item.unit || 'un'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suppliers response status */}
                  <div className="bg-[#0c0c0e] p-3.5 rounded-xl border border-white/[0.04] space-y-2">
                    <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        Fornecedores Convidados ({round.invited_suppliers.length})
                      </span>
                      <span className="text-emerald-400 font-bold">
                        {proposalsCount} responderam
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {round.invited_suppliers.map((sup) => {
                        const proposal = (round.proposals || []).find((p) => p.supplier_id === sup.supplier_id);
                        const isWinner = proposal?.is_winner;

                        return (
                          <div key={sup.supplier_id} className="flex justify-between items-center text-slate-300">
                            <span className="font-medium truncate max-w-[180px] flex items-center gap-1.5">
                              {isWinner && <Award className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                              <span className={isWinner ? 'text-amber-300 font-bold' : 'text-slate-200'}>
                                {sup.supplier_name}
                              </span>
                            </span>

                            <div className="flex items-center gap-2">
                              {proposal ? (
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  R$ {Number(proposal.total_quote).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-medium rounded-full">
                                  Pendente
                                </span>
                              )}

                              <button
                                onClick={() => setActiveSimulationToken(sup.access_token)}
                                className="text-[10px] text-slate-400 hover:text-amber-300 underline cursor-pointer"
                                title="Acessar como Fornecedor"
                              >
                                Preencher
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: CRIAR NOVA RODADA ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#131316] border border-white/[0.08] w-full max-w-3xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2">
                <Package className="w-6 h-6 text-amber-400" />
                <h2 className="text-xl font-bold text-white">Nova Cotação de Conjunto de Itens (RFP)</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRound} className="space-y-5">
              {/* Title & Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Título / Identificação da Cotação: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={roundTitle}
                    onChange={(e) => setRoundTitle(e.target.value)}
                    placeholder="Ex: Compra Mensal de Filamentos & Embalagens - Outubro"
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Data e Hora Limite: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={roundDeadline}
                    onChange={(e) => setRoundDeadline(e.target.value)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Instruções aos Fornecedores (visível no portal deles):
                  </label>
                  <textarea
                    rows={2}
                    value={roundDesc}
                    onChange={(e) => setRoundDesc(e.target.value)}
                    placeholder="Especificações técnicas, tolerâncias, formato de entrega esperado..."
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-400" />
                    Itens que serão cotados ({roundItems.length})
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddItem('filament')}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 rounded-lg text-xs font-medium transition cursor-pointer"
                    >
                      + Filamento
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddItem('supply')}
                      className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-lg text-xs font-medium transition cursor-pointer"
                    >
                      + Insumo / Peça
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddItem('other')}
                      className="px-2.5 py-1 bg-[#1c1c20] hover:bg-white/10 text-slate-300 border border-white/[0.06] rounded-lg text-xs font-medium transition cursor-pointer"
                    >
                      + Item Avulso
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {roundItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="bg-[#1c1c20] border border-white/[0.06] p-3 rounded-xl space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-amber-400 text-[11px]">Item #{idx + 1}</span>

                        {/* Presets from catalog */}
                        <div className="flex items-center gap-2">
                          {item.item_type === 'filament' && filaments.length > 0 && (
                            <select
                              onChange={(e) => handleSelectFilamentPreset(idx, e.target.value)}
                              defaultValue=""
                              className="bg-[#131316] text-slate-300 text-[11px] px-2 py-1 rounded border border-white/[0.06] focus:outline-none"
                            >
                              <option value="" disabled>Puxar do Catálogo de Filamentos...</option>
                              {filaments.map((f) => (
                                <option key={f.id} value={f.id}>{f.name} - {f.brand}</option>
                              ))}
                            </select>
                          )}

                          {item.item_type === 'supply' && supplies.length > 0 && (
                            <select
                              onChange={(e) => handleSelectSupplyPreset(idx, e.target.value)}
                              defaultValue=""
                              className="bg-[#131316] text-slate-300 text-[11px] px-2 py-1 rounded border border-white/[0.06] focus:outline-none"
                            >
                              <option value="" disabled>Puxar do Estoque de Insumos...</option>
                              {supplies.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={roundItems.length <= 1}
                            className="text-slate-500 hover:text-rose-400 disabled:opacity-30 cursor-pointer"
                            title="Remover Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            required
                            placeholder="Descrição completa do item (ex: PLA Preto 1kg)"
                            value={item.name}
                            onChange={(e) => {
                              const updated = [...roundItems];
                              updated[idx].name = e.target.value;
                              setRoundItems(updated);
                            }}
                            className="w-full bg-[#131316] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              required
                              placeholder="Qtd"
                              value={item.quantity}
                              onChange={(e) => {
                                const updated = [...roundItems];
                                updated[idx].quantity = parseFloat(e.target.value) || 1;
                                setRoundItems(updated);
                              }}
                              className="w-20 bg-[#131316] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                            />
                            <input
                              type="text"
                              placeholder="Unidade (carretel, un)"
                              value={item.unit}
                              onChange={(e) => {
                                const updated = [...roundItems];
                                updated[idx].unit = e.target.value;
                                setRoundItems(updated);
                              }}
                              className="w-full bg-[#131316] border border-white/[0.06] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                            />
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            placeholder="Obs técnica (AMS, PEI...)"
                            value={item.notes || ''}
                            onChange={(e) => {
                              const updated = [...roundItems];
                              updated[idx].notes = e.target.value;
                              setRoundItems(updated);
                            }}
                            className="w-full bg-[#131316] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suppliers Selection Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-400" />
                    Fornecedores que receberão o link ({selectedSupplierIds.length} de {suppliers.length})
                  </label>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedSupplierIds(suppliers.map((s) => s.id))}
                      className="text-amber-400 hover:underline cursor-pointer"
                    >
                      Marcar Todos
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedSupplierIds([])}
                      className="text-slate-400 hover:underline cursor-pointer"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {suppliers.map((sup) => {
                    const isSelected = selectedSupplierIds.includes(sup.id);
                    return (
                      <label
                        key={sup.id}
                        className={`flex items-start gap-3 p-2.5 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/40 text-white'
                            : 'bg-[#1c1c20] border-white/[0.04] text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSupplierIds([...selectedSupplierIds, sup.id]);
                            } else {
                              setSelectedSupplierIds(selectedSupplierIds.filter((id) => id !== sup.id));
                            }
                          }}
                          className="w-4 h-4 mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                        />
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-bold text-xs text-white truncate">{sup.name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>{sup.category}</span>
                            {sup.email && <span>• {sup.email}</span>}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-[#1c1c20] hover:bg-white/10 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition cursor-pointer"
                >
                  Criar Rodada & Gerar Links de Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: LINKS & CONVITES DOS FORNECEDORES ================= */}
      {selectedRoundForLinks && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#131316] border border-white/[0.08] w-full max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Links Exclusivos de Participação</span>
                <h2 className="text-lg font-bold text-white">{selectedRoundForLinks.title}</h2>
              </div>
              <button
                onClick={() => setSelectedRoundForLinks(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Cada fornecedor convidado possui um <strong>token de acesso individual e seguro</strong>. Ao acessar o link, o fornecedor visualiza a lista dos materiais e preenche valores, parcelamento e frete sem precisar de senha.
            </p>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {selectedRoundForLinks.invited_suppliers.map((sup) => {
                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                const linkUrl = `${origin}?quote_token=${sup.access_token}`;
                const isCopied = copiedToken === sup.access_token;
                const proposal = (selectedRoundForLinks.proposals || []).find((p) => p.supplier_id === sup.supplier_id);

                return (
                  <div
                    key={sup.supplier_id}
                    className="bg-[#1c1c20] border border-white/[0.06] p-4 rounded-2xl space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-amber-400" />
                          {sup.supplier_name}
                          {proposal && (
                            <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-300 text-[10px] font-bold rounded-full">
                              Já respondeu (R$ {Number(proposal.total_quote).toFixed(2)})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {sup.supplier_email || 'Sem e-mail cadastrado'} • {sup.supplier_phone || 'Sem telefone'}
                        </div>
                      </div>

                      {/* Simulation button */}
                      <button
                        onClick={() => {
                          setSelectedRoundForLinks(null);
                          setActiveSimulationToken(sup.access_token);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 rounded-lg text-xs font-semibold transition cursor-pointer"
                        title="Simular visualização do fornecedor"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Simular / Preencher
                      </button>
                    </div>

                    {/* URL box with Copy button */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={linkUrl}
                        className="flex-1 bg-[#131316] border border-white/[0.06] rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none select-all"
                      />
                      <button
                        onClick={() => handleCopyLink(sup.access_token)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copiar Link
                          </>
                        )}
                      </button>
                    </div>

                    {/* Send buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleSendEmailMailto(selectedRoundForLinks, sup)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#131316] hover:bg-white/10 text-slate-200 border border-white/[0.06] rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        Abrir E-mail Pré-formatado
                      </button>

                      <button
                        onClick={() => handleSendWhatsApp(selectedRoundForLinks, sup)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        Enviar por WhatsApp
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL / PAINEL: TABELA DE ANÁLISE COMPARATIVA DE RESULTADOS ================= */}
      {selectedRoundForAnalysis && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#131316] border border-white/[0.1] w-full max-w-5xl rounded-3xl p-5 sm:p-8 space-y-6 shadow-2xl my-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-bold rounded-full uppercase tracking-wider">
                    Matriz de Decisão de Compras
                  </span>
                  <span className="text-xs text-slate-400">
                    Limite: {new Date(selectedRoundForAnalysis.deadline).toLocaleString('pt-BR', { dateStyle: 'short' })}
                  </span>
                </div>
                <h2 className="text-xl font-black text-white">
                  Tabela de Análise de Resultados: {selectedRoundForAnalysis.title}
                </h2>
                <p className="text-xs text-slate-400">
                  Comparativo lado a lado dos preços cotados por cada fornecedor, custo de frete, prazos e condições de parcelamento.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1c20] hover:bg-white/10 text-slate-300 border border-white/[0.08] text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Análise
                </button>
                <button
                  onClick={() => setSelectedRoundForAnalysis(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Check if any proposals received */}
            {(!selectedRoundForAnalysis.proposals || selectedRoundForAnalysis.proposals.length === 0) ? (
              <div className="bg-[#1c1c20] border border-dashed border-white/[0.08] rounded-2xl p-8 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                <h3 className="text-base font-bold text-white">Nenhum Fornecedor Respondeu Ainda</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Os fornecedores convidados ainda não enviaram suas propostas. Você pode enviar os links de convite ou simular o preenchimento agora mesmo.
                </p>
                <button
                  onClick={() => {
                    const firstSup = selectedRoundForAnalysis.invited_suppliers[0];
                    if (firstSup) setActiveSimulationToken(firstSup.access_token);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Preencher Cotação Manualmente
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. COMPARATIVE MATRIX TABLE */}
                <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0c0c0e]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#1c1c20] text-slate-300 font-bold border-b border-white/[0.08]">
                        <th className="py-3.5 px-4 min-w-[200px] text-white">
                          Item Solicitado / Quantidade
                        </th>
                        {selectedRoundForAnalysis.proposals.map((prop) => (
                          <th key={prop.id} className="py-3.5 px-4 min-w-[220px] border-l border-white/[0.06]">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-sm">{prop.supplier_name}</span>
                              {prop.is_winner && (
                                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                                  <Award className="w-3 h-3" /> Vencedor
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-normal text-slate-400 block mt-0.5">
                              Enviado: {new Date(prop.submitted_at).toLocaleDateString('pt-BR')}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/[0.04]">
                      {/* Rows for each requested item */}
                      {selectedRoundForAnalysis.items.map((item) => {
                        // Find lowest available price for this item
                        let minPrice = Infinity;
                        selectedRoundForAnalysis.proposals?.forEach((p) => {
                          const pItem = p.items.find((it) => it.item_id === item.id);
                          if (pItem && pItem.available && Number(pItem.unit_price) > 0) {
                            if (pItem.unit_price < minPrice) minPrice = pItem.unit_price;
                          }
                        });

                        return (
                          <tr key={item.id} className="hover:bg-white/[0.02] transition">
                            {/* Item Name & Specs */}
                            <td className="py-3 px-4 align-top">
                              <div className="font-bold text-white">{item.name}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Qtd: <strong className="text-amber-300">{item.quantity} {item.unit}</strong>
                                {item.notes && <span className="text-slate-500 italic block">({item.notes})</span>}
                              </div>
                            </td>

                            {/* Proposals values for this item */}
                            {selectedRoundForAnalysis.proposals?.map((prop) => {
                              const pItem = prop.items.find((it) => it.item_id === item.id);
                              const isLowest = pItem && pItem.available && pItem.unit_price === minPrice && minPrice < Infinity;

                              return (
                                <td key={prop.id} className="py-3 px-4 align-top border-l border-white/[0.06]">
                                  {pItem && pItem.available && Number(pItem.unit_price) > 0 ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-white text-sm">
                                          R$ {Number(pItem.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                          <span className="text-[10px] text-slate-500 font-normal"> /un</span>
                                        </span>
                                        {isLowest && (
                                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black rounded uppercase">
                                            Menor Preço
                                          </span>
                                        )}
                                      </div>

                                      <div className="text-[11px] text-slate-400">
                                        Total: <strong className="text-slate-200">
                                          R$ {(Number(pItem.unit_price) * Number(item.quantity)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </strong>
                                      </div>

                                      {pItem.brand_model && (
                                        <div className="text-[10px] text-amber-300/80 font-medium">
                                          Oferta: {pItem.brand_model}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-slate-500 italic text-[11px]">
                                      Não cotado / Sem estoque
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {/* SUMMARY ROWS: SUBTOTAL, FRETE, PRAZO, PARCELAMENTO, TOTAL */}
                      {/* Subtotal */}
                      <tr className="bg-[#1c1c20]/60 font-semibold border-t-2 border-white/[0.08]">
                        <td className="py-3 px-4 text-slate-300">
                          Subtotal dos Produtos
                        </td>
                        {selectedRoundForAnalysis.proposals?.map((prop) => (
                          <td key={prop.id} className="py-3 px-4 border-l border-white/[0.06] text-white font-bold">
                            R$ {Number(prop.subtotal_items).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        ))}
                      </tr>

                      {/* Frete / Transportadora */}
                      <tr className="bg-[#1c1c20]/40">
                        <td className="py-3 px-4 text-slate-300 flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-amber-400" />
                          Frete / Transportadora
                        </td>
                        {selectedRoundForAnalysis.proposals?.map((prop) => (
                          <td key={prop.id} className="py-3 px-4 border-l border-white/[0.06]">
                            <div className="font-bold text-white">
                              {prop.shipping_type === 'free' || prop.shipping_cost === 0 ? (
                                <span className="text-emerald-400 font-bold">Frete Grátis (CIF)</span>
                              ) : (
                                `R$ ${Number(prop.shipping_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              )}
                            </div>
                            {prop.carrier_name && (
                              <span className="text-[10px] text-slate-400 block">{prop.carrier_name}</span>
                            )}
                          </td>
                        ))}
                      </tr>

                      {/* Prazo de Entrega */}
                      <tr className="bg-[#1c1c20]/40">
                        <td className="py-2.5 px-4 text-slate-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                          Prazo de Entrega Estimado
                        </td>
                        {selectedRoundForAnalysis.proposals?.map((prop) => (
                          <td key={prop.id} className="py-2.5 px-4 border-l border-white/[0.06] text-slate-200">
                            <strong>{prop.delivery_lead_days} dias úteis</strong>
                          </td>
                        ))}
                      </tr>

                      {/* Condições de Parcelamento ("Quantas Vezes") */}
                      <tr className="bg-[#1c1c20]/40">
                        <td className="py-3 px-4 text-slate-300 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                          Parcelamento ("Quantas Vezes")
                        </td>
                        {selectedRoundForAnalysis.proposals?.map((prop) => (
                          <td key={prop.id} className="py-3 px-4 border-l border-white/[0.06]">
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-bold rounded-lg inline-block">
                              {prop.installments_count}x ({prop.payment_terms || 'À combinar'})
                            </span>
                            {prop.installments_details && (
                              <span className="text-[11px] text-slate-400 block mt-1">
                                {prop.installments_details}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>

                      {/* VALOR TOTAL GERAL */}
                      <tr className="bg-emerald-500/10 border-t-2 border-emerald-500/30">
                        <td className="py-4 px-4 font-black text-white text-sm">
                          VALOR TOTAL DA COTAÇÃO (Itens + Frete)
                        </td>
                        {selectedRoundForAnalysis.proposals?.map((prop) => {
                          // Find lowest grand total
                          const minGrandTotal = Math.min(...(selectedRoundForAnalysis.proposals?.map((p) => Number(p.total_quote)) || [0]));
                          const isBestTotal = Number(prop.total_quote) === minGrandTotal;

                          return (
                            <td key={prop.id} className="py-4 px-4 border-l border-white/[0.06]">
                              <div className="flex items-baseline gap-2">
                                <span className={`text-lg font-black ${isBestTotal ? 'text-emerald-400' : 'text-white'}`}>
                                  R$ {Number(prop.total_quote).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                {isBestTotal && (
                                  <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 font-black text-[10px] rounded uppercase">
                                    Melhor Preço
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      {/* AÇÃO: APROVAR FORNECEDOR VENCEDOR */}
                      <tr className="bg-[#1c1c20]">
                        <td className="py-3.5 px-4 font-bold text-slate-300">
                          Aprovação de Compra
                        </td>
                        {selectedRoundForAnalysis.proposals?.map((prop) => (
                          <td key={prop.id} className="py-3.5 px-4 border-l border-white/[0.06]">
                            {prop.is_winner ? (
                              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                                <CheckCircle2 className="w-4 h-4" />
                                Fornecedor Vencedor Aprovado
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAwardProposal(selectedRoundForAnalysis.id, prop.id, prop.supplier_name)}
                                disabled={awardingProposal === prop.id}
                                className="w-full px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Award className="w-3.5 h-3.5" />
                                {awardingProposal === prop.id ? 'Aprovando...' : 'Aprovar Vencedor'}
                              </button>
                            )}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2. DECISION INTELLIGENCE SUMMARY CARD */}
                <div className="bg-[#1c1c20] border border-white/[0.08] p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                      <Award className="w-4 h-4" />
                      Recomendação de Compra da Oficina
                    </span>
                    <p className="text-slate-300 leading-relaxed max-w-xl">
                      Ao clicar em <strong>"Aprovar Vencedor"</strong>, o sistema oficializa a cotação, registra a proposta escolhida e gera automaticamente as ordens de compra correspondentes no histórico de entradas de estoque com os prazos combinados.
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedRoundForAnalysis(null)}
                    className="px-5 py-2.5 bg-[#131316] hover:bg-white/10 text-white font-bold rounded-xl border border-white/[0.08] transition cursor-pointer"
                  >
                    Fechar Análise
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
