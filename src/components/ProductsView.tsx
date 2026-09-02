import React, { useState } from 'react';
import {
  Package,
  Layers,
  Clock,
  Scale,
  DollarSign,
  Play,
  Trash2,
  CheckCircle2,
  Tag,
  AlertCircle
} from 'lucide-react';
import { ExtraSupplyItem, Filament, Printer, Product } from '../types';

interface ProductsViewProps {
  products: Product[];
  printers: Printer[];
  filaments: Filament[];
  onRefreshData: () => void;
  onSelectProductForCalculator?: (product: Product) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  printers,
  filaments,
  onRefreshData,
  onSelectProductForCalculator,
}) => {
  const [printModalProduct, setPrintModalProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este produto do catálogo?')) return;
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      onRefreshData();
    } catch (e: any) {
      alert('Erro ao excluir: ' + e.message);
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
          `Impressão de ${quantity}x "${printModalProduct.name}" concluída! Estoque de filamento e insumos debitado com sucesso no SQLite.`
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
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-xl uppercase tracking-wider">
                        {prod.category}
                      </span>
                      <h3 className="text-base font-bold text-white mt-1.5">{prod.name}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(prod.id)}
                      className="text-slate-400 hover:text-rose-400 p-1.5 rounded-xl hover:bg-white/[0.06] transition"
                      title="Excluir Produto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

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

                {/* Print button */}
                <button
                  type="button"
                  onClick={() => {
                    setPrintModalProduct(prod);
                    setQuantity(1);
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-2.5 px-4 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm mt-3"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Imprimir Peça & Baixar Estoque
                </button>
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
              <Play className="w-5 h-5 text-emerald-400 fill-emerald-400" />
              Executar Impressão & Baixa de Estoque
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
                      className="w-24 bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-center text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-400/60"
                    />
                    <span className="text-xs text-slate-400 font-mono">
                      Total a baixar: <strong className="text-white">{(printModalProduct.filament_weight_g * quantity).toFixed(1)}g</strong> de filamento
                    </span>
                  </div>
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
                    className="bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2.5 rounded-2xl text-xs font-semibold shadow flex items-center gap-2 transition"
                  >
                    {isSubmitting ? 'Processando baixa...' : 'Confirmar & Baixar Estoque'}
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
