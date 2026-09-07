import React, { useState, useEffect } from 'react';
import {
  Package,
  Layers,
  Clock,
  Scale,
  DollarSign,
  Play,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Tag,
  AlertCircle,
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  Edit3,
  Copy,
  Image as ImageIcon,
  Maximize2
} from 'lucide-react';
import { ExtraSupplyItem, Filament, Printer, Product } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface ProductsViewProps {
  products: Product[];
  printers: Printer[];
  filaments: Filament[];
  onRefreshData: () => void | Promise<void>;
  onSelectProductForCalculator?: (product: Product, mode: 'edit' | 'copy') => void;
  onOpenSaleModal?: (product: Product) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  printers,
  filaments,
  onRefreshData,
  onSelectProductForCalculator,
  onOpenSaleModal,
}) => {
  const [printModalProduct, setPrintModalProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [stockAdjustingId, setStockAdjustingId] = useState<string | null>(null);

  // Image zoom modal state
  const [expandedImage, setExpandedImage] = useState<{ url: string; title: string } | null>(null);

  // Deletion Modal State
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // In-app Notification Feedback Banner
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  const handleQuickStockAdjust = async (product: Product, delta: number) => {
    const current = product.ready_stock_qty || 0;
    const nextStock = Math.max(0, current + delta);
    setStockAdjustingId(product.id);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(product.id)}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_stock_qty: nextStock }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar estoque');
      await onRefreshData();
      setNotification({
        type: 'success',
        message: `Estoque de "${product.name}" atualizado para ${nextStock} un.`,
      });
    } catch (e: any) {
      setNotification({
        type: 'error',
        message: e.message || 'Erro ao ajustar estoque',
      });
    } finally {
      setStockAdjustingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Falha ao remover produto');
      }
      setNotification({
        type: 'success',
        message: `Produto "${deleteTarget.name}" excluído do catálogo!`
      });
      setDeleteTarget(null);
      await onRefreshData();
    } catch (e: any) {
      setNotification({
        type: 'error',
        message: 'Erro ao excluir produto: ' + (e.message || 'Falha na requisição')
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExecutePrint = async () => {
    if (!printModalProduct) return;
    setIsSubmitting(true);
    setSuccessMsg(null);

    try {
      let suppliesList: ExtraSupplyItem[] = [];
      try {
        suppliesList = JSON.parse(printModalProduct.extra_supplies_json || '[]');
      } catch (e) {}

      const payload = {
        product_id: printModalProduct.id,
        product_name: printModalProduct.name,
        printer_id: printModalProduct.printer_id,
        filament_id: printModalProduct.filament_id,
        quantity,
        filament_used_g: printModalProduct.filament_weight_g,
        total_time_minutes: printModalProduct.print_time_minutes,
        total_cost: printModalProduct.total_cost,
        supplies_used: suppliesList.map((s) => ({
          supply_id: s.supply_id,
          name: s.name,
          qty: s.qty,
        })),
        status: 'completed',
      };

      const res = await fetch('/api/print-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccessMsg(
          `Impressão de ${quantity}x "${printModalProduct.name}" concluída! +${quantity} peças adicionadas ao Estoque de Produtos Prontos e insumos debitados com sucesso.`
        );
        onRefreshData();
        setTimeout(() => {
          setPrintModalProduct(null);
          setSuccessMsg(null);
        }, 3000);
      }
    } catch (e: any) {
      alert('Erro ao registrar impressão: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* In-app Notification Banner */}
      {notification && (
        <div
          role="alert"
          className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-semibold animate-fadeIn shadow-sm ${
            notification.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.08] transition"
            aria-label="Fechar notificação"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-400" />
            Catálogo de Produtos Cadastrados & Fichas Técnicas
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Produtos formados a partir de insumos, filamentos e energia. Imprima diretamente para baixar estoque em tempo real.
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400 mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">Nenhum produto salvo no catálogo ainda</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Utilize a Calculadora de Custos para formar produtos com insumos e salvá-los no catálogo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((prod) => {
            const printer = printers.find((p) => p.id === prod.printer_id);
            const filament = filaments.find((f) => f.id === prod.filament_id);

            let extraSupplies: ExtraSupplyItem[] = [];
            try {
              extraSupplies = JSON.parse(prod.extra_supplies_json || '[]');
            } catch (e) {}

            return (
              <div
                key={prod.id}
                className="bg-[#121215] border border-white/[0.08] hover:border-white/[0.16] rounded-3xl p-5 space-y-4 shadow-sm shadow-black/40 flex flex-col justify-between transition"
              >
                <div className="space-y-3">
                  {/* Line 1: Category on its own line */}
                  <div>
                    <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl uppercase tracking-wider inline-block">
                      {prod.category}
                    </span>
                  </div>

                  {/* Line 2: Product Name */}
                  <div>
                    <h3 className="text-base font-bold text-white leading-snug">{prod.name}</h3>
                  </div>

                  {/* Line 3 (Right below): Stock data, quantity adjuster (- 1 +), edit, copy, delete */}
                  <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Ready Stock Status Badge */}
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                          (prod.ready_stock_qty || 0) > 0
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                        }`}
                      >
                        {(prod.ready_stock_qty || 0) > 0 ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            {prod.ready_stock_qty} un. em estoque
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-slate-400" />
                            0 un. em estoque
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Quick stock adjustment buttons */}
                      <div className="flex items-center bg-[#0A0A0B] border border-white/[0.08] rounded-xl p-0.5 text-xs text-slate-400">
                        <button
                          type="button"
                          onClick={() => handleQuickStockAdjust(prod, -1)}
                          disabled={stockAdjustingId === prod.id || (prod.ready_stock_qty || 0) <= 0}
                          className="p-1 hover:text-white rounded-lg hover:bg-white/[0.08] disabled:opacity-30 transition"
                          title="Diminuir 1 un. do estoque pronto"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-1.5 font-mono font-bold text-white text-[11px]" title="Estoque pronto">
                          {prod.ready_stock_qty || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuickStockAdjust(prod, 1)}
                          disabled={stockAdjustingId === prod.id}
                          className="p-1 hover:text-white rounded-lg hover:bg-white/[0.08] disabled:opacity-30 transition"
                          title="Adicionar 1 un. ao estoque pronto"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectProductForCalculator) onSelectProductForCalculator(prod, 'edit');
                        }}
                        className="text-slate-400 hover:text-sky-400 p-1.5 rounded-xl hover:bg-white/[0.06] transition"
                        title="Editar produto na calculadora"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectProductForCalculator) onSelectProductForCalculator(prod, 'copy');
                        }}
                        className="text-slate-400 hover:text-amber-400 p-1.5 rounded-xl hover:bg-white/[0.06] transition"
                        title="Copiar / Duplicar produto"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(prod)}
                        className="text-slate-400 hover:text-rose-400 p-1.5 rounded-xl hover:bg-white/[0.06] transition"
                        title="Excluir Produto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Optional Product Image Preview */}
                  {prod.image_url && (
                    <div className="relative group rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0A0A0B] h-32 flex items-center justify-center">
                      <img
                        src={prod.image_url}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setExpandedImage({ url: prod.image_url!, title: prod.name })}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white gap-1.5 transition text-xs font-medium backdrop-blur-xs cursor-pointer"
                        title="Ampliar Imagem"
                      >
                        <Maximize2 className="w-4 h-4" />
                        Ampliar Foto
                      </button>
                    </div>
                  )}

                  {prod.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">{prod.description}</p>
                  )}

                  {/* Specifications */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#0A0A0B]/80 p-3.5 rounded-2xl border border-white/[0.06] font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-sans">Filamento</span>
                      <span className="font-semibold text-white">
                        {prod.filament_weight_g}g ({filament?.material || 'PLA'})
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] font-sans">Tempo Impressão</span>
                      <span className="font-semibold text-white">{prod.print_time_minutes} min</span>
                    </div>

                    <div className="pt-2 border-t border-white/[0.06]">
                      <span className="text-slate-400 block text-[10px] font-sans">Impressora</span>
                      <span className="font-medium text-slate-300 truncate block">
                        {printer?.name || 'Padrão'}
                      </span>
                    </div>

                    <div className="text-right pt-2 border-t border-white/[0.06]">
                      <span className="text-slate-400 block text-[10px] font-sans">Insumos Extras</span>
                      <span className="font-medium text-emerald-400">
                        {extraSupplies.length > 0 ? `${extraSupplies.length} itens` : 'Sem extras'}
                      </span>
                    </div>
                  </div>

                  {/* Supplies Pill list if present */}
                  {extraSupplies.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        Composição de Insumos:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {extraSupplies.map((s, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] bg-[#0A0A0B] border border-white/[0.08] text-slate-300 px-2.5 py-1 rounded-xl flex items-center gap-1 font-mono"
                          >
                            <span className="text-emerald-400 font-bold">{s.qty}x</span> {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pricing Comparison */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.08]">
                    <div className="bg-[#0A0A0B]/80 p-3 rounded-2xl border border-white/[0.06]">
                      <span className="text-[10px] text-slate-400 block">Custo de Produção</span>
                      <span className="text-sm font-bold text-white font-mono">
                        R$ {prod.total_cost.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 text-right">
                      <span className="text-[10px] text-emerald-300 block">Preço de Venda</span>
                      <span className="text-base font-black text-emerald-400 font-mono">
                        R$ {prod.sale_price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vender e Produzir actions */}
                <div className="mt-3 pt-2 border-t border-white/[0.06]">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenSaleModal) {
                          onOpenSaleModal(prod);
                        }
                      }}
                      className="catalog-btn-sell bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer shrink-0"
                      title="Registrar venda por Plataforma, CNPJ ou PF"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Vender
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPrintModalProduct(prod);
                        setQuantity(1);
                      }}
                      className="catalog-btn-produce bg-[#1c1c22] hover:bg-sky-500 hover:text-white text-slate-200 border border-white/[0.1] py-2.5 px-3 rounded-2xl font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer shrink-0"
                      title="Imprimir lote e alimentar estoque pronto"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Produzir (+Estoque)
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Execute Print Job Modal */}
      {printModalProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.12] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-sky-400 fill-sky-400" />
              Produzir Lote & Entrada em Estoque
            </h3>

            {successMsg ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 p-4 rounded-2xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium">{successMsg}</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#0A0A0B]/80 p-4 rounded-2xl border border-white/[0.08] text-xs space-y-2 font-mono">
                  <div className="text-sm font-bold text-white font-sans">{printModalProduct.name}</div>
                  <div className="text-slate-400 flex justify-between">
                    <span className="font-sans">Estoque atual pronto:</span>
                    <strong className="text-white font-sans">{printModalProduct.ready_stock_qty || 0} unidades</strong>
                  </div>
                  <div className="text-slate-400 flex justify-between">
                    <span className="font-sans">Peso unitário:</span>
                    <strong className="text-white">{printModalProduct.filament_weight_g} g</strong>
                  </div>
                  <div className="text-slate-400 flex justify-between">
                    <span className="font-sans">Tempo unitário:</span>
                    <strong className="text-white">{printModalProduct.print_time_minutes} min</strong>
                  </div>
                  <div className="text-slate-400 flex justify-between">
                    <span className="font-sans">Custo unitário:</span>
                    <strong className="text-emerald-400">R$ {printModalProduct.total_cost.toFixed(2)}</strong>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Quantidade de Peças a Imprimir neste Lote:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-24 bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-center text-sm font-mono font-bold text-white focus:outline-none focus:border-sky-400/60"
                    />
                    <div className="text-xs text-slate-400 font-mono space-y-0.5">
                      <div>
                        Baixa de filamento: <strong className="text-white">{(printModalProduct.filament_weight_g * quantity).toFixed(1)}g</strong>
                      </div>
                      <div className="text-emerald-400 font-sans font-semibold">
                        + {quantity} un. no estoque de peças prontas
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-sky-500/10 border border-sky-500/20 p-3 rounded-2xl text-[11px] text-sky-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-sky-400" />
                  <span>
                    Ao confirmar, o filamento e insumos serão baixados automaticamente e as <strong>{quantity} peças</strong> serão adicionadas ao estoque pronto para venda.
                  </span>
                </div>

                <div className="flex justify-end gap-2.5 pt-3.5 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setPrintModalProduct(null)}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleExecutePrint}
                    disabled={isSubmitting}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-2xl text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition cursor-pointer"
                  >
                    {isSubmitting ? 'Processando baixa...' : `Confirmar Impressão (+${quantity} no Estoque)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Confirmation Modal for deletion */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Excluir Produto do Catálogo"
        itemName={deleteTarget?.name}
        message="Tem certeza que deseja excluir este modelo 3D cadastrado? Seus parâmetros pré-calculados e lista de insumos associados serão removidos."
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        isDangerous={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => !isDeleting && setDeleteTarget(null)}
      />

      {/* Expanded Image Zoom Modal */}
      {expandedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={expandedImage.title}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-fadeIn"
          onClick={() => setExpandedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-[#121215] border border-white/[0.15] rounded-3xl p-3 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full px-3 py-2 border-b border-white/[0.08] mb-2">
              <span className="text-xs font-bold text-white truncate max-w-md">{expandedImage.title}</span>
              <button
                type="button"
                onClick={() => setExpandedImage(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.08] transition"
                aria-label="Fechar visualização de imagem"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-auto max-h-[75vh] w-full flex items-center justify-center">
              <img
                src={expandedImage.url}
                alt={expandedImage.title}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
