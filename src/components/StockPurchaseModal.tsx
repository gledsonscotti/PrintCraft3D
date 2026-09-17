import React, { useState, useEffect } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { Filament, Supply, Supplier } from '../types';

interface StockPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  filaments: Filament[];
  supplies: Supply[];
  onSuccess: (message: string) => void;
  initialSupplier?: string;
  initialItemType?: 'filament' | 'supply' | 'other';
  initialItemId?: string;
}

export const StockPurchaseModal: React.FC<StockPurchaseModalProps> = ({
  isOpen,
  onClose,
  filaments,
  supplies,
  onSuccess,
  initialSupplier,
  initialItemType = 'filament',
  initialItemId,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    supplier: initialSupplier || '',
    item_type: initialItemType,
    item_id: initialItemId || (initialItemType === 'filament' ? filaments[0]?.id || '' : supplies[0]?.id || ''),
    item_name: '',
    quantity: 1,
    unit: initialItemType === 'filament' ? 'carretel' : 'un',
    unit_cost: 0,
    total_cost: 0,
    purchase_date: new Date().toISOString().split('T')[0],
    payment_method: 'PIX',
    notes: '',
    update_stock: true,
  });

  // Fetch registered suppliers
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    fetch('/api/suppliers')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : data.suppliers || [];
        setSuppliers(list);
        if (!form.supplier && list.length > 0) {
          setForm((prev) => ({ ...prev, supplier: list[0].name }));
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Sync item name and default cost when item changes
  useEffect(() => {
    if (form.item_type === 'filament') {
      const fil = filaments.find((f) => f.id === form.item_id) || filaments[0];
      if (fil) {
        const uCost = Number(fil.cost_per_spool) || 89.9;
        setForm((prev) => ({
          ...prev,
          item_id: fil.id,
          item_name: `${fil.name} (${fil.brand || ''} - ${fil.material || ''})`,
          unit: 'carretel',
          unit_cost: uCost,
          total_cost: (Number(prev.quantity) || 1) * uCost,
        }));
      }
    } else if (form.item_type === 'supply') {
      const sup = supplies.find((s) => s.id === form.item_id) || supplies[0];
      if (sup) {
        const uCost = Number(sup.cost_per_unit) || 5.0;
        setForm((prev) => ({
          ...prev,
          item_id: sup.id,
          item_name: sup.name,
          unit: sup.unit || 'un',
          unit_cost: uCost,
          total_cost: (Number(prev.quantity) || 1) * uCost,
        }));
      }
    }
  }, [form.item_type, form.item_id, filaments, supplies]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.item_name.trim() || Number(form.quantity) <= 0) {
      alert('Informe o item e uma quantidade válida.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        total_cost:
          Number(form.total_cost) > 0
            ? Number(form.total_cost)
            : Number(form.quantity) * Number(form.unit_cost),
      };

      const res = await fetch('/api/material-purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Falha ao registrar aquisição');

      onSuccess(
        `Entrada de "${form.item_name}" registrada! ${
          form.update_stock ? 'Estoque atualizado com sucesso.' : ''
        }`
      );
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar entrada no estoque.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#131316] border border-white/[0.08] w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Registrar Entrada no Estoque</h3>
              <p className="text-[11px] text-slate-400">
                Entrada física e financeira vinculada ao controle de estoque da oficina.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-300 font-bold">Fornecedor</label>
            <div className="flex gap-2">
              <select
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
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
                  setForm((prev) => ({
                    ...prev,
                    item_type: 'filament',
                    unit: 'carretel',
                    item_id: filaments[0]?.id || '',
                  }));
                }}
                className={`py-2 rounded-xl font-bold border transition text-center cursor-pointer ${
                  form.item_type === 'filament'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-[#1c1c20] text-slate-400 border-white/[0.06]'
                }`}
              >
                🧵 Filamento
              </button>

              <button
                type="button"
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    item_type: 'supply',
                    unit: 'un',
                    item_id: supplies[0]?.id || '',
                  }));
                }}
                className={`py-2 rounded-xl font-bold border transition text-center cursor-pointer ${
                  form.item_type === 'supply'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-[#1c1c20] text-slate-400 border-white/[0.06]'
                }`}
              >
                🔩 Insumo / Peça
              </button>

              <button
                type="button"
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    item_type: 'other',
                    item_id: '',
                    item_name: '',
                    unit: 'un',
                  }));
                }}
                className={`py-2 rounded-xl font-bold border transition text-center cursor-pointer ${
                  form.item_type === 'other'
                    ? 'bg-slate-500/20 text-slate-300 border-slate-500/40'
                    : 'bg-[#1c1c20] text-slate-400 border-white/[0.06]'
                }`}
              >
                📦 Outro Item
              </button>
            </div>
          </div>

          {/* Selection from existing stock */}
          {form.item_type === 'filament' && (
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Filamento no Estoque</label>
              <select
                value={form.item_id}
                onChange={(e) => setForm({ ...form, item_id: e.target.value })}
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

          {form.item_type === 'supply' && (
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Insumo / Ferragem no Estoque</label>
              <select
                value={form.item_id}
                onChange={(e) => setForm({ ...form, item_id: e.target.value })}
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
              value={form.item_name}
              onChange={(e) => setForm({ ...form, item_name: e.target.value })}
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
                value={form.quantity}
                onChange={(e) => {
                  const qty = Number(e.target.value);
                  setForm({
                    ...form,
                    quantity: qty,
                    total_cost: qty * Number(form.unit_cost || 0),
                  });
                }}
                className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Unidade</label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
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
                value={form.unit_cost}
                onChange={(e) => {
                  const uCost = Number(e.target.value);
                  setForm({
                    ...form,
                    unit_cost: uCost,
                    total_cost: Number(form.quantity || 1) * uCost,
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
                value={form.total_cost}
                onChange={(e) => setForm({ ...form, total_cost: Number(e.target.value) })}
                className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-emerald-400 font-bold focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Data da Compra</label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Automatic Stock Update Checkbox */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-300 block">Atualizar Estoque Imediatamente</span>
              <span className="text-[11px] text-slate-400 block">
                {form.item_type === 'filament'
                  ? 'Adiciona o peso dos carretéis ao estoque de filamentos da oficina.'
                  : form.item_type === 'supply'
                  ? 'Soma a quantidade de unidades ao estoque do insumo.'
                  : 'Registra a movimentação no livro de compras da oficina.'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={form.update_stock}
              onChange={(e) => setForm({ ...form, update_stock: e.target.checked })}
              className="w-5 h-5 rounded accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1c1c20] hover:bg-white/10 text-slate-300 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Registrando...' : 'Confirmar Entrada no Estoque'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
