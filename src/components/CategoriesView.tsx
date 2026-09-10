import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  FolderTree,
  Package,
  Layers,
  Search,
  X,
  Sparkles,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { ProductCategory, ProductSubcategory, Product } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface CategoriesViewProps {
  products?: Product[];
  onRefreshData?: () => void | Promise<void>;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  products = [],
  onRefreshData,
}) => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [internalProducts, setInternalProducts] = useState<Product[]>(products);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Category Modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<ProductCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('emerald');

  // Subcategory Quick Add per category
  const [newSubNameMap, setNewSubNameMap] = useState<Record<string, string>>({});
  const [submittingSubMap, setSubmittingSubMap] = useState<Record<string, boolean>>({});

  // Deletion targets
  const [deleteCatTarget, setDeleteCatTarget] = useState<ProductCategory | null>(null);
  const [deleteSubTarget, setDeleteSubTarget] = useState<{ id: string; name: string; catName: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // In-use warning modal (when category/subcategory has linked products)
  const [inUseWarning, setInUseWarning] = useState<{
    type: 'category' | 'subcategory';
    name: string;
    parentCatName?: string;
    products: Product[];
  } | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (e) {
      console.warn('Erro ao buscar categorias:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setInternalProducts(data);
      }
    } catch (e) {
      console.warn('Erro ao buscar produtos:', e);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (products && products.length > 0) {
      setInternalProducts(products);
    }
  }, [products]);

  // Helpers to get products using a category or subcategory
  const getProductsForCategory = (name: string): Product[] => {
    const cleanName = (name || '').trim().toLowerCase();
    return internalProducts.filter(
      (p) => (p.category || '').trim().toLowerCase() === cleanName
    );
  };

  const getProductsForSubcategory = (catName: string, subName: string): Product[] => {
    const cleanSub = (subName || '').trim().toLowerCase();
    const cleanCat = (catName || '').trim().toLowerCase();
    return internalProducts.filter((p) => {
      const matchSub = (p.subcategory || '').trim().toLowerCase() === cleanSub;
      if (!matchSub) return false;
      if (!cleanCat) return true;
      return (p.category || '').trim().toLowerCase() === cleanCat;
    });
  };

  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(t);
  }, [notification]);

  const handleOpenCatModal = (cat?: ProductCategory) => {
    if (cat) {
      setEditingCat(cat);
      setCatName(cat.name);
      setCatColor(cat.color || 'emerald');
    } else {
      setEditingCat(null);
      setCatName('');
      setCatColor('emerald');
    }
    setShowCatModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    try {
      const payload = { name: catName.trim(), color: catColor };
      let res;
      if (editingCat) {
        res = await fetch(`/api/categories/${editingCat.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setShowCatModal(false);
        setNotification({
          type: 'success',
          message: editingCat
            ? `Categoria "${catName}" atualizada com sucesso!`
            : `Categoria "${catName}" cadastrada com sucesso!`,
        });
        await fetchCategories();
        if (onRefreshData) onRefreshData();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao salvar categoria');
      }
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Erro ao salvar categoria' });
    }
  };

  // Click handler for category deletion: checks usage first
  const handleRequestDeleteCategory = (cat: ProductCategory) => {
    const linked = getProductsForCategory(cat.name);
    if (linked.length > 0) {
      setInUseWarning({
        type: 'category',
        name: cat.name,
        products: linked,
      });
    } else {
      setDeleteCatTarget(cat);
    }
  };

  // Click handler for subcategory deletion: checks usage first
  const handleRequestDeleteSubcategory = (catName: string, sub: ProductSubcategory) => {
    const linked = getProductsForSubcategory(catName, sub.name);
    if (linked.length > 0) {
      setInUseWarning({
        type: 'subcategory',
        name: sub.name,
        parentCatName: catName,
        products: linked,
      });
    } else {
      setDeleteSubTarget({
        id: sub.id,
        name: sub.name,
        catName: catName,
      });
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCatTarget) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/categories/${deleteCatTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setNotification({
          type: 'success',
          message: `Categoria "${deleteCatTarget.name}" e suas subcategorias foram removidas.`,
        });
        setDeleteCatTarget(null);
        await fetchCategories();
        if (onRefreshData) onRefreshData();
      } else {
        setDeleteCatTarget(null);
        setNotification({
          type: 'error',
          message: data.error || 'Falha ao excluir categoria',
        });
      }
    } catch (e: any) {
      setDeleteCatTarget(null);
      setNotification({ type: 'error', message: e.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddSubcategory = async (categoryId: string) => {
    const subName = (newSubNameMap[categoryId] || '').trim();
    if (!subName) return;

    setSubmittingSubMap((prev) => ({ ...prev, [categoryId]: true }));
    try {
      const res = await fetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: categoryId, name: subName }),
      });

      if (res.ok) {
        setNewSubNameMap((prev) => ({ ...prev, [categoryId]: '' }));
        setNotification({
          type: 'success',
          message: `Subcategoria "${subName}" adicionada com sucesso!`,
        });
        await fetchCategories();
        if (onRefreshData) onRefreshData();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao adicionar subcategoria');
      }
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message });
    } finally {
      setSubmittingSubMap((prev) => ({ ...prev, [categoryId]: false }));
    }
  };

  const handleDeleteSubcategory = async () => {
    if (!deleteSubTarget) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/subcategories/${deleteSubTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setNotification({
          type: 'success',
          message: `Subcategoria "${deleteSubTarget.name}" removida com sucesso.`,
        });
        setDeleteSubTarget(null);
        await fetchCategories();
        if (onRefreshData) onRefreshData();
      } else {
        setDeleteSubTarget(null);
        setNotification({
          type: 'error',
          message: data.error || 'Falha ao excluir subcategoria',
        });
      }
    } catch (e: any) {
      setDeleteSubTarget(null);
      setNotification({ type: 'error', message: e.message });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered categories
  const filteredCategories = categories.filter((cat) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    if (cat.name.toLowerCase().includes(term)) return true;
    return cat.subcategories?.some((s) => s.name.toLowerCase().includes(term));
  });

  const totalSubcategories = categories.reduce((acc, cat) => acc + (cat.subcategories?.length || 0), 0);

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'sky':
        return {
          bg: 'bg-sky-500/10',
          border: 'border-sky-500/30',
          text: 'text-sky-400',
          badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        };
      case 'amber':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'purple':
        return {
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/30',
          text: 'text-purple-400',
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        };
      case 'rose':
        return {
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/30',
          text: 'text-rose-400',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        };
      case 'indigo':
        return {
          bg: 'bg-indigo-500/10',
          border: 'border-indigo-500/30',
          text: 'text-indigo-400',
          badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        };
      case 'emerald':
      default:
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification Banner */}
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
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.08] transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-emerald-400" />
            Estrutura de Categorias & Subcategorias
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Defina a taxonomia da sua oficina 3D (ex: <strong>Chaveiros & Brindes</strong> com subcategoria <strong>Natal</strong>).
            Essas opções alimentam a calculadora de custos e facilitam a filtragem no catálogo de produtos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleOpenCatModal()}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Categoria</span>
          </button>
        </div>
      </div>

      {/* Overview Stats Cards - Bento Style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#121215] border border-white/[0.08] rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Total de Categorias</span>
            <span className="text-xl font-bold text-white font-mono">{categories.length}</span>
          </div>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Total de Subcategorias</span>
            <span className="text-xl font-bold text-white font-mono">{totalSubcategories}</span>
          </div>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Produtos Cadastrados</span>
            <span className="text-xl font-bold text-white font-mono">{products.length}</span>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center gap-3 bg-[#121215] border border-white/[0.08] rounded-2xl px-4 py-2.5">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por categoria ou subcategoria (ex: Natal, Chaveiros, Suportes)..."
          className="bg-transparent border-none text-xs text-white placeholder:text-slate-500 w-full focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Categories Bento Grid */}
      {loading ? (
        <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-12 text-center text-slate-400 text-xs">
          Carregando categorias e subcategorias...
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400 mx-auto">
            <Tag className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">Nenhuma categoria encontrada</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? 'Tente ajustar sua busca ou limpar os termos digitados.'
              : 'Clique em "+ Nova Categoria" para criar sua primeira categoria de produtos.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredCategories.map((cat) => {
            const colorClasses = getColorClasses(cat.color || 'emerald');
            const subCount = cat.subcategories?.length || 0;
            const prodsInCat = getProductsForCategory(cat.name);

            return (
              <div
                key={cat.id}
                className="bg-[#121215] border border-white/[0.08] hover:border-white/[0.16] rounded-3xl p-5 space-y-4 shadow-sm transition flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  {/* Category Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className={`p-2 rounded-xl border ${colorClasses.bg} ${colorClasses.border} ${colorClasses.text}`}>
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          {cat.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-400">
                            {subCount} {subCount === 1 ? 'subcategoria' : 'subcategorias'}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-[11px] text-emerald-400 font-mono">
                            {prodsInCat.length} {prodsInCat.length === 1 ? 'produto vinculado' : 'produtos vinculados'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenCatModal(cat)}
                        className="text-slate-400 hover:text-sky-400 p-1.5 rounded-xl hover:bg-white/[0.06] transition cursor-pointer"
                        title="Editar nome da categoria"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestDeleteCategory(cat)}
                        className={`p-1.5 rounded-xl transition cursor-pointer ${
                          prodsInCat.length > 0
                            ? 'text-amber-400/80 hover:text-amber-400 hover:bg-amber-500/10'
                            : 'text-slate-400 hover:text-rose-400 hover:bg-white/[0.06]'
                        }`}
                        title={
                          prodsInCat.length > 0
                            ? `Categoria em uso (${prodsInCat.length} produtos). Clique para detalhes.`
                            : 'Excluir categoria'
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories List / Chips */}
                  <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>Subcategorias ativas:</span>
                      {subCount === 0 && <span className="text-slate-500 italic">Nenhuma ainda</span>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {cat.subcategories && cat.subcategories.length > 0 ? (
                        cat.subcategories.map((sub) => {
                          const prodsInSub = getProductsForSubcategory(cat.name, sub.name);

                          return (
                            <span
                              key={sub.id}
                              className="inline-flex items-center gap-1.5 bg-[#0A0A0B] border border-white/[0.1] hover:border-white/[0.2] px-2.5 py-1 rounded-xl text-xs text-slate-200 group transition"
                            >
                              <span className="font-medium">{sub.name}</span>
                              {prodsInSub.length > 0 && (
                                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1 rounded">
                                  {prodsInSub.length}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRequestDeleteSubcategory(cat.name, sub)}
                                className={`p-0.5 rounded transition cursor-pointer opacity-70 group-hover:opacity-100 ${
                                  prodsInSub.length > 0
                                    ? 'text-amber-400 hover:text-amber-300'
                                    : 'text-slate-500 hover:text-rose-400'
                                }`}
                                title={
                                  prodsInSub.length > 0
                                    ? `Subcategoria em uso (${prodsInSub.length} produtos). Clique para detalhes.`
                                    : `Excluir subcategoria "${sub.name}"`
                                }
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-500 italic py-1">
                          Adicione subcategorias para segmentar esta linha (ex: Natal, Games, Festas).
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline Quick-Add Subcategory Input */}
                <div className="pt-3 border-t border-white/[0.06]">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddSubcategory(cat.id);
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={newSubNameMap[cat.id] || ''}
                      onChange={(e) =>
                        setNewSubNameMap((prev) => ({ ...prev, [cat.id]: e.target.value }))
                      }
                      placeholder={`Nova subcategoria em "${cat.name}"...`}
                      className="flex-1 bg-[#0A0A0B] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                    />
                    <button
                      type="submit"
                      disabled={
                        submittingSubMap[cat.id] || !(newSubNameMap[cat.id] || '').trim()
                      }
                      className="bg-white/[0.08] hover:bg-emerald-500 hover:text-slate-950 text-slate-300 font-bold px-3 py-2 rounded-xl text-xs transition disabled:opacity-40 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Creation / Editing Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#121215] border border-white/[0.1] rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                {editingCat ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCatModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ex: Chaveiros & Brindes, Decoração, Acessórios..."
                  className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Cor de Identificação
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    { id: 'emerald', bg: 'bg-emerald-500' },
                    { id: 'sky', bg: 'bg-sky-500' },
                    { id: 'amber', bg: 'bg-amber-500' },
                    { id: 'purple', bg: 'bg-purple-500' },
                    { id: 'rose', bg: 'bg-rose-500' },
                    { id: 'indigo', bg: 'bg-indigo-500' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCatColor(c.id)}
                      className={`h-8 rounded-xl ${c.bg} transition-transform ${
                        catColor === c.id ? 'ring-2 ring-white scale-105' : 'opacity-60 hover:opacity-100'
                      }`}
                      title={c.id}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/[0.1] text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition"
                >
                  {editingCat ? 'Salvar Alterações' : 'Criar Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-Use Warning Modal: Blocks deletion and explains which products are using it */}
      {inUseWarning && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
          onClick={() => setInUseWarning(null)}
        >
          <div
            className="bg-[#121215] border border-amber-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setInUseWarning(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/[0.06] transition cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon & Title */}
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="pr-6">
                <h3 className="text-base font-bold text-white leading-snug">
                  {inUseWarning.type === 'category' ? 'Categoria em Uso' : 'Subcategoria em Uso'}
                </h3>
                <p className="text-sm font-semibold text-amber-400 mt-0.5 break-words font-mono">
                  {inUseWarning.name}
                  {inUseWarning.parentCatName ? ` (${inUseWarning.parentCatName})` : ''}
                </p>
              </div>
            </div>

            {/* Explanatory Message */}
            <p className="text-xs text-slate-300 leading-relaxed">
              Esta {inUseWarning.type === 'category' ? 'categoria' : 'subcategoria'} não pode ser excluída porque está associada a{' '}
              <strong className="text-white font-mono">{(inUseWarning.products || []).length} produto(s)</strong> no catálogo:
            </p>

            {/* List of Products using this Category / Subcategory */}
            <div className="space-y-1.5">
              <div className="max-h-44 overflow-y-auto space-y-1.5 p-2.5 bg-[#0A0A0B] rounded-2xl border border-white/[0.08] divide-y divide-white/[0.04]">
                {(inUseWarning.products || []).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 pt-1.5 first:pt-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-xs text-slate-200 font-medium truncate">{p.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 bg-white/[0.05] px-1.5 py-0.5 rounded">
                      {p.ready_stock_qty ?? 0} un
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-slate-300 bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl leading-relaxed">
              ⚠️ <strong>Como liberar a exclusão:</strong> Abra o <strong>Catálogo de Produtos</strong>, altere a categoria ou subcategoria dos produtos listados acima e salve. Após isso, você poderá excluir com segurança.
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setInUseWarning(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition shadow-sm cursor-pointer"
              >
                Entendi, Manter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation (Only when NOT in use) */}
      {deleteCatTarget && (
        <ConfirmModal
          isOpen={true}
          title={`Excluir categoria "${deleteCatTarget.name}"?`}
          message="Esta categoria não está sendo utilizada por nenhum produto. Ela e todas as suas subcategorias serão excluídas do sistema."
          confirmText="Sim, excluir categoria"
          cancelText="Cancelar"
          isDanger={true}
          isLoading={isDeleting}
          onConfirm={handleDeleteCategory}
          onClose={() => setDeleteCatTarget(null)}
          onCancel={() => setDeleteCatTarget(null)}
        />
      )}

      {/* Delete Subcategory Confirmation (Only when NOT in use) */}
      {deleteSubTarget && (
        <ConfirmModal
          isOpen={true}
          title={`Excluir subcategoria "${deleteSubTarget.name}"?`}
          message={`Esta subcategoria não está sendo utilizada por nenhum produto. Ela será removida da categoria "${deleteSubTarget.catName}".`}
          confirmText="Sim, excluir subcategoria"
          cancelText="Cancelar"
          isDanger={true}
          isLoading={isDeleting}
          onConfirm={handleDeleteSubcategory}
          onClose={() => setDeleteSubTarget(null)}
          onCancel={() => setDeleteSubTarget(null)}
        />
      )}
    </div>
  );
};
