import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { SubscriptionPlan } from '../../types';
import { AVAILABLE_PLAN_FEATURES, CATEGORY_LABELS } from '../../data/planFeatures';

export const AdminFeaturesTab: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/admin/plans');
        if (res.ok) {
          const data = await res.json();
          setPlans(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const categories = ['core', 'production', 'stock', 'sales', 'integrations'] as const;

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Carregando matriz de recursos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#121215] border border-white/[0.08] p-6 rounded-3xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            Feature Gating
          </span>
          <span className="text-xs text-slate-500">•</span>
          <span className="text-xs text-slate-400">Permissões de Módulos</span>
        </div>
        <h2 className="text-xl font-black text-white mt-1">
          Matriz de Recursos & Funcionalidades por Plano
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Compare a disponibilidade de cada ferramenta do PrintCraft em cada um dos planos de assinatura ativos.
        </p>
      </div>

      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b border-white/[0.08] text-xs text-slate-400">
              <th className="py-4 px-4 font-bold text-white w-1/3">
                Funcionalidade / Módulo
              </th>
              {plans.map((p) => (
                <th key={p.id} className="py-4 px-4 text-center">
                  <span className="font-bold text-white block">{p.name}</span>
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold block">
                    {p.price === 0 ? 'Grátis' : `R$ ${p.price.toFixed(2)}`}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-xs">
            {categories.map((catKey) => {
              const catDef = CATEGORY_LABELS[catKey];
              const catFeatures = AVAILABLE_PLAN_FEATURES.filter((f) => f.category === catKey);

              return (
                <React.Fragment key={catKey}>
                  {/* Category Header Row */}
                  <tr className="bg-[#141418]">
                    <td
                      colSpan={plans.length + 1}
                      className="py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider text-emerald-400"
                    >
                      {catDef.label}
                    </td>
                  </tr>

                  {/* Feature Rows */}
                  {catFeatures.map((feat) => (
                    <tr key={feat.key} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>{feat.title}</span>
                          {feat.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 font-mono">
                              {feat.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                          {feat.description}
                        </p>
                      </td>

                      {plans.map((p) => {
                        const hasFeature = p.features?.includes(feat.key);
                        return (
                          <td key={p.id} className="py-3 px-4 text-center">
                            {hasFeature ? (
                              <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-white/[0.03] text-slate-600 flex items-center justify-center mx-auto">
                                <X className="w-3 h-3" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
