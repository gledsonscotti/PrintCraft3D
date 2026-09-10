import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  Printer as PrinterIcon,
  Package,
  ShoppingCart,
  TrendingUp,
  ShieldCheck,
  Server,
  Layers,
  Building2,
  Database,
  Check,
  X,
  Lock
} from 'lucide-react';
import { SubscriptionPlan } from '../../types';
import { AVAILABLE_PLAN_FEATURES } from '../../data/planFeatures';

export const AdminOverviewTab: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [statsRes, plansRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/plans'),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
        if (plansRes.ok) {
          const plansData = await plansRes.json();
          setPlans(Array.isArray(plansData) ? plansData : []);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do admin:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Carregando métricas do ecossistema PrintCraft...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ecosystem Metrics - Companies & Users Control */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#121215] border border-white/[0.08] p-5 rounded-3xl space-y-2 admin-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Empresas Cadastradas</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {stats?.totalCompanies || 0}{' '}
            <span className="text-xs text-slate-500 font-normal">
              ({stats?.activeCompanies || 0} ativas)
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            {stats?.cnpjCompanies || 0} CNPJ (PJ) • {stats?.cpfCompanies || 0} CPF (PF)
          </span>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] p-5 rounded-3xl space-y-2 admin-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Usuários do App</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {stats?.totalUsers || 0}{' '}
            <span className="text-xs text-slate-500 font-normal">
              ({stats?.activeUsers || 0} ativos)
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            {stats?.adminUsers || 0} Admins • {stats?.operatorUsers || 0} Operadores 3D
          </span>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] p-5 rounded-3xl space-y-2 admin-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Planos de Assinatura</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {stats?.activePlans || 0}{' '}
            <span className="text-xs text-slate-500 font-normal">/ {stats?.totalPlans || 0}</span>
          </div>
          <span className="text-[10px] text-slate-400 block">Níveis de cotas ativos</span>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] p-5 rounded-3xl space-y-2 admin-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Parque de Impressoras</span>
            <PrinterIcon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats?.totalPrinters || 0}</div>
          <span className="text-[10px] text-slate-400 block">Máquinas registradas no sistema</span>
        </div>
      </div>

      {/* Production & Products Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        <div className="bg-[#121215] border border-white/[0.08] p-5 rounded-3xl space-y-2 admin-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Produtos & G-codes</span>
            <Package className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats?.totalProducts || 0}</div>
          <span className="text-[10px] text-slate-400 block">Peças cadastradas na base de dados</span>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] p-5 rounded-3xl space-y-2 admin-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Ordens de Produção (PCP)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats?.totalOrders || 0}</div>
          <span className="text-[10px] text-slate-400 block">Ordens e lotes em execução ou concluídos</span>
        </div>
      </div>

      {/* Comparison Table of Plans */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-4 admin-card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Comparativo de Cotas por Plano de Assinatura
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualize como os planos estão distribuindo os limites operacionais de usuários, impressoras e produtos
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-xl bg-white/[0.05] text-slate-300 border border-white/[0.08]">
            {plans.length} planos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse admin-table">
            <thead>
              <tr className="border-b border-white/[0.08] text-[11px] uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Plano</th>
                <th className="py-3 px-4">Mensalidade</th>
                <th className="py-3 px-4">Usuários</th>
                <th className="py-3 px-4">Impressoras</th>
                <th className="py-3 px-4">Produtos</th>
                <th className="py-3 px-4">Funcionalidades</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-xs">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition">
                  <td className="py-3.5 px-4 font-bold text-white">
                    <div className="flex items-center gap-2">
                      <span>{p.name}</span>
                      {p.badge && (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-normal">
                          {p.badge}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                    {p.price === 0 ? 'Gratuito' : `R$ ${p.price.toFixed(2)}/${p.billing_cycle}`}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {p.max_users === -1 ? (
                      <span className="text-emerald-400 font-bold">∞ Ilimitado</span>
                    ) : (
                      `${p.max_users} operador(es)`
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {p.max_printers === -1 ? (
                      <span className="text-sky-400 font-bold">∞ Ilimitado</span>
                    ) : (
                      `${p.max_printers} impressora(s)`
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {p.max_products === -1 ? (
                      <span className="text-amber-400 font-bold">∞ Ilimitado</span>
                    ) : (
                      `${p.max_products} modelo(s)`
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    {p.features?.length || 0} / {AVAILABLE_PLAN_FEATURES.length}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.is_active
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      {p.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Infrastructure Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-3 admin-card">
          <div className="flex items-center gap-2.5 text-white font-bold text-sm">
            <Server className="w-4 h-4 text-sky-400" />
            <span>Infraestrutura do Produto</span>
          </div>
          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex justify-between py-1 border-b border-white/[0.04]">
              <span>Motor do Banco de Dados:</span>
              <span className="font-mono text-white font-bold">SQLite 3 (sql.js Wasm)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/[0.04]">
              <span>Servidor Backend:</span>
              <span className="font-mono text-white font-bold">Express + Vite (Node.js)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/[0.04]">
              <span>Porta Interna / Externa:</span>
              <span className="font-mono text-emerald-400 font-bold">0.0.0.0:3000</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Rota Restrita de Administração:</span>
              <span className="font-mono text-emerald-400 font-bold">/admin</span>
            </div>
          </div>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-3 admin-card">
          <div className="flex items-center gap-2.5 text-white font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Segurança & Controle de Acesso do App</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            As alterações realizadas nas abas de <strong>Empresas (CNPJ/CPF)</strong> e <strong>Usuários</strong> têm efeito em tempo real: bloqueios revogam logins imediatamente e o plano contratado define as cotas operacionais.
          </p>
          <div className="p-3 rounded-2xl bg-[#0A0A0B] border border-white/[0.06] text-[11px] text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span>Senhas podem ser redefinidas individualmente na aba de Usuários com geração instantânea de chave temporária.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
