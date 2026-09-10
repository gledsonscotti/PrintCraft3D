import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  DollarSign,
  Package,
  MapPin,
  HelpCircle,
  X
} from 'lucide-react';
import { ShippingCarrier } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface CarriersViewProps {
  onRefreshData: () => void | Promise<void>;
}

export const CarriersView: React.FC<CarriersViewProps> = ({ onRefreshData }) => {
  const [carriers, setCarriers] = useState<ShippingCarrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<ShippingCarrier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShippingCarrier | null>(null);

  const [name, setName] = useState('');
  const [serviceType, setServiceType] = useState('PAC / SEDEX');
  const [defaultCost, setDefaultCost] = useState<number>(18.00);
  const [deliveryDays, setDeliveryDays] = useState('3 a 5 dias úteis');
  const [notes, setNotes] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchCarriers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/carriers');
      if (res.ok) {
        const data = await res.json();
        setCarriers(data);
      }
    } catch (e) {
      console.warn('Erro ao buscar transportadoras:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarriers();
  }, []);

  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(t);
  }, [notification]);

  const handleOpenModal = (carrier?: ShippingCarrier) => {
    if (carrier) {
      setEditingCarrier(carrier);
      setName(carrier.name);
      setServiceType(carrier.service_type || 'PAC / SEDEX');
      setDefaultCost(carrier.default_cost);
      setDeliveryDays(carrier.delivery_days || '3 a 5 dias úteis');
      setNotes(carrier.notes || '');
    } else {
      setEditingCarrier(null);
      setName('');
      setServiceType('PAC / SEDEX');
      setDefaultCost(18.00);
      setDeliveryDays('3 a 5 dias úteis');
      setNotes('');
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        service_type: serviceType,
        default_cost: Number(defaultCost) || 0,
        delivery_days: deliveryDays,
        notes,
      };

      let res;
      if (editingCarrier) {
        res = await fetch(`/api/carriers/${editingCarrier.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/carriers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error('Falha ao salvar transportadora');

      setShowModal(false);
      setNotification({
        type: 'success',
        message: editingCarrier ? 'Transportadora atualizada com sucesso!' : 'Nova transportadora cadastrada!'
      });
      fetchCarriers();
      onRefreshData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erro ao salvar' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/carriers/${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir transportadora');
      setNotification({ type: 'success', message: 'Transportadora excluída com sucesso!' });
      setDeleteTarget(null);
      fetchCarriers();
      onRefreshData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg backdrop-blur-md ${
          notification.type === 'success'
            ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-200'
            : 'bg-rose-950/70 border border-rose-500/50 text-rose-200'
        }`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{notification.message}</span>
        </div>
      )}

      <div className="production-kpi-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121215] border border-white/[0.08] p-5 sm:p-6 rounded-3xl">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-sky-400" />
            Cadastro de Transportadoras & Opções de Envio
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gerencie as transportadoras, motoboys e serviços de frete utilizados na precificação e registro de vendas da sua oficina.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="integration-btn-primary bg-sky-500 hover:bg-sky-400 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition shadow-md shadow-sky-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nova Transportadora
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-500">Carregando transportadoras...</div>
        ) : carriers.length === 0 ? (
          <div className="col-span-full py-16 text-center border border-dashed border-white/[0.1] rounded-3xl bg-[#121215]/50 space-y-3">
            <Truck className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">Nenhuma transportadora cadastrada ainda.</p>
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="text-sky-400 text-xs font-semibold hover:underline"
            >
              + Cadastrar primeira transportadora
            </button>
          </div>
        ) : (
          carriers.map((c) => (
            <div
              key={c.id}
              className="production-kpi-card bg-[#121215] border border-white/[0.08] hover:border-white/[0.16] rounded-3xl p-5 space-y-4 transition flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">{c.name}</h3>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20 mt-1">
                      {c.service_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(c)}
                      className="p-1.5 text-slate-400 hover:text-white transition rounded-xl hover:bg-white/[0.05]"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(c)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition rounded-xl hover:bg-rose-500/10 cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {c.notes && (
                  <p className="text-xs text-slate-400 line-clamp-2">{c.notes}</p>
                )}
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" /> {c.delivery_days || 'Prazo padrão'}
                </span>
                <span className="font-bold text-emerald-400 text-sm">
                  R$ {Number(c.default_cost || 0).toFixed(2)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Criar/Editar Transportadora */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="production-modal-box bg-[#16161a] border border-white/[0.12] rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="production-modal-header flex items-center justify-between border-b border-white/[0.08] pb-4 -mx-6 -mt-6 p-6 rounded-t-3xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-sky-400" />
                {editingCarrier ? 'Editar Transportadora' : 'Nova Transportadora'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nome da Transportadora / Serviço</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Correios SEDEX, Motoboy Local, Jadlog"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="production-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Tipo de Serviço</label>
                  <input
                    type="text"
                    placeholder="Ex: Expresso, Rodoviário"
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="production-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Custo Base Padrão (R$)</label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={defaultCost}
                    onChange={(e) => setDefaultCost(Number(e.target.value))}
                    className="production-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Prazo de Entrega Estimado</label>
                <input
                  type="text"
                  placeholder="Ex: 2 a 4 dias úteis"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                  className="production-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Observações (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Instruções de envio ou observações..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="production-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="integration-btn-secondary px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#222228] hover:bg-[#2b2b33] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="integration-btn-primary px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-500 hover:bg-sky-400 transition shadow-md shadow-sky-500/20"
                >
                  {editingCarrier ? 'Salvar Alterações' : 'Cadastrar Transportadora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Transportadora"
        message="Tem certeza que deseja excluir esta transportadora? Esta ação não pode ser desfeita."
        itemName={deleteTarget?.name}
        confirmLabel="Sim, Excluir"
      />

    </div>
  );
};
