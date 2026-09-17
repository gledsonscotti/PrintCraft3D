import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Package,
  Phone,
  Mail,
  Globe,
  Building2,
  User,
  Plus,
  Search,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Edit3,
  Trash2,
  X,
  Star,
  Tag,
  Boxes,
  ExternalLink,
  ShoppingCart,
  AlertCircle,
  TrendingDown,
  ArrowRight,
  MessageSquare,
  FileText,
  Send
} from 'lucide-react';
import { Supplier, SupplierQuote, MaterialPurchase, Filament, Supply } from '../types';
import { BatchQuoteRoundsView } from './BatchQuoteRoundsView';

interface SuppliersViewProps {
  filaments: Filament[];
  supplies: Supply[];
  onRefreshData?: () => void;
  theme?: string;
  initialSection?: 'suppliers' | 'purchases' | 'quotes' | 'batch_quotes';
  mode?: 'all' | 'directory_only' | 'procurement_only';
  onNavigateToQuotes?: () => void;
  onNavigateToSettings?: (subTab?: string) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  filaments,
  supplies,
  onRefreshData,
  theme = 'standard',
  initialSection = 'suppliers',
  mode = 'all',
  onNavigateToQuotes,
  onNavigateToSettings,
}) => {
  const [activeSection, setActiveSection] = useState<'suppliers' | 'purchases' | 'quotes' | 'batch_quotes'>(
    mode === 'directory_only' ? 'suppliers' : mode === 'procurement_only' ? (initialSection === 'suppliers' ? 'batch_quotes' : initialSection) : initialSection
  );

  useEffect(() => {
    if (mode === 'directory_only') {
      setActiveSection('suppliers');
    } else if (mode === 'procurement_only' && initialSection === 'suppliers') {
      setActiveSection('batch_quotes');
    } else if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection, mode]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [purchases, setPurchases] = useState<MaterialPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<string>('all');

  // Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact_name: '',
    cnpj_cpf: '',
    phone: '',
    email: '',
    website: '',
    category: 'Filamentos',
    address: '',
    lead_time_days: 3,
    payment_terms: '',
    notes: '',
    rating: 5,
  });

  // Purchase Modal (Entrada no Estoque)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    supplier: '',
    item_type: 'filament' as 'filament' | 'supply' | 'other',
    item_id: '',
    item_name: '',
    quantity: 1,
    unit: 'carretel',
    unit_cost: 0,
    total_cost: 0,
    purchase_date: new Date().toISOString().split('T')[0],
    payment_method: 'PIX',
    notes: '',
    update_stock: true,
  });

  // Quote Modal
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<SupplierQuote | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    supplier_id: '',
    supplier_name: '',
    item_type: 'filament' as 'filament' | 'supply' | 'other',
    item_id: '',
    item_name: '',
    unit_price: 0,
    unit: 'carretel',
    moq: 1,
    shipping_cost: 0,
    lead_time_days: 3,
    valid_until: '',
    status: 'active' as 'active' | 'approved' | 'rejected' | 'expired',
    notes: '',
  });

  // Converting quote
  const [convertingQuoteId, setConvertingQuoteId] = useState<string | null>(null);
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState<Supplier | null>(null);

  // Status/Error feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'supplier' | 'quote' | 'purchase'; id: string; name: string } | null>(null);

  const fetchSuppliersData = async () => {
    setLoading(true);
    try {
      const [supRes, quotesRes, purRes] = await Promise.all([
        fetch('/api/suppliers').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/supplier-quotes').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/material-purchases').then((r) => (r.ok ? r.json() : [])),
      ]);
      setSuppliers(Array.isArray(supRes) ? supRes : []);
      setQuotes(Array.isArray(quotesRes) ? quotesRes : []);
      setPurchases(Array.isArray(purRes) ? purRes : []);
    } catch (e) {
      console.error('Error fetching suppliers data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliersData();
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Supplier Form Handlers
  const handleOpenCreateSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({
      name: '',
      contact_name: '',
      cnpj_cpf: '',
      phone: '',
      email: '',
      website: '',
      category: 'Filamentos',
      address: '',
      lead_time_days: 3,
      payment_terms: '',
      notes: '',
      rating: 5,
    });
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupplierForm({
      name: sup.name,
      contact_name: sup.contact_name || '',
      cnpj_cpf: sup.cnpj_cpf || '',
      phone: sup.phone || '',
      email: sup.email || '',
      website: sup.website || '',
      category: sup.category || 'Filamentos',
      address: sup.address || '',
      lead_time_days: sup.lead_time_days || 3,
      payment_terms: sup.payment_terms || '',
      notes: sup.notes || '',
      rating: sup.rating || 5,
    });
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      showFeedback('Nome do fornecedor é obrigatório.', 'error');
      return;
    }

    try {
      if (editingSupplier) {
        const res = await fetch(`/api/suppliers/${editingSupplier.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(supplierForm),
        });
        if (!res.ok) throw new Error('Falha ao atualizar fornecedor');
        showFeedback(`Fornecedor "${supplierForm.name}" atualizado com sucesso!`);
      } else {
        const res = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(supplierForm),
        });
        if (!res.ok) throw new Error('Falha ao cadastrar fornecedor');
        showFeedback(`Fornecedor "${supplierForm.name}" cadastrado com sucesso!`);
      }
      setIsSupplierModalOpen(false);
      fetchSuppliersData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || 'Erro ao salvar fornecedor', 'error');
    }
  };

  // Purchase Form Handlers (Entrada no Estoque)
  const handleOpenCreatePurchase = (prefillSupplier?: string) => {
    const defaultSup = prefillSupplier || (suppliers.length > 0 ? suppliers[0].name : '');
    setPurchaseForm({
      supplier: defaultSup,
      item_type: 'filament',
      item_id: filaments[0]?.id || '',
      item_name: filaments[0]?.name ? `${filaments[0].name} (${filaments[0].brand || ''})` : '',
      quantity: 1,
      unit: 'carretel',
      unit_cost: filaments[0]?.cost_per_spool || 89.9,
      total_cost: filaments[0]?.cost_per_spool || 89.9,
      purchase_date: new Date().toISOString().split('T')[0],
      payment_method: 'PIX',
      notes: '',
      update_stock: true,
    });
    setIsPurchaseModalOpen(true);
  };

  const handleItemSelectInPurchase = (type: 'filament' | 'supply' | 'other', id: string) => {
    if (type === 'filament') {
      const fil = filaments.find((f) => f.id === id);
      if (fil) {
        const uCost = Number(fil.cost_per_spool) || 0;
        setPurchaseForm((prev) => ({
          ...prev,
          item_type: 'filament',
          item_id: fil.id,
          item_name: `${fil.name} - ${fil.brand} (${fil.material})`,
          unit: 'carretel',
          unit_cost: uCost,
          total_cost: (Number(prev.quantity) || 1) * uCost,
        }));
      }
    } else if (type === 'supply') {
      const sup = supplies.find((s) => s.id === id);
      if (sup) {
        const uCost = Number(sup.unit_cost) || 0;
        setPurchaseForm((prev) => ({
          ...prev,
          item_type: 'supply',
          item_id: sup.id,
          item_name: sup.name,
          unit: sup.unit || 'un',
          unit_cost: uCost,
          total_cost: (Number(prev.quantity) || 1) * uCost,
        }));
      }
    } else {
      setPurchaseForm((prev) => ({
        ...prev,
        item_type: 'other',
        item_id: '',
        unit: 'un',
      }));
    }
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.item_name.trim() || Number(purchaseForm.quantity) <= 0) {
      showFeedback('Informe o item e uma quantidade válida.', 'error');
      return;
    }

    try {
      const payload = {
        ...purchaseForm,
        total_cost: Number(purchaseForm.total_cost) > 0 ? Number(purchaseForm.total_cost) : Number(purchaseForm.quantity) * Number(purchaseForm.unit_cost),
      };

      const res = await fetch('/api/material-purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Falha ao registrar aquisição');
      showFeedback(
        `Aquisição de "${purchaseForm.item_name}" registrada! ${
          purchaseForm.update_stock ? 'Estoque atualizado com sucesso.' : ''
        }`
      );
      setIsPurchaseModalOpen(false);
      fetchSuppliersData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || 'Erro ao registrar aquisição', 'error');
    }
  };

  // Quote Form Handlers
  const handleOpenCreateQuote = (prefillSupplierId?: string) => {
    setEditingQuote(null);
    const selectedSup = suppliers.find((s) => s.id === prefillSupplierId) || suppliers[0];
    setQuoteForm({
      supplier_id: selectedSup?.id || '',
      supplier_name: selectedSup?.name || '',
      item_type: 'filament',
      item_id: filaments[0]?.id || '',
      item_name: filaments[0]?.name ? `${filaments[0].name} (${filaments[0].brand || ''})` : '',
      unit_price: filaments[0]?.cost_per_spool || 85.0,
      unit: 'carretel',
      moq: 1,
      shipping_cost: 0,
      lead_time_days: selectedSup?.lead_time_days || 3,
      valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'active',
      notes: '',
    });
    setIsQuoteModalOpen(true);
  };

  const handleOpenEditQuote = (quote: SupplierQuote) => {
    setEditingQuote(quote);
    setQuoteForm({
      supplier_id: quote.supplier_id,
      supplier_name: quote.supplier_name,
      item_type: quote.item_type,
      item_id: quote.item_id || '',
      item_name: quote.item_name,
      unit_price: quote.unit_price,
      unit: quote.unit,
      moq: quote.moq || 1,
      shipping_cost: quote.shipping_cost || 0,
      lead_time_days: quote.lead_time_days || 3,
      valid_until: quote.valid_until || '',
      status: quote.status,
      notes: quote.notes || '',
    });
    setIsQuoteModalOpen(true);
  };

  const handleItemSelectInQuote = (type: 'filament' | 'supply' | 'other', id: string) => {
    if (type === 'filament') {
      const fil = filaments.find((f) => f.id === id);
      if (fil) {
        setQuoteForm((prev) => ({
          ...prev,
          item_type: 'filament',
          item_id: fil.id,
          item_name: `${fil.name} - ${fil.brand} (${fil.material})`,
          unit: 'carretel',
          unit_price: Number(fil.cost_per_spool) || 85,
        }));
      }
    } else if (type === 'supply') {
      const sup = supplies.find((s) => s.id === id);
      if (sup) {
        setQuoteForm((prev) => ({
          ...prev,
          item_type: 'supply',
          item_id: sup.id,
          item_name: sup.name,
          unit: sup.unit || 'un',
          unit_price: Number(sup.unit_cost) || 0.5,
        }));
      }
    } else {
      setQuoteForm((prev) => ({
        ...prev,
        item_type: 'other',
        item_id: '',
        unit: 'un',
      }));
    }
  };

  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteForm.supplier_name || !quoteForm.item_name.trim() || Number(quoteForm.unit_price) <= 0) {
      showFeedback('Fornecedor, item e preço válido são obrigatórios.', 'error');
      return;
    }

    try {
      if (editingQuote) {
        const res = await fetch(`/api/supplier-quotes/${editingQuote.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(quoteForm),
        });
        if (!res.ok) throw new Error('Falha ao atualizar cotação');
        showFeedback(`Cotação para "${quoteForm.item_name}" atualizada!`);
      } else {
        const res = await fetch('/api/supplier-quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(quoteForm),
        });
        if (!res.ok) throw new Error('Falha ao registrar cotação');
        showFeedback(`Cotação para "${quoteForm.item_name}" registrada com sucesso!`);
      }
      setIsQuoteModalOpen(false);
      fetchSuppliersData();
    } catch (err: any) {
      showFeedback(err.message || 'Erro ao salvar cotação', 'error');
    }
  };

  // Convert Quote to Purchase & Update Inventory
  const handleConvertToPurchase = async (quote: SupplierQuote) => {
    setConvertingQuoteId(quote.id);
    try {
      const res = await fetch(`/api/supplier-quotes/${quote.id}/convert-to-purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: quote.moq || 1,
          update_stock: true,
          payment_method: 'PIX',
        }),
      });

      if (!res.ok) throw new Error('Falha ao converter cotação em compra');
      showFeedback(`Cotação convertida em compra! Entrada no estoque efetuada.`);
      fetchSuppliersData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || 'Erro ao converter cotação', 'error');
    } finally {
      setConvertingQuoteId(null);
    }
  };

  // Delete Handlers
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      let endpoint = '';
      if (itemToDelete.type === 'supplier') endpoint = `/api/suppliers/${itemToDelete.id}`;
      else if (itemToDelete.type === 'quote') endpoint = `/api/supplier-quotes/${itemToDelete.id}`;
      else if (itemToDelete.type === 'purchase') endpoint = `/api/material-purchases/${itemToDelete.id}`;

      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir item');
      showFeedback(`${itemToDelete.name} excluído com sucesso!`);
      setItemToDelete(null);
      fetchSuppliersData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || 'Erro ao excluir', 'error');
    }
  };

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((sup) => {
      const matchesSearch =
        sup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sup.contact_name && sup.contact_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (sup.email && sup.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (sup.phone && sup.phone.includes(searchQuery));
      const matchesCategory = categoryFilter === 'all' || sup.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [suppliers, searchQuery, categoryFilter]);

  // Filtered Quotes
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const matchesSearch =
        q.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.supplier_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = quoteStatusFilter === 'all' || q.status === quoteStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchQuery, quoteStatusFilter]);

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      return (
        p.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.supplier && p.supplier.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [purchases, searchQuery]);

  // Summary Metrics
  const totalPurchasesAmount = useMemo(() => {
    return purchases.reduce((sum, p) => sum + Number(p.total_cost || 0), 0);
  }, [purchases]);

  const activeQuotesCount = useMemo(() => {
    return quotes.filter((q) => q.status === 'active' || q.status === 'approved').length;
  }, [quotes]);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-950/40 text-rose-300 border-rose-500/40'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ================= HEADER: DIRECTORY ONLY MODE ================= */}
      {mode === 'directory_only' ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131316] border border-white/[0.08] p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Cadastro de Fornecedores
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {suppliers.length} Cadastrado(s)
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Catálogo comercial de parceiros, dados fiscais, contatos de compras e canais de atendimento direto.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToQuotes && (
              <button
                type="button"
                onClick={onNavigateToQuotes}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1c1c20] hover:bg-white/[0.06] text-sky-300 border border-sky-500/30 font-bold text-xs rounded-xl transition cursor-pointer"
                title="Abrir Central de Cotações em Lote e RFP"
              >
                <Send className="w-3.5 h-3.5 text-sky-400" />
                <span>Central de Cotações</span>
              </button>
            )}

            <button
              type="button"
              id="btn-new-supplier-top"
              onClick={handleOpenCreateSupplier}
              className="integration-btn-primary flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-sky-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Fornecedor</span>
            </button>
          </div>
        </div>
      ) : mode === 'procurement_only' ? (
        /* Header limpo para economizar espaço e manter consistência com o tema */
        null
      ) : (
        /* ================= HEADER: ALL / FULL MODE ================= */
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#131316] border border-white/[0.08] p-5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                Gestão de Fornecedores & Insumos
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Compras & Estoque
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Contatos de compras, histórico de aquisições de insumos e cotações vinculadas ao estoque de filamentos e peças.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-batch-quotes-top"
              onClick={() => setActiveSection('batch_quotes')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeSection === 'batch_quotes'
                  ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/20'
                  : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30'
              }`}
              title="Acessar rodadas de cotação em lote e envio automatizado de links aos fornecedores"
            >
              <Send className="w-3.5 h-3.5 text-sky-400" />
              <span>Cotações em Lote (RFP)</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-400/25 text-sky-300">Novo</span>
            </button>

            <button
              type="button"
              id="btn-new-supplier-top"
              onClick={handleOpenCreateSupplier}
              className="integration-btn-primary flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-sky-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Fornecedor</span>
            </button>
          </div>
        </div>
      )}

      {/* Bento Metrics Bar (Ocultado em directory_only e procurement_only para despoluir a tela) */}
      {mode !== 'directory_only' && mode !== 'procurement_only' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#131316] border border-white/[0.08] p-3.5 rounded-xl">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Building2 className="w-3 h-3 text-sky-400" /> Fornecedores Ativos
            </span>
            <span className="text-xl font-bold text-white mt-0.5 block">{suppliers.length}</span>
          </div>

          <div className="bg-[#131316] border border-white/[0.08] p-3.5 rounded-xl">
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Aquisições Registradas
            </span>
            <span className="text-xl font-bold text-white mt-0.5 block">
              R$ {totalPurchasesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-[#131316] border border-white/[0.08] p-3.5 rounded-xl">
            <span className="text-[11px] text-sky-400 font-medium flex items-center gap-1">
              <Tag className="w-3 h-3" /> Cotações Ativas
            </span>
            <span className="text-xl font-bold text-white mt-0.5 block">{activeQuotesCount}</span>
          </div>

          <div className="bg-[#131316] border border-white/[0.08] p-3.5 rounded-xl">
            <span className="text-[11px] text-purple-400 font-medium flex items-center gap-1">
              <Boxes className="w-3 h-3" /> Itens no Catálogo
            </span>
            <span className="text-xl font-bold text-white mt-0.5 block">
              {filaments.length + supplies.length} insumos
            </span>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs inside Fornecedores / Cotações */}
      {mode === 'directory_only' ? (
        /* In directory_only, show direct search & filter bar without redundant tabs */
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#131316] border border-white/[0.08] p-3 rounded-xl">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
            <span className="text-slate-400 font-medium text-xs mr-1">Categoria:</span>
            {['all', 'Filamentos', 'Insumos & Fixação', 'Embalagens', 'Peças & Hotends', 'Resinas', 'Outros'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition cursor-pointer text-xs ${
                  categoryFilter === cat
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                    : 'bg-[#1c1c20] text-slate-400 hover:text-white border border-white/[0.06]'
                }`}
              >
                {cat === 'all' ? 'Todas' : cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar fornecedor, CNPJ ou contato..."
              className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 transition"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2 p-1 bg-[#131316] rounded-xl border border-white/[0.08] suppliers-subtabs-container">
            {mode !== 'procurement_only' && (
              <button
                type="button"
                id="sub-tab-suppliers-list"
                onClick={() => setActiveSection('suppliers')}
                className={`suppliers-subtab-btn flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeSection === 'suppliers'
                    ? 'suppliers-subtab-active bg-sky-500 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Contatos & Fornecedores</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/15 text-white">{suppliers.length}</span>
              </button>
            )}

            <button
              type="button"
              id="sub-tab-batch-quotes"
              onClick={() => setActiveSection('batch_quotes')}
              className={`suppliers-subtab-btn flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeSection === 'batch_quotes'
                  ? 'suppliers-subtab-active bg-sky-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Cotações em Lote (RFP)</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-400/20 text-sky-300">Novo</span>
            </button>

            <button
              type="button"
              id="sub-tab-quotes-matrix"
              onClick={() => setActiveSection('quotes')}
              className={`suppliers-subtab-btn flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeSection === 'quotes'
                  ? 'suppliers-subtab-active bg-sky-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Cotações por Item</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/15 text-white">{quotes.length}</span>
            </button>

            {mode !== 'procurement_only' && (
              <button
                type="button"
                id="sub-tab-purchases-history"
                onClick={() => setActiveSection('purchases')}
                className={`suppliers-subtab-btn flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeSection === 'purchases'
                    ? 'suppliers-subtab-active bg-sky-500 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Histórico de Aquisições</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/15 text-white">{purchases.length}</span>
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeSection === 'suppliers'
                  ? 'Buscar fornecedor ou contato...'
                  : activeSection === 'purchases'
                  ? 'Buscar no histórico de compras...'
                  : 'Buscar cotação de insumo...'
              }
              className="w-full bg-[#131316] border border-white/[0.08] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
          </div>
        </div>
      )}

      {/* ================= SECTION 1: FORNECEDORES & CONTATOS DE COMPRAS ================= */}
      {activeSection === 'suppliers' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-medium">Categoria:</span>
            {['all', 'Filamentos', 'Insumos & Fixação', 'Embalagens', 'Peças & Hotends', 'Resinas', 'Outros'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-[#131316] text-slate-400 hover:text-white border border-white/[0.06]'
                }`}
              >
                {cat === 'all' ? 'Todas' : cat}
              </button>
            ))}
          </div>

          {/* Suppliers Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map((sup) => {
              const supPurchases = purchases.filter((p) => p.supplier === sup.name);
              const supQuotes = quotes.filter((q) => q.supplier_id === sup.id || q.supplier_name === sup.name);
              const totalSpentWithSup = supPurchases.reduce((sum, p) => sum + Number(p.total_cost || 0), 0);

              return (
                <div
                  key={sup.id}
                  className="bg-[#131316] border border-white/[0.08] hover:border-amber-500/30 p-5 rounded-2xl flex flex-col justify-between transition group shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 inline-block mb-1">
                          {sup.category || 'Geral'}
                        </span>
                        <h2 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                          {sup.name}
                        </h2>
                        {sup.contact_name && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                            <User className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>Contato: <strong className="text-slate-300">{sup.contact_name}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Rating Stars */}
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < (sup.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Contact details */}
                    <div className="space-y-1.5 text-xs text-slate-400 bg-[#0c0c0e] p-3 rounded-xl border border-white/[0.04]">
                      {sup.phone && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>{sup.phone}</span>
                          </div>
                          {/* Direct WhatsApp link if phone available */}
                          <a
                            href={`https://wa.me/55${sup.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                            title="Conversar no WhatsApp de Compras"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      )}

                      {sup.email && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <Mail className="w-3 h-3 text-sky-400 shrink-0" />
                            <span className="truncate">{sup.email}</span>
                          </div>
                          <a
                            href={`mailto:${sup.email}?subject=Cotação de Insumos para Oficina 3D`}
                            className="text-[10px] text-sky-400 hover:text-sky-300 font-bold shrink-0"
                          >
                            Enviar E-mail
                          </a>
                        </div>
                      )}

                      {sup.cnpj_cpf && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span>CNPJ/CPF: {sup.cnpj_cpf}</span>
                        </div>
                      )}

                      {sup.address && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate">
                          <span className="truncate">📍 {sup.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Commercial Terms & Lead Time */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="bg-[#1c1c20] p-2 rounded-lg border border-white/[0.04]">
                        <span className="text-slate-500 block">Prazo Médio:</span>
                        <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {sup.lead_time_days || 3} dias úteis
                        </span>
                      </div>
                      <div className="bg-[#1c1c20] p-2 rounded-lg border border-white/[0.04]">
                        <span className="text-slate-500 block">Total Comprado:</span>
                        <span className="font-bold text-emerald-400 block mt-0.5">
                          R$ {totalSpentWithSup.toFixed(2)} ({supPurchases.length})
                        </span>
                      </div>
                    </div>

                    {sup.payment_terms && (
                      <p className="text-[11px] text-slate-400 bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg">
                        <strong className="text-amber-300">Condições:</strong> {sup.payment_terms}
                      </p>
                    )}

                    {sup.notes && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 italic">
                        "{sup.notes}"
                      </p>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between mt-3 gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenCreatePurchase(sup.name)}
                        className="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                        title="Registrar Compra / Entrada no Estoque"
                      >
                        <ShoppingCart className="w-3 h-3 text-emerald-400" />
                        <span>Comprar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenCreateQuote(sup.id)}
                        className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                        title="Registrar Cotação de Preço"
                      >
                        <Tag className="w-3 h-3 text-amber-400" />
                        <span>Cotar</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {sup.website && (
                        <a
                          href={sup.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-white bg-[#1c1c20] hover:bg-white/10 rounded-lg transition"
                          title="Visitar Loja / Site"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEditSupplier(sup)}
                        className="p-1.5 text-slate-400 hover:text-amber-300 bg-[#1c1c20] hover:bg-white/10 rounded-lg transition cursor-pointer"
                        title="Editar Fornecedor"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemToDelete({ type: 'supplier', id: sup.id, name: sup.name })}
                        className="p-1.5 text-slate-400 hover:text-rose-400 bg-[#1c1c20] hover:bg-white/10 rounded-lg transition cursor-pointer"
                        title="Excluir Fornecedor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredSuppliers.length === 0 && (
              <div className="col-span-full bg-[#131316] border border-dashed border-white/[0.1] rounded-2xl p-8 text-center space-y-3">
                <Truck className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">Nenhum fornecedor encontrado com os filtros atuais.</p>
                <button
                  onClick={handleOpenCreateSupplier}
                  className="px-4 py-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cadastrar Primeiro Fornecedor
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= SECTION 2: HISTÓRICO DE AQUISIÇÕES (ENTRADA NO ESTOQUE) ================= */}
      {activeSection === 'purchases' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#131316] p-4 rounded-xl border border-white/[0.08]">
            <div className="text-xs text-slate-300">
              <span>Histórico de compras de insumos e matérias-primas com entrada automática no estoque físico.</span>
            </div>
            <button
              type="button"
              onClick={() => handleOpenCreatePurchase()}
              className="flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Nova Compra / Entrada</span>
            </button>
          </div>

          <div className="bg-[#131316] rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1c1c20] text-slate-400 font-bold border-b border-white/[0.06]">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Item / Insumo</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4 text-center">Qtd.</th>
                    <th className="py-3 px-4 text-right">Custo Unit.</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4">Pagamento</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredPurchases.map((purchase) => {
                    const isFilament = purchase.item_type === 'filament';
                    const isSupply = purchase.item_type === 'supply';

                    return (
                      <tr key={purchase.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                          {purchase.purchase_date}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{purchase.item_name}</span>
                          </div>
                          {purchase.notes && (
                            <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                              {purchase.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isFilament
                                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                                : isSupply
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-500/15 text-slate-300 border border-slate-500/30'
                            }`}
                          >
                            {isFilament ? 'Filamento' : isSupply ? 'Insumo' : 'Geral'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-medium">
                          {purchase.supplier || 'Não informado'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-white">
                          {purchase.quantity} {purchase.unit}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300">
                          R$ {Number(purchase.unit_cost || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-400">
                          R$ {Number(purchase.total_cost || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/[0.06] text-slate-300">
                            {purchase.payment_method || 'PIX'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setItemToDelete({ type: 'purchase', id: purchase.id, name: purchase.item_name })}
                            className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                            title="Remover Registro de Compra"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredPurchases.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-500">
                        Nenhuma aquisição encontrada no histórico.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION 3: COTAÇÕES POR ITEM & COMPARADOR ================= */}
      {activeSection === 'quotes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#131316] p-4 rounded-xl border border-white/[0.08]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Filtrar por Status:</span>
              {(['all', 'active', 'approved', 'rejected', 'expired'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setQuoteStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    quoteStatusFilter === st
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                      : 'bg-[#1c1c20] text-slate-400 hover:text-white border border-white/[0.04]'
                  }`}
                >
                  {st === 'all'
                    ? 'Todas'
                    : st === 'active'
                    ? 'Em Aberto / Válida'
                    : st === 'approved'
                    ? 'Aprovada / Comprada'
                    : st === 'rejected'
                    ? 'Recusada'
                    : 'Expirada'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleOpenCreateQuote()}
              className="integration-btn-primary flex items-center justify-center gap-2 px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Cotação por Item</span>
            </button>
          </div>

          <div className="bg-[#131316] rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1c1c20] text-slate-400 font-bold border-b border-white/[0.06]">
                    <th className="py-3 px-4">Item / Insumo</th>
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4 text-right">Preço Cotado</th>
                    <th className="py-3 px-4 text-center">Pedido Mín.</th>
                    <th className="py-3 px-4 text-right">Frete</th>
                    <th className="py-3 px-4 text-center">Prazo</th>
                    <th className="py-3 px-4">Validade</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredQuotes.map((quote) => {
                    const isApproved = quote.status === 'approved';
                    const isActive = quote.status === 'active';
                    const isRejected = quote.status === 'rejected';
                    const isConverting = convertingQuoteId === quote.id;

                    return (
                      <tr key={quote.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{quote.item_name}</span>
                          </div>
                          {quote.notes && (
                            <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                              {quote.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-300">
                          {quote.supplier_name}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-white">
                          R$ {Number(quote.unit_price || 0).toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/{quote.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-300">
                          {quote.moq || 1} {quote.unit}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400">
                          {Number(quote.shipping_cost || 0) === 0 ? (
                            <span className="text-emerald-400 font-bold text-[10px]">Grátis</span>
                          ) : (
                            `R$ ${Number(quote.shipping_cost).toFixed(2)}`
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-300">
                          {quote.lead_time_days || 3}d
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                          {quote.valid_until ? quote.valid_until : 'Sem validade'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isApproved
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : isActive
                                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                : isRejected
                                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                : 'bg-slate-500/15 text-slate-300 border border-slate-500/30'
                            }`}
                          >
                            {isApproved ? 'Comprada' : isActive ? 'Ativa' : isRejected ? 'Recusada' : 'Expirada'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Convert to purchase button */}
                            {!isApproved && (
                              <button
                                type="button"
                                onClick={() => handleConvertToPurchase(quote)}
                                disabled={isConverting}
                                className="integration-btn-primary px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Converter em compra e dar entrada no estoque físico"
                              >
                                <ShoppingCart className="w-3 h-3" />
                                <span>{isConverting ? 'Salvando...' : 'Comprar'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenEditQuote(quote)}
                              className="p-1.5 text-slate-400 hover:text-sky-300 transition cursor-pointer"
                              title="Editar Cotação"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setItemToDelete({ type: 'quote', id: quote.id, name: `Cotação de ${quote.item_name}` })}
                              className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                              title="Excluir Cotação"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredQuotes.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-500">
                        Nenhuma cotação encontrada. Cadastre uma cotação para comparar preços de fornecedores.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= ABA: COTAÇÕES EM LOTE (RFP DE MÚLTIPLOS ITENS E FORNECEDORES) ================= */}
      {activeSection === 'batch_quotes' && (
        <BatchQuoteRoundsView
          suppliers={suppliers}
          filaments={filaments}
          supplies={supplies}
          onPurchasesUpdated={onRefreshData}
          theme={theme}
          onNavigateToSettings={onNavigateToSettings}
        />
      )}

      {/* ================= MODAL: CADASTRAR/EDITAR FORNECEDOR ================= */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#131316] border border-white/[0.08] w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">
                  {editingSupplier ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor'}
                </h3>
              </div>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-slate-300 font-bold">Razão Social / Nome Fantasia *</label>
                  <input
                    type="text"
                    required
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    placeholder="Ex: 3D Fila Suprimentos, Voolt3D, etc."
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Nome do Contato de Compras</label>
                  <input
                    type="text"
                    value={supplierForm.contact_name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contact_name: e.target.value })}
                    placeholder="Ex: Carlos (Comercial)"
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Categoria Principal</label>
                  <select
                    value={supplierForm.category}
                    onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Filamentos">Filamentos</option>
                    <option value="Insumos & Fixação">Insumos & Fixação (Chaveiros, Parafusos)</option>
                    <option value="Embalagens">Embalagens & Envio</option>
                    <option value="Peças & Hotends">Peças & Bicos / Hotends</option>
                    <option value="Resinas">Resinas 3D</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">CNPJ ou CPF</label>
                  <input
                    type="text"
                    value={supplierForm.cnpj_cpf}
                    onChange={(e) => setSupplierForm({ ...supplierForm, cnpj_cpf: e.target.value })}
                    placeholder="00.000.000/0000-00"
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Telefone / WhatsApp Comercial</label>
                  <input
                    type="text"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">E-mail para Pedidos</label>
                  <input
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    placeholder="pedidos@fornecedor.com.br"
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Website / Loja Online</label>
                  <input
                    type="url"
                    value={supplierForm.website}
                    onChange={(e) => setSupplierForm({ ...supplierForm, website: e.target.value })}
                    placeholder="https://fornecedor.com.br"
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Prazo de Entrega (dias úteis)</label>
                  <input
                    type="number"
                    min="1"
                    value={supplierForm.lead_time_days}
                    onChange={(e) => setSupplierForm({ ...supplierForm, lead_time_days: Number(e.target.value) })}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Avaliação (1 a 5 estrelas)</label>
                  <select
                    value={supplierForm.rating}
                    onChange={(e) => setSupplierForm({ ...supplierForm, rating: Number(e.target.value) })}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5 Estrelas - Excelente)</option>
                    <option value={4}>⭐⭐⭐⭐ (4 Estrelas - Muito Bom)</option>
                    <option value={3}>⭐⭐⭐ (3 Estrelas - Bom)</option>
                    <option value={2}>⭐⭐ (2 Estrelas - Regular)</option>
                    <option value={1}>⭐ (1 Estrela - Ruim)</option>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-slate-300 font-medium">Condições de Pagamento Usuais</label>
                  <input
                    type="text"
                    value={supplierForm.payment_terms}
                    onChange={(e) => setSupplierForm({ ...supplierForm, payment_terms: e.target.value })}
                    placeholder="Ex: Boleto 28 dias, PIX com 5% de desconto, frete grátis acima de R$ 300"
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-slate-300 font-medium">Endereço / Localização</label>
                  <input
                    type="text"
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                    placeholder="Ex: São Paulo - SP / Centro de Distribuição"
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-slate-300 font-medium">Observações Internas (Chave PIX, histórico, etc)</label>
                  <textarea
                    rows={2}
                    value={supplierForm.notes}
                    onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                    placeholder="Ex: Chave PIX CNPJ xxxx. Vendedora atende rápido pelo WhatsApp."
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 bg-[#1c1c20] hover:bg-white/10 text-slate-300 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="integration-btn-primary px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl transition shadow-md shadow-sky-500/20 cursor-pointer"
                >
                  {editingSupplier ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: REGISTRAR AQUISIÇÃO / ENTRADA NO ESTOQUE ================= */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#131316] border border-white/[0.08] w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Registrar Aquisição de Insumo</h3>
                  <p className="text-[11px] text-slate-400">Entrada física e financeira vinculada ao controle de estoque.</p>
                </div>
              </div>
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Fornecedor</label>
                <div className="flex gap-2">
                  <select
                    value={purchaseForm.supplier}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })}
                    className="flex-1 bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.category})
                      </option>
                    ))}
                    <option value="Outro Fornecedor">Outro Fornecedor</option>
                  </select>
                </div>
              </div>

              {/* Insumo Type Selector */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Tipo de Item</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseForm((prev) => ({ ...prev, item_type: 'filament', unit: 'carretel' }));
                      if (filaments[0]) handleItemSelectInPurchase('filament', filaments[0].id);
                    }}
                    className={`py-2 rounded-xl font-bold border transition text-center cursor-pointer ${
                      purchaseForm.item_type === 'filament'
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-[#1c1c20] text-slate-400 border-white/[0.06]'
                    }`}
                  >
                    🧵 Filamento
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseForm((prev) => ({ ...prev, item_type: 'supply', unit: 'un' }));
                      if (supplies[0]) handleItemSelectInPurchase('supply', supplies[0].id);
                    }}
                    className={`py-2 rounded-xl font-bold border transition text-center cursor-pointer ${
                      purchaseForm.item_type === 'supply'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-[#1c1c20] text-slate-400 border-white/[0.06]'
                    }`}
                  >
                    🔩 Suprimento/Peça
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseForm((prev) => ({
                        ...prev,
                        item_type: 'other',
                        item_id: '',
                        item_name: '',
                        unit: 'un',
                      }));
                    }}
                    className={`py-2 rounded-xl font-bold border transition text-center cursor-pointer ${
                      purchaseForm.item_type === 'other'
                        ? 'bg-slate-500/20 text-slate-300 border-slate-500/40'
                        : 'bg-[#1c1c20] text-slate-400 border-white/[0.06]'
                    }`}
                  >
                    📦 Outro Item
                  </button>
                </div>
              </div>

              {/* Selection from existing stock */}
              {purchaseForm.item_type === 'filament' && (
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Filamento no Estoque</label>
                  <select
                    value={purchaseForm.item_id}
                    onChange={(e) => handleItemSelectInPurchase('filament', e.target.value)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  >
                    {filaments.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.brand} - {f.material}) • Estoque atual: {f.remaining_weight_g}g
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {purchaseForm.item_type === 'supply' && (
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Insumo / Ferragem no Estoque</label>
                  <select
                    value={purchaseForm.item_id}
                    onChange={(e) => handleItemSelectInPurchase('supply', e.target.value)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  >
                    {supplies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} • Estoque atual: {s.in_stock_qty} {s.unit}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Descrição do Item *</label>
                <input
                  type="text"
                  required
                  value={purchaseForm.item_name}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, item_name: e.target.value })}
                  placeholder="Nome do produto ou lote adquirido"
                  className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={purchaseForm.quantity}
                    onChange={(e) => {
                      const qty = Number(e.target.value);
                      setPurchaseForm({
                        ...purchaseForm,
                        quantity: qty,
                        total_cost: qty * Number(purchaseForm.unit_cost || 0),
                      });
                    }}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Unidade</label>
                  <input
                    type="text"
                    value={purchaseForm.unit}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, unit: e.target.value })}
                    placeholder="un, carretel, kg"
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Custo Unitário (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchaseForm.unit_cost}
                    onChange={(e) => {
                      const uCost = Number(e.target.value);
                      setPurchaseForm({
                        ...purchaseForm,
                        unit_cost: uCost,
                        total_cost: Number(purchaseForm.quantity || 1) * uCost,
                      });
                    }}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Custo Total (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchaseForm.total_cost}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, total_cost: Number(e.target.value) })}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-emerald-400 font-bold focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Data da Compra</label>
                  <input
                    type="date"
                    value={purchaseForm.purchase_date}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Automatic Stock Update Checkbox */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-bold text-emerald-300 block">Atualizar Estoque Imediatamente</span>
                  <span className="text-[11px] text-slate-400 block">
                    {purchaseForm.item_type === 'filament'
                      ? 'Adiciona o peso dos carretéis ao estoque de filamentos da oficina.'
                      : purchaseForm.item_type === 'supply'
                      ? 'Soma a quantidade de unidades ao estoque do insumo.'
                      : 'Registra a movimentação no livro de compras da oficina.'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={purchaseForm.update_stock}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, update_stock: e.target.checked })}
                  className="w-5 h-5 rounded accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 bg-[#1c1c20] hover:bg-white/10 text-slate-300 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  Confirmar Entrada no Estoque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CADASTRAR/EDITAR COTAÇÃO ================= */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#131316] border border-white/[0.08] w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {editingQuote ? 'Editar Cotação por Item' : 'Registrar Nova Cotação'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Armazene orçamentos para comparar e comprar no momento certo.</p>
                </div>
              </div>
              <button
                onClick={() => setIsQuoteModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuote} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Fornecedor Cotado *</label>
                <select
                  required
                  value={quoteForm.supplier_name}
                  onChange={(e) => {
                    const supName = e.target.value;
                    const matchedSup = suppliers.find((s) => s.name === supName);
                    setQuoteForm({
                      ...quoteForm,
                      supplier_name: supName,
                      supplier_id: matchedSup?.id || '',
                      lead_time_days: matchedSup?.lead_time_days || quoteForm.lead_time_days,
                    });
                  }}
                  className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                  <option value="Outro Fornecedor">Outro Fornecedor</option>
                </select>
              </div>

              {/* Item Type Selector */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Tipo de Item</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuoteForm((prev) => ({ ...prev, item_type: 'filament', unit: 'carretel' }));
                      if (filaments[0]) handleItemSelectInQuote('filament', filaments[0].id);
                    }}
                    className={`py-2 rounded-xl font-bold border transition text-center cursor-pointer ${
                      quoteForm.item_type === 'filament'
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-[#1c1c20] text-slate-400 border-white/[0.06]'
                    }`}
                  >
                    🧵 Filamento
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuoteForm((prev) => ({ ...prev, item_type: 'supply', unit: 'un' }));
                      if (supplies[0]) handleItemSelectInQuote('supply', supplies[0].id);
                    }}
                    className={`py-2 rounded-xl font-bold border transition text-center cursor-pointer ${
                      quoteForm.item_type === 'supply'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-[#1c1c20] text-slate-400 border-white/[0.06]'
                    }`}
                  >
                    🔩 Suprimento/Peça
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuoteForm((prev) => ({
                        ...prev,
                        item_type: 'other',
                        item_id: '',
                        item_name: '',
                        unit: 'un',
                      }));
                    }}
                    className={`py-2 rounded-xl font-bold border transition text-center cursor-pointer ${
                      quoteForm.item_type === 'other'
                        ? 'bg-slate-500/20 text-slate-300 border-slate-500/40'
                        : 'bg-[#1c1c20] text-slate-400 border-white/[0.06]'
                    }`}
                  >
                    📦 Outro Item
                  </button>
                </div>
              </div>

              {/* Link with inventory item */}
              {quoteForm.item_type === 'filament' && (
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Vincular a Filamento da Oficina</label>
                  <select
                    value={quoteForm.item_id}
                    onChange={(e) => handleItemSelectInQuote('filament', e.target.value)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    {filaments.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.brand} - {f.material})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {quoteForm.item_type === 'supply' && (
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Vincular a Insumo da Oficina</label>
                  <select
                    value={quoteForm.item_id}
                    onChange={(e) => handleItemSelectInQuote('supply', e.target.value)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    {supplies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.unit})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Nome do Item / Especificação *</label>
                <input
                  type="text"
                  required
                  value={quoteForm.item_name}
                  onChange={(e) => setQuoteForm({ ...quoteForm, item_name: e.target.value })}
                  placeholder="Ex: PLA Preto Fosco 1kg ou Parafuso M3"
                  className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Preço Unit. (R$) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={quoteForm.unit_price}
                    onChange={(e) => setQuoteForm({ ...quoteForm, unit_price: Number(e.target.value) })}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Unidade</label>
                  <input
                    type="text"
                    value={quoteForm.unit}
                    onChange={(e) => setQuoteForm({ ...quoteForm, unit: e.target.value })}
                    placeholder="carretel, un"
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Pedido Mínimo</label>
                  <input
                    type="number"
                    min="1"
                    value={quoteForm.moq}
                    onChange={(e) => setQuoteForm({ ...quoteForm, moq: Number(e.target.value) })}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Frete Estimado (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quoteForm.shipping_cost}
                    onChange={(e) => setQuoteForm({ ...quoteForm, shipping_cost: Number(e.target.value) })}
                    placeholder="0 = Grátis"
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Prazo (dias)</label>
                  <input
                    type="number"
                    min="1"
                    value={quoteForm.lead_time_days}
                    onChange={(e) => setQuoteForm({ ...quoteForm, lead_time_days: Number(e.target.value) })}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Validade da Cotação</label>
                  <input
                    type="date"
                    value={quoteForm.valid_until}
                    onChange={(e) => setQuoteForm({ ...quoteForm, valid_until: e.target.value })}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Status da Cotação</label>
                  <select
                    value={quoteForm.status}
                    onChange={(e) => setQuoteForm({ ...quoteForm, status: e.target.value as any })}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="active">Ativa / Em Aberto</option>
                    <option value="approved">Aprovada / Comprada</option>
                    <option value="rejected">Recusada</option>
                    <option value="expired">Expirada</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Observações</label>
                  <input
                    type="text"
                    value={quoteForm.notes}
                    onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                    placeholder="Ex: Condição especial para 5 unidades no PIX"
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsQuoteModalOpen(false)}
                  className="px-4 py-2 bg-[#1c1c20] hover:bg-white/10 text-slate-300 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="integration-btn-primary px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl transition shadow-md shadow-sky-500/20 cursor-pointer"
                >
                  {editingQuote ? 'Salvar Cotação' : 'Registrar Cotação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRMAR EXCLUSÃO ================= */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#131316] border border-white/[0.08] w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Confirmar Exclusão</h4>
                <p className="text-xs text-slate-400">
                  Deseja realmente remover "{itemToDelete.name}"?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 bg-[#1c1c20] hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-xl transition shadow-md shadow-rose-500/20 cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
