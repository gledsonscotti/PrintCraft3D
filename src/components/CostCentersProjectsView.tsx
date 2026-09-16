import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Briefcase,
  Layers,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Printer,
  Wrench,
  Sparkles,
  User,
  Calendar,
  FileText,
  Check,
  ArrowRight,
  X,
  RefreshCw,
  Box,
  Hammer,
  ShieldAlert,
  Percent,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileDown
} from 'lucide-react';
import {
  CostCenter,
  CustomProject,
  ProjectAllocation,
  CustomProjectStatus,
  CustomProjectPriority,
  AllocationResourceType,
  Filament,
  Supply,
  Client,
  Printer as PrinterType
} from '../types';
import { safeFetchJson } from '../utils/api';

interface CostCentersProjectsViewProps {
  filaments?: Filament[];
  supplies?: Supply[];
  clients?: Client[];
  printers?: PrinterType[];
  settings?: any;
  onRefreshData?: () => void;
}

const STATUS_CONFIG: Record<CustomProjectStatus, { label: string; color: string; bg: string; border: string }> = {
  draft: { label: 'Rascunho', color: 'text-slate-300', bg: 'bg-slate-500/15', border: 'border-slate-500/30' },
  quote: { label: 'Orçamento', color: 'text-amber-300', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
  approved: { label: 'Aprovado', color: 'text-sky-300', bg: 'bg-sky-500/15', border: 'border-sky-500/30' },
  in_progress: { label: 'Em Produção', color: 'text-indigo-300', bg: 'bg-indigo-500/15', border: 'border-indigo-500/30' },
  completed: { label: 'Concluído', color: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
  delivered: { label: 'Entregue / Faturado', color: 'text-teal-300', bg: 'bg-teal-500/15', border: 'border-teal-500/30' },
  cancelled: { label: 'Cancelado', color: 'text-rose-300', bg: 'bg-rose-500/15', border: 'border-rose-500/30' },
};

const PRIORITY_CONFIG: Record<CustomProjectPriority, { label: string; badge: string }> = {
  low: { label: 'Baixa', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  normal: { label: 'Normal', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  high: { label: 'Alta', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  urgent: { label: 'Urgente', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse' },
};

const RESOURCE_CONFIG: Record<AllocationResourceType, { label: string; icon: React.ComponentType<any>; color: string; bg: string }> = {
  filament: { label: 'Filamento', icon: Box, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  supply: { label: 'Insumo / Ferragem', icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  machine_time: { label: 'Tempo de Máquina', icon: Printer, color: 'text-sky-400', bg: 'bg-sky-500/15' },
  labor: { label: 'Mão de Obra', icon: Hammer, color: 'text-purple-400', bg: 'bg-purple-500/15' },
  outsourced: { label: 'Terceirizado / Extra', icon: Briefcase, color: 'text-rose-400', bg: 'bg-rose-500/15' },
};

export function CostCentersProjectsView({
  filaments = [],
  supplies = [],
  clients = [],
  printers = [],
  settings = {},
  onRefreshData,
}: CostCentersProjectsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'projects' | 'cost_centers'>('projects');
  const [projects, setProjects] = useState<CustomProject[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [costCenterFilter, setCostCenterFilter] = useState<string>('all');

  // Allocation Modal / Drawer
  const [selectedProjectForAlloc, setSelectedProjectForAlloc] = useState<CustomProject | null>(null);
  const [allocations, setAllocations] = useState<ProjectAllocation[]>([]);
  const [loadingAllocations, setLoadingAllocations] = useState<boolean>(false);
  const [allocActiveTab, setAllocActiveTab] = useState<AllocationResourceType>('filament');

  // New Allocation Form States
  const [allocFilamentId, setAllocFilamentId] = useState<string>('');
  const [allocFilamentWeightG, setAllocFilamentWeightG] = useState<number>(100);
  const [allocDeductStock, setAllocDeductStock] = useState<boolean>(true);

  const [allocSupplyId, setAllocSupplyId] = useState<string>('');
  const [allocSupplyQty, setAllocSupplyQty] = useState<number>(1);

  const [allocPrinterId, setAllocPrinterId] = useState<string>('');
  const [allocMachineHours, setAllocMachineHours] = useState<number>(5);

  const [allocLaborType, setAllocLaborType] = useState<string>('Modelagem 3D & Preparação');
  const [allocLaborHours, setAllocLaborHours] = useState<number>(2);
  const [allocLaborRate, setAllocLaborRate] = useState<number>(35);

  const [allocOutsourcedDesc, setAllocOutsourcedDesc] = useState<string>('');
  const [allocOutsourcedCost, setAllocOutsourcedCost] = useState<number>(50);
  const [allocNotes, setAllocNotes] = useState<string>('');
  const [isSubmittingAlloc, setIsSubmittingAlloc] = useState<boolean>(false);

  // Project Modal State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<CustomProject | null>(null);
  const [projectFormCode, setProjectFormCode] = useState<string>('');
  const [projectFormTitle, setProjectFormTitle] = useState<string>('');
  const [projectFormDescription, setProjectFormDescription] = useState<string>('');
  const [projectFormClientId, setProjectFormClientId] = useState<string>('');
  const [projectFormClientName, setProjectFormClientName] = useState<string>('');
  const [projectFormCostCenterId, setProjectFormCostCenterId] = useState<string>('');
  const [projectFormStatus, setProjectFormStatus] = useState<CustomProjectStatus>('quote');
  const [projectFormPriority, setProjectFormPriority] = useState<CustomProjectPriority>('normal');
  const [projectFormTargetDate, setProjectFormTargetDate] = useState<string>('');
  const [projectFormAgreedPrice, setProjectFormAgreedPrice] = useState<number>(500);
  const [projectFormAmountPaid, setProjectFormAmountPaid] = useState<number>(0);
  const [projectFormNotes, setProjectFormNotes] = useState<string>('');
  const [isSubmittingProject, setIsSubmittingProject] = useState<boolean>(false);

  // Cost Center Modal State
  const [isCostCenterModalOpen, setIsCostCenterModalOpen] = useState<boolean>(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [ccFormCode, setCcFormCode] = useState<string>('');
  const [ccFormName, setCcFormName] = useState<string>('');
  const [ccFormDescription, setCcFormDescription] = useState<string>('');
  const [ccFormColor, setCcFormColor] = useState<string>('emerald');
  const [ccFormBudgetMonthly, setCcFormBudgetMonthly] = useState<number>(3000);
  const [isSubmittingCc, setIsSubmittingCc] = useState<boolean>(false);

  // Fetch initial data
  useEffect(() => {
    fetchCostCentersAndProjects();
  }, []);

  const fetchCostCentersAndProjects = async () => {
    setLoading(true);
    try {
      const [ccData, prjData] = await Promise.all([
        safeFetchJson<CostCenter[]>('/api/cost-centers', undefined, []),
        safeFetchJson<CustomProject[]>('/api/custom-projects', undefined, []),
      ]);
      setCostCenters(Array.isArray(ccData) ? ccData : []);
      setProjects(Array.isArray(prjData) ? prjData : []);
    } catch (err: any) {
      console.error('Error fetching cost centers & projects:', err);
      setErrorMsg('Não foi possível carregar os Centros de Custos e Projetos.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocationsForProject = async (projectId: string) => {
    setLoadingAllocations(true);
    try {
      const data = await safeFetchJson<ProjectAllocation[]>(`/api/custom-projects/${projectId}/allocations`, undefined, []);
      setAllocations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading allocations:', err);
    } finally {
      setLoadingAllocations(false);
    }
  };

  const openAllocationsDrawer = (project: CustomProject) => {
    setSelectedProjectForAlloc(project);
    fetchAllocationsForProject(project.id);
    // Set default resource selections
    if (filaments.length > 0 && !allocFilamentId) {
      setAllocFilamentId(filaments[0].id);
    }
    if (supplies.length > 0 && !allocSupplyId) {
      setAllocSupplyId(supplies[0].id);
    }
    if (printers.length > 0 && !allocPrinterId) {
      setAllocPrinterId(printers[0].id);
    }
  };

  // Close drawer
  const closeAllocationsDrawer = () => {
    setSelectedProjectForAlloc(null);
    setAllocations([]);
    fetchCostCentersAndProjects();
  };

  // Handle Add Allocation
  const handleAddAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForAlloc) return;

    setIsSubmittingAlloc(true);
    setErrorMsg(null);

    let payload: Partial<ProjectAllocation> & { resource_type: AllocationResourceType } = {
      resource_type: allocActiveTab,
      stock_deducted: allocDeductStock ? 1 : 0,
      notes: allocNotes,
    };

    if (allocActiveTab === 'filament') {
      const fil = filaments.find((f) => f.id === allocFilamentId);
      if (!fil) {
        setErrorMsg('Selecione um filamento válido do estoque.');
        setIsSubmittingAlloc(false);
        return;
      }
      const costPerKg = (fil.cost_per_spool / ((fil.total_weight_g || 1000) / 1000)) || 90;
      const unitCostPerGram = costPerKg / 1000;
      payload = {
        ...payload,
        resource_id: fil.id,
        resource_name: `${fil.brand || ''} ${fil.material} (${fil.color || 'Padrão'})`.trim(),
        quantity: Number(allocFilamentWeightG) || 10,
        unit: 'g',
        unit_cost: unitCostPerGram,
        total_cost: Math.round((Number(allocFilamentWeightG) || 10) * unitCostPerGram * 100) / 100,
      };
    } else if (allocActiveTab === 'supply') {
      const sup = supplies.find((s) => s.id === allocSupplyId);
      if (!sup) {
        setErrorMsg('Selecione um insumo válido do estoque.');
        setIsSubmittingAlloc(false);
        return;
      }
      payload = {
        ...payload,
        resource_id: sup.id,
        resource_name: sup.name,
        quantity: Number(allocSupplyQty) || 1,
        unit: sup.unit || 'un',
        unit_cost: sup.unit_cost || 0,
        total_cost: Math.round((Number(allocSupplyQty) || 1) * (sup.unit_cost || 0) * 100) / 100,
      };
    } else if (allocActiveTab === 'machine_time') {
      const prt = printers.find((p) => p.id === allocPrinterId);
      const prtName = prt ? prt.name : 'Impressora 3D';
      const powerWatts = prt?.total_power_watts || 280;
      const kwhRate = settings?.electricity_cost_kwh || 0.95;
      const hourlyEnergyCost = (powerWatts / 1000) * kwhRate;
      const hourlyDeprecCost = prt?.hourly_depreciation || 0.60;
      const totalHourlyRate = Math.round((hourlyEnergyCost + hourlyDeprecCost) * 100) / 100;
      const hours = Number(allocMachineHours) || 1;

      payload = {
        ...payload,
        resource_id: prt ? prt.id : null,
        resource_name: `${prtName} (Energia + Deprec. R$${totalHourlyRate.toFixed(2)}/h)`,
        quantity: hours,
        unit: 'h',
        unit_cost: totalHourlyRate,
        total_cost: Math.round(hours * totalHourlyRate * 100) / 100,
        stock_deducted: 0,
      };
    } else if (allocActiveTab === 'labor') {
      const hours = Number(allocLaborHours) || 1;
      const rate = Number(allocLaborRate) || 30;
      payload = {
        ...payload,
        resource_id: null,
        resource_name: `Mão de Obra: ${allocLaborType}`,
        quantity: hours,
        unit: 'h',
        unit_cost: rate,
        total_cost: Math.round(hours * rate * 100) / 100,
        stock_deducted: 0,
      };
    } else if (allocActiveTab === 'outsourced') {
      const cost = Number(allocOutsourcedCost) || 0;
      payload = {
        ...payload,
        resource_id: null,
        resource_name: allocOutsourcedDesc.trim() || 'Serviço Terceirizado / Custo Extra',
        quantity: 1,
        unit: 'serviço',
        unit_cost: cost,
        total_cost: cost,
        stock_deducted: 0,
      };
    }

    try {
      const res = await fetch(`/api/custom-projects/${selectedProjectForAlloc.id}/allocations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao alocar recurso no projeto.');
      }

      setSuccessMsg('Recurso alocado com sucesso no projeto!');
      setTimeout(() => setSuccessMsg(null), 3000);
      setAllocNotes('');

      // Refresh allocations and project data
      await fetchAllocationsForProject(selectedProjectForAlloc.id);
      await fetchCostCentersAndProjects();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar alocação.');
    } finally {
      setIsSubmittingAlloc(false);
    }
  };

  // Handle Delete Allocation
  const handleDeleteAllocation = async (allocId: string, stockDeducted: boolean | number) => {
    if (!selectedProjectForAlloc) return;
    const revertStock = stockDeducted ? window.confirm('Deseja devolver este material/insumo de volta ao estoque da oficina?') : false;

    try {
      const res = await fetch(
        `/api/custom-projects/${selectedProjectForAlloc.id}/allocations/${allocId}?revert_stock=${revertStock ? 'true' : 'false'}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        throw new Error('Falha ao remover alocação.');
      }
      setSuccessMsg('Alocação removida com sucesso!');
      setTimeout(() => setSuccessMsg(null), 2500);
      await fetchAllocationsForProject(selectedProjectForAlloc.id);
      await fetchCostCentersAndProjects();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Handle Deduct Stock for existing allocation
  const handleDeductStockNow = async (allocId: string) => {
    if (!selectedProjectForAlloc) return;
    try {
      const res = await fetch(`/api/custom-projects/${selectedProjectForAlloc.id}/allocations/${allocId}/deduct-stock`, {
        method: 'PUT',
      });
      if (!res.ok) throw new Error('Falha ao dar baixa no estoque.');
      setSuccessMsg('Baixa no estoque realizada com sucesso!');
      setTimeout(() => setSuccessMsg(null), 2500);
      await fetchAllocationsForProject(selectedProjectForAlloc.id);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Quick Action: Create OP from Project
  const handleCreateOP = async (project: CustomProject) => {
    if (project.production_order_id) {
      alert(`Este projeto já possui a Ordem de Produção vinculada: ${project.op_number || project.production_order_id}`);
      return;
    }

    if (!window.confirm(`Deseja gerar automaticamente a Ordem de Produção (OP) para o projeto "${project.title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/custom-projects/${project.id}/create-op`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao criar OP.');

      setSuccessMsg(`Ordem de Produção ${data.op_number} criada e vinculada com sucesso ao projeto!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchCostCentersAndProjects();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Quick Action: Create Receivable Account from Project
  const handleCreateReceivable = async (project: CustomProject) => {
    const pending = Math.max(0, (Number(project.agreed_price) || 0) - (Number(project.amount_paid) || 0));
    if (pending <= 0) {
      alert('Este projeto já está 100% quitado!');
      return;
    }

    if (!window.confirm(`Deseja lançar um título no Contas a Receber no valor de R$ ${pending.toFixed(2)} para ${project.client_name}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/custom-projects/${project.id}/create-receivable`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao lançar conta a receber.');

      setSuccessMsg(`Título de R$ ${pending.toFixed(2)} lançado no Contas a Receber com sucesso!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Open Project Modal for Create or Edit
  const openProjectModal = (project?: CustomProject) => {
    if (project) {
      setEditingProject(project);
      setProjectFormCode(project.code);
      setProjectFormTitle(project.title);
      setProjectFormDescription(project.description || '');
      setProjectFormClientId(project.client_id || '');
      setProjectFormClientName(project.client_name || '');
      setProjectFormCostCenterId(project.cost_center_id);
      setProjectFormStatus(project.status);
      setProjectFormPriority(project.priority);
      setProjectFormTargetDate(project.target_delivery_date || '');
      setProjectFormAgreedPrice(project.agreed_price);
      setProjectFormAmountPaid(project.amount_paid);
      setProjectFormNotes(project.notes || '');
    } else {
      setEditingProject(null);
      const year = new Date().getFullYear();
      const randomSeq = String(Math.floor(Math.random() * 900) + 100);
      setProjectFormCode(`PRJ-${year}-${randomSeq}`);
      setProjectFormTitle('');
      setProjectFormDescription('');
      setProjectFormClientId('');
      setProjectFormClientName('');
      setProjectFormCostCenterId(costCenters[0]?.id || 'cc-1');
      setProjectFormStatus('quote');
      setProjectFormPriority('normal');
      const target = new Date();
      target.setDate(target.getDate() + 10);
      setProjectFormTargetDate(target.toISOString().split('T')[0]);
      setProjectFormAgreedPrice(600);
      setProjectFormAmountPaid(0);
      setProjectFormNotes('');
    }
    setIsProjectModalOpen(true);
  };

  // Submit Project Form
  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectFormTitle.trim() || !projectFormCostCenterId) {
      setErrorMsg('Título e Centro de Custos são campos obrigatórios.');
      return;
    }

    setIsSubmittingProject(true);
    setErrorMsg(null);

    const payload = {
      code: projectFormCode,
      title: projectFormTitle,
      description: projectFormDescription,
      client_id: projectFormClientId || null,
      client_name: projectFormClientName.trim() || 'Cliente Avulso',
      cost_center_id: projectFormCostCenterId,
      status: projectFormStatus,
      priority: projectFormPriority,
      target_delivery_date: projectFormTargetDate || null,
      agreed_price: Number(projectFormAgreedPrice) || 0,
      amount_paid: Number(projectFormAmountPaid) || 0,
      notes: projectFormNotes,
    };

    try {
      const url = editingProject ? `/api/custom-projects/${editingProject.id}` : '/api/custom-projects';
      const method = editingProject ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao salvar projeto.');
      }

      setSuccessMsg(editingProject ? 'Projeto atualizado com sucesso!' : 'Projeto/Encomenda cadastrado com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
      setIsProjectModalOpen(false);
      fetchCostCentersAndProjects();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmittingProject(false);
    }
  };

  // Delete Project
  const handleDeleteProject = async (id: string, title: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o projeto "${title}" e todas as suas alocações de custos?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/custom-projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir projeto.');
      setSuccessMsg('Projeto excluído com sucesso.');
      setTimeout(() => setSuccessMsg(null), 2500);
      fetchCostCentersAndProjects();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Open Cost Center Modal
  const openCostCenterModal = (cc?: CostCenter) => {
    if (cc) {
      setEditingCostCenter(cc);
      setCcFormCode(cc.code);
      setCcFormName(cc.name);
      setCcFormDescription(cc.description || '');
      setCcFormColor(cc.color || 'emerald');
      setCcFormBudgetMonthly(cc.budget_monthly || 0);
    } else {
      setEditingCostCenter(null);
      const nextNum = costCenters.length + 1;
      setCcFormCode(`CC-0${nextNum}`);
      setCcFormName('');
      setCcFormDescription('');
      setCcFormColor('emerald');
      setCcFormBudgetMonthly(3000);
    }
    setIsCostCenterModalOpen(true);
  };

  // Submit Cost Center Form
  const handleSubmitCostCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ccFormCode.trim() || !ccFormName.trim()) {
      setErrorMsg('Código e Nome do Centro de Custos são obrigatórios.');
      return;
    }

    setIsSubmittingCc(true);
    setErrorMsg(null);

    const payload = {
      code: ccFormCode,
      name: ccFormName,
      description: ccFormDescription,
      color: ccFormColor,
      budget_monthly: Number(ccFormBudgetMonthly) || 0,
      is_active: 1,
    };

    try {
      const url = editingCostCenter ? `/api/cost-centers/${editingCostCenter.id}` : '/api/cost-centers';
      const method = editingCostCenter ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao salvar Centro de Custos.');
      }

      setSuccessMsg(editingCostCenter ? 'Centro de Custos atualizado!' : 'Novo Centro de Custos criado com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
      setIsCostCenterModalOpen(false);
      fetchCostCentersAndProjects();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmittingCc(false);
    }
  };

  // Delete Cost Center
  const handleDeleteCostCenter = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o Centro de Custos "${name}"? Os projetos vinculados serão realocados para outro centro.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/cost-centers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir Centro de Custos.');
      setSuccessMsg('Centro de Custos excluído com sucesso.');
      setTimeout(() => setSuccessMsg(null), 2500);
      fetchCostCentersAndProjects();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchSearch =
        searchTerm === '' ||
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.client_name && p.client_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchCC = costCenterFilter === 'all' || p.cost_center_id === costCenterFilter;

      return matchSearch && matchStatus && matchCC;
    });
  }, [projects, searchTerm, statusFilter, costCenterFilter]);

  // Overall Financial KPIs
  const kpis = useMemo(() => {
    const totalAgreedRevenue = projects.reduce((sum, p) => sum + (Number(p.agreed_price) || 0), 0);
    const totalAllocatedCost = projects.reduce((sum, p) => sum + (Number(p.total_allocated_cost) || 0), 0);
    const totalProfit = totalAgreedRevenue - totalAllocatedCost;
    const avgMargin = totalAgreedRevenue > 0 ? (totalProfit / totalAgreedRevenue) * 100 : 0;
    const totalReceived = projects.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0);
    const totalPending = Math.max(0, totalAgreedRevenue - totalReceived);
    const totalBudgets = costCenters.reduce((sum, cc) => sum + (Number(cc.budget_monthly) || 0), 0);

    return {
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => p.status === 'in_progress' || p.status === 'approved').length,
      completedProjects: projects.filter((p) => p.status === 'completed' || p.status === 'delivered').length,
      totalAgreedRevenue,
      totalAllocatedCost,
      totalProfit,
      avgMargin,
      totalReceived,
      totalPending,
      totalBudgets,
    };
  }, [projects, costCenters]);

  // Allocation breakdown for drawer
  const allocationSummary = useMemo(() => {
    let filamentCost = 0;
    let supplyCost = 0;
    let machineCost = 0;
    let laborCost = 0;
    let outsourcedCost = 0;

    allocations.forEach((a) => {
      const cost = Number(a.total_cost) || 0;
      if (a.resource_type === 'filament') filamentCost += cost;
      else if (a.resource_type === 'supply') supplyCost += cost;
      else if (a.resource_type === 'machine_time') machineCost += cost;
      else if (a.resource_type === 'labor') laborCost += cost;
      else if (a.resource_type === 'outsourced') outsourcedCost += cost;
    });

    const totalCost = filamentCost + supplyCost + machineCost + laborCost + outsourcedCost;
    const agreedPrice = Number(selectedProjectForAlloc?.agreed_price) || 0;
    const profit = agreedPrice - totalCost;
    const marginPercent = agreedPrice > 0 ? (profit / agreedPrice) * 100 : 0;

    return {
      filamentCost,
      supplyCost,
      machineCost,
      laborCost,
      outsourcedCost,
      totalCost,
      profit,
      marginPercent,
    };
  }, [allocations, selectedProjectForAlloc]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receita Total Contratada */}
        <div className="p-4 rounded-2xl bg-[#18181b] border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Receita Total de Encomendas</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            R$ {kpis.totalAgreedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Recebido: R$ {kpis.totalReceived.toFixed(2)}</span>
            <span className="text-amber-400 font-medium">A Receber: R$ {kpis.totalPending.toFixed(2)}</span>
          </div>
        </div>

        {/* Custo Total de Insumos Alocados */}
        <div className="p-4 rounded-2xl bg-[#18181b] border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Custos Alocados a Projetos</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            R$ {kpis.totalAllocatedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Filamentos + Insumos + Horas Máquina + Mão de Obra
          </div>
        </div>

        {/* Lucro Líquido Realizado */}
        <div className="p-4 rounded-2xl bg-[#18181b] border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Resultado Líquido</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${kpis.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            R$ {kpis.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
            <span>Margem média:</span>
            <span className={`font-bold ${kpis.avgMargin >= 40 ? 'text-emerald-400' : kpis.avgMargin >= 20 ? 'text-amber-400' : 'text-rose-400'}`}>
              {kpis.avgMargin.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Projetos & Centros de Custo */}
        <div className="p-4 rounded-2xl bg-[#18181b] border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Status Operacional</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {kpis.activeProjects} <span className="text-xs font-normal text-slate-400">ativos em produção</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>{kpis.totalProjects} projetos totais</span>
            <span className="text-purple-400 font-medium">{costCenters.length} Centros de Custos</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('projects')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'projects'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white bg-[#1c1c20] border border-white/[0.06]'
            }`}
          >
            <Briefcase className="w-4 h-4 text-emerald-400" />
            <span>Projetos & Encomendas Sob Medida</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/10 text-white">
              {projects.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('cost_centers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'cost_centers'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white bg-[#1c1c20] border border-white/[0.06]'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Centros de Custo & Absorção</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/10 text-white">
              {costCenters.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchCostCentersAndProjects}
            className="p-2.5 rounded-xl bg-[#1c1c20] hover:bg-[#25252a] text-slate-400 hover:text-white border border-white/[0.08] transition"
            title="Atualizar dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {activeSubTab === 'projects' ? (
            <button
              type="button"
              onClick={() => openProjectModal()}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Encomenda / Projeto</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openCostCenterModal()}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Centro de Custo</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PROJETOS & ENCOMENDAS */}
      {/* ========================================================================= */}
      {activeSubTab === 'projects' && (
        <div className="space-y-4">
          {/* Search and Filters Bar */}
          <div className="p-3 rounded-2xl bg-[#18181b] border border-white/[0.08] flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código, título da encomenda ou cliente..."
                className="w-full pl-9 pr-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 transition shrink-0"
              >
                <option value="all">Todos os Status</option>
                <option value="draft">Rascunho</option>
                <option value="quote">Orçamento</option>
                <option value="approved">Aprovado</option>
                <option value="in_progress">Em Produção</option>
                <option value="completed">Concluído</option>
                <option value="delivered">Entregue / Faturado</option>
                <option value="cancelled">Cancelado</option>
              </select>

              <select
                value={costCenterFilter}
                onChange={(e) => setCostCenterFilter(e.target.value)}
                className="px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 transition shrink-0"
              >
                <option value="all">Todos Centros de Custo</option>
                {costCenters.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code} - {cc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Projects Cards List */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              <span>Carregando projetos e custos alocados...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#18181b] border border-white/[0.08] text-center text-slate-400 text-xs">
              <Box className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="font-semibold text-slate-300">Nenhum projeto encontrado com os filtros selecionados.</p>
              <p className="mt-1 text-slate-500">Crie uma nova encomenda sob medida para começar a alocar filamentos e insumos.</p>
              <button
                type="button"
                onClick={() => openProjectModal()}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs inline-flex items-center gap-2 hover:bg-emerald-600 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Encomenda</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredProjects.map((project) => {
                const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.quote;
                const priorityCfg = PRIORITY_CONFIG[project.priority] || PRIORITY_CONFIG.normal;
                const agreed = Number(project.agreed_price) || 0;
                const cost = Number(project.total_allocated_cost) || 0;
                const profit = agreed - cost;
                const margin = agreed > 0 ? (profit / agreed) * 100 : 0;
                const paid = Number(project.amount_paid) || 0;
                const pending = Math.max(0, agreed - paid);

                return (
                  <div
                    key={project.id}
                    className="p-5 rounded-2xl bg-[#18181b] border border-white/[0.08] hover:border-white/[0.16] transition space-y-4"
                  >
                    {/* Card Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                      <div className="flex items-start gap-3">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-xs font-bold shrink-0">
                          {project.code}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            {project.title}
                            {project.op_number && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold border border-indigo-500/30">
                                {project.op_number}
                              </span>
                            )}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-500" />
                              <strong className="text-slate-200">{project.client_name || 'Cliente Avulso'}</strong>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-slate-300">{project.cost_center_name || 'Centro de Custos'}</span>
                            </span>
                            {project.target_delivery_date && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-400">
                                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                  Prazo: {new Date(project.target_delivery_date).toLocaleDateString('pt-BR')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Badges & Actions */}
                      <div className="flex items-center gap-2 self-start md:self-auto">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                          {statusCfg.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${priorityCfg.badge}`}>
                          {priorityCfg.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => openProjectModal(project)}
                          className="p-1.5 rounded-lg bg-[#1c1c20] hover:bg-[#25252a] text-slate-400 hover:text-white transition"
                          title="Editar Encomenda"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(project.id, project.title)}
                          className="p-1.5 rounded-lg bg-[#1c1c20] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                          title="Excluir Encomenda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Financial & Allocation Indicators Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#141416] p-3 rounded-xl border border-white/[0.04]">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Preço Acordado</span>
                        <span className="text-sm font-bold text-white">
                          R$ {agreed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {paid > 0 ? `Pago: R$ ${paid.toFixed(2)}` : 'Nenhum sinal pago'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Custo Alocado</span>
                        <span className="text-sm font-bold text-rose-300">
                          R$ {cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {project.allocations_count || 0} recursos alocados
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Lucro Líquido</span>
                        <span className={`text-sm font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Margem: {margin.toFixed(1)}%
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Saldo a Receber</span>
                        <span className={`text-sm font-bold ${pending > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          R$ {pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {pending === 0 ? 'Quitado' : 'Pendente de quitação'}
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Footer Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      {/* Left side actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openAllocationsDrawer(project)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold text-xs border border-emerald-500/30 flex items-center gap-2 transition"
                        >
                          <Layers className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Alocação de Insumos ({project.allocations_count || 0})</span>
                        </button>

                        {!project.production_order_id ? (
                          <button
                            type="button"
                            onClick={() => handleCreateOP(project)}
                            className="px-3 py-1.5 rounded-xl bg-[#1c1c20] hover:bg-[#25252a] text-slate-300 hover:text-white font-semibold text-xs border border-white/[0.08] flex items-center gap-1.5 transition"
                            title="Gerar Ordem de Produção no PCP"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Gerar OP</span>
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 text-[11px] rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                            <Check className="w-3 h-3 text-indigo-400" />
                            <span>OP Vinculada: {project.op_number}</span>
                          </span>
                        )}

                        {pending > 0 && (
                          <button
                            type="button"
                            onClick={() => handleCreateReceivable(project)}
                            className="px-3 py-1.5 rounded-xl bg-[#1c1c20] hover:bg-[#25252a] text-slate-300 hover:text-white font-semibold text-xs border border-white/[0.08] flex items-center gap-1.5 transition"
                            title="Lançar saldo pendente no Contas a Receber"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Lançar a Receber</span>
                          </button>
                        )}
                      </div>

                      {/* Margin progress bar */}
                      <div className="w-full sm:w-48">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>Absorção / Margem</span>
                          <span className={margin >= 40 ? 'text-emerald-400 font-bold' : margin >= 20 ? 'text-amber-400' : 'text-rose-400'}>
                            {margin.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#25252a] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              margin >= 50 ? 'bg-emerald-500' : margin >= 25 ? 'bg-sky-500' : margin >= 10 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, margin))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CENTROS DE CUSTO & ABSORÇÃO */}
      {/* ========================================================================= */}
      {activeSubTab === 'cost_centers' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#18181b] border border-white/[0.08] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Centros de Custo da Oficina</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Segregação gerencial para alocação de matérias-primas, horas de máquina e mão de obra por segmento de produção.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openCostCenterModal()}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Centro de Custo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {costCenters.map((cc) => {
              const budget = Number(cc.budget_monthly) || 0;
              const allocated = Number(cc.total_allocated_cost) || 0;
              const revenue = Number(cc.total_agreed_revenue) || 0;
              const balance = revenue - allocated;
              const utilPercent = budget > 0 ? (allocated / budget) * 100 : 0;

              return (
                <div
                  key={cc.id}
                  className="p-5 rounded-2xl bg-[#18181b] border border-white/[0.08] hover:border-white/[0.16] transition flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
                        {cc.code}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openCostCenterModal(cc)}
                          className="p-1.5 rounded-lg bg-[#1c1c20] hover:bg-[#25252a] text-slate-400 hover:text-white transition"
                          title="Editar Centro de Custo"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {costCenters.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCostCenter(cc.id, cc.name)}
                            className="p-1.5 rounded-lg bg-[#1c1c20] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                            title="Excluir Centro de Custo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-white">{cc.name}</h4>
                    {cc.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cc.description}</p>}
                  </div>

                  {/* Financial Stats of Cost Center */}
                  <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Projetos Vinculados:</span>
                      <strong className="text-white">{cc.total_projects || 0}</strong>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Receita Gerada:</span>
                      <strong className="text-emerald-400">R$ {revenue.toFixed(2)}</strong>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Custos Absorvidos:</span>
                      <strong className="text-rose-400">R$ {allocated.toFixed(2)}</strong>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Resultado Líquido:</span>
                      <strong className={balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        R$ {balance.toFixed(2)}
                      </strong>
                    </div>

                    {/* Budget Utilization Progress Bar */}
                    {budget > 0 && (
                      <div className="pt-2">
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>Orçamento Teto Mensal</span>
                          <span className="text-slate-300 font-semibold">
                            R$ {allocated.toFixed(0)} / R$ {budget.toFixed(0)} ({utilPercent.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#25252a] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              utilPercent > 100 ? 'bg-rose-500' : utilPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, utilPercent)}%` }}
                          />
                        </div>
                        {utilPercent > 100 && (
                          <span className="text-[10px] text-rose-400 flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" /> Orçamento mensal extrapolado!
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ALLOCATION DRAWER / MODAL: ALOCAÇÃO DETALHADA DE INSUMOS NO PROJETO */}
      {/* ========================================================================= */}
      {selectedProjectForAlloc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[#161618] border border-white/[0.1] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#1a1a1e]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold">
                    {selectedProjectForAlloc.code}
                  </span>
                  <h2 className="text-base font-bold text-white">{selectedProjectForAlloc.title}</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Cliente: <strong className="text-slate-200">{selectedProjectForAlloc.client_name || 'Cliente Avulso'}</strong> •{' '}
                  Centro de Custos: <strong className="text-slate-200">{selectedProjectForAlloc.cost_center_name}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={closeAllocationsDrawer}
                className="p-2 rounded-xl bg-[#25252a] hover:bg-[#303036] text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Summary Bar of this Project */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#121214] border-b border-white/[0.06]">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Receita Acordada</span>
                <span className="text-sm font-bold text-white">
                  R$ {(Number(selectedProjectForAlloc.agreed_price) || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Custo Total Alocado</span>
                <span className="text-sm font-bold text-rose-300">
                  R$ {allocationSummary.totalCost.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Lucro Líquido Projetado</span>
                <span className={`text-sm font-bold ${allocationSummary.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  R$ {allocationSummary.profit.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Margem Realizada</span>
                <span className={`text-sm font-bold ${allocationSummary.marginPercent >= 40 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {allocationSummary.marginPercent.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Main Content Area: Add Allocation + Allocations List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Cost Category Breakdown Proportions */}
              {allocationSummary.totalCost > 0 && (
                <div className="p-4 rounded-2xl bg-[#1a1a1e] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>Composição dos Custos do Projeto</span>
                    <span className="text-slate-400">Total: R$ {allocationSummary.totalCost.toFixed(2)}</span>
                  </div>

                  {/* Visual Proportion Bar */}
                  <div className="w-full h-3 bg-[#25252a] rounded-full overflow-hidden flex">
                    {allocationSummary.filamentCost > 0 && (
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${(allocationSummary.filamentCost / allocationSummary.totalCost) * 100}%` }}
                        title={`Filamentos: R$ ${allocationSummary.filamentCost.toFixed(2)}`}
                      />
                    )}
                    {allocationSummary.supplyCost > 0 && (
                      <div
                        className="bg-amber-500 h-full"
                        style={{ width: `${(allocationSummary.supplyCost / allocationSummary.totalCost) * 100}%` }}
                        title={`Insumos: R$ ${allocationSummary.supplyCost.toFixed(2)}`}
                      />
                    )}
                    {allocationSummary.machineCost > 0 && (
                      <div
                        className="bg-sky-500 h-full"
                        style={{ width: `${(allocationSummary.machineCost / allocationSummary.totalCost) * 100}%` }}
                        title={`Máquina: R$ ${allocationSummary.machineCost.toFixed(2)}`}
                      />
                    )}
                    {allocationSummary.laborCost > 0 && (
                      <div
                        className="bg-purple-500 h-full"
                        style={{ width: `${(allocationSummary.laborCost / allocationSummary.totalCost) * 100}%` }}
                        title={`Mão de Obra: R$ ${allocationSummary.laborCost.toFixed(2)}`}
                      />
                    )}
                    {allocationSummary.outsourcedCost > 0 && (
                      <div
                        className="bg-rose-500 h-full"
                        style={{ width: `${(allocationSummary.outsourcedCost / allocationSummary.totalCost) * 100}%` }}
                        title={`Terceirizados: R$ ${allocationSummary.outsourcedCost.toFixed(2)}`}
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Filamentos: R$ {allocationSummary.filamentCost.toFixed(2)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      Insumos: R$ {allocationSummary.supplyCost.toFixed(2)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                      Máquina: R$ {allocationSummary.machineCost.toFixed(2)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      Mão de Obra: R$ {allocationSummary.laborCost.toFixed(2)}
                    </span>
                    {allocationSummary.outsourcedCost > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        Terceirizados: R$ {allocationSummary.outsourcedCost.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Form: Add New Resource to Project */}
              <div className="p-5 rounded-2xl bg-[#18181b] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>Adicionar Alocação de Recurso / Insumo</span>
                  </h4>
                </div>

                {/* Resource Type Selector Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => setAllocActiveTab('filament')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      allocActiveTab === 'filament'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-[#202024] text-slate-300 hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>Filamento</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAllocActiveTab('supply')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      allocActiveTab === 'supply'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-[#202024] text-slate-300 hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Insumo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAllocActiveTab('machine_time')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      allocActiveTab === 'machine_time'
                        ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                        : 'bg-[#202024] text-slate-300 hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Máquina</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAllocActiveTab('labor')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      allocActiveTab === 'labor'
                        ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20'
                        : 'bg-[#202024] text-slate-300 hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    <Hammer className="w-3.5 h-3.5" />
                    <span>Mão de Obra</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAllocActiveTab('outsourced')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      allocActiveTab === 'outsourced'
                        ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20'
                        : 'bg-[#202024] text-slate-300 hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Terceirizado</span>
                  </button>
                </div>

                {/* Sub-form based on selected resource type */}
                <form onSubmit={handleAddAllocation} className="space-y-4 pt-2">
                  {/* FILAMENT FORM */}
                  {allocActiveTab === 'filament' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Selecionar Carretel de Filamento em Estoque
                        </label>
                        <select
                          value={allocFilamentId}
                          onChange={(e) => setAllocFilamentId(e.target.value)}
                          className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          {filaments.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.brand} - {f.material} ({f.color}) • {f.remaining_weight_g || 0}g restantes • R$ {(f.cost_per_spool || 90).toFixed(2)}/kg
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Peso Utilizado (gramas)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="5000"
                          value={allocFilamentWeightG}
                          onChange={(e) => setAllocFilamentWeightG(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* SUPPLY FORM */}
                  {allocActiveTab === 'supply' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Selecionar Insumo / Componente da Oficina
                        </label>
                        <select
                          value={allocSupplyId}
                          onChange={(e) => setAllocSupplyId(e.target.value)}
                          className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                        >
                          {supplies.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} • Estoque: {s.in_stock_qty || 0} {s.unit} • Custo Unit: R$ {(s.unit_cost || 0).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Quantidade Utilizada
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={allocSupplyQty}
                          onChange={(e) => setAllocSupplyQty(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* MACHINE TIME FORM */}
                  {allocActiveTab === 'machine_time' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Selecionar Impressora 3D
                        </label>
                        <select
                          value={allocPrinterId}
                          onChange={(e) => setAllocPrinterId(e.target.value)}
                          className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                        >
                          {printers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} • Potência: {p.total_power_watts || 280}W • Deprec: R$ {(p.hourly_depreciation || 0.60).toFixed(2)}/h
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Tempo de Impressão (Horas)
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.5"
                          value={allocMachineHours}
                          onChange={(e) => setAllocMachineHours(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* LABOR FORM */}
                  {allocActiveTab === 'labor' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Atividade / Etapa Técnica
                        </label>
                        <select
                          value={allocLaborType}
                          onChange={(e) => {
                            setAllocLaborType(e.target.value);
                            if (e.target.value.includes('Modelagem')) setAllocLaborRate(40);
                            else if (e.target.value.includes('Fatiamento')) setAllocLaborRate(30);
                            else if (e.target.value.includes('Pós-processamento')) setAllocLaborRate(25);
                            else if (e.target.value.includes('Pintura')) setAllocLaborRate(35);
                            else if (e.target.value.includes('Montagem')) setAllocLaborRate(20);
                          }}
                          className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="Modelagem 3D & Engenharia CAD">Modelagem 3D & Engenharia CAD (R$ 40/h)</option>
                          <option value="Fatiamento & Configuração de G-code">Fatiamento & Preparação (R$ 30/h)</option>
                          <option value="Pós-processamento & Lixamento">Pós-processamento & Lixamento (R$ 25/h)</option>
                          <option value="Pintura Artística & Detalhamento">Pintura Artística & Detalhamento (R$ 35/h)</option>
                          <option value="Montagem Mecânica & Embalagem">Montagem & Embalagem (R$ 20/h)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Horas Dedicadas (h)
                        </label>
                        <input
                          type="number"
                          min="0.25"
                          step="0.25"
                          value={allocLaborHours}
                          onChange={(e) => setAllocLaborHours(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Taxa Horária da Oficina (R$/h)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={allocLaborRate}
                          onChange={(e) => setAllocLaborRate(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* OUTSOURCED FORM */}
                  {allocActiveTab === 'outsourced' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Descrição do Serviço Externo / Despesa Extra
                        </label>
                        <input
                          type="text"
                          value={allocOutsourcedDesc}
                          onChange={(e) => setAllocOutsourcedDesc(e.target.value)}
                          placeholder="Ex: Corte a laser acrílico, frete dedicado, inserts especiais..."
                          className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Valor Cobrado (R$)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={allocOutsourcedCost}
                          onChange={(e) => setAllocOutsourcedCost(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Deduct Stock checkbox & Notes */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                    {(allocActiveTab === 'filament' || allocActiveTab === 'supply') ? (
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allocDeductStock}
                          onChange={(e) => setAllocDeductStock(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-[#121214]"
                        />
                        <span>Dar baixa imediata no estoque físico da oficina</span>
                      </label>
                    ) : <div />}

                    <button
                      type="submit"
                      disabled={isSubmittingAlloc}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 transition ml-auto"
                    >
                      {isSubmittingAlloc ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      <span>Registrar Alocação</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Table of Existing Allocations for this Project */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Recursos Alocados nesta Encomenda ({allocations.length})
                  </h4>
                </div>

                {loadingAllocations ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                    <span>Carregando itens alocados...</span>
                  </div>
                ) : allocations.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#18181b] border border-white/[0.08] text-center text-slate-400 text-xs">
                    Nenhum recurso alocado ainda para esta encomenda. Utilize o formulário acima para registrar filamentos, insumos e horas.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-[#18181b]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#141416] text-slate-400 border-b border-white/[0.06]">
                          <tr>
                            <th className="p-3">Tipo</th>
                            <th className="p-3">Recurso / Insumo</th>
                            <th className="p-3 text-right">Qtd</th>
                            <th className="p-3 text-right">Custo Unit</th>
                            <th className="p-3 text-right">Custo Total</th>
                            <th className="p-3 text-center">Estoque</th>
                            <th className="p-3 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {allocations.map((alloc) => {
                            const resCfg = RESOURCE_CONFIG[alloc.resource_type] || RESOURCE_CONFIG.filament;
                            const ResIcon = resCfg.icon;

                            return (
                              <tr key={alloc.id} className="hover:bg-white/[0.02] transition">
                                <td className="p-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${resCfg.bg} ${resCfg.color}`}>
                                    <ResIcon className="w-3 h-3" />
                                    {resCfg.label}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="font-semibold text-white block">{alloc.resource_name}</span>
                                  {alloc.notes && <span className="text-[10px] text-slate-500 block">{alloc.notes}</span>}
                                </td>
                                <td className="p-3 text-right text-slate-300 font-mono">
                                  {alloc.quantity} {alloc.unit}
                                </td>
                                <td className="p-3 text-right text-slate-400 font-mono">
                                  R$ {Number(alloc.unit_cost).toFixed(2)}
                                </td>
                                <td className="p-3 text-right font-bold text-rose-300 font-mono">
                                  R$ {Number(alloc.total_cost).toFixed(2)}
                                </td>
                                <td className="p-3 text-center">
                                  {alloc.resource_type === 'filament' || alloc.resource_type === 'supply' ? (
                                    alloc.stock_deducted ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                        <Check className="w-3 h-3" /> Baixado
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleDeductStockNow(alloc.id)}
                                        className="text-[10px] text-amber-400 hover:text-amber-300 underline font-semibold"
                                        title="Dar baixa no estoque físico agora"
                                      >
                                        Baixar Agora
                                      </button>
                                    )
                                  ) : (
                                    <span className="text-[10px] text-slate-500">N/A</span>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAllocation(alloc.id, alloc.stock_deducted)}
                                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 transition"
                                    title="Excluir alocação"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-white/[0.08] bg-[#1a1a1e] flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Os custos alocados alimentam automaticamente o DRE e os limites do Centro de Custos.
              </span>
              <button
                type="button"
                onClick={closeAllocationsDrawer}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition"
              >
                Fechar Painel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO / EDITAR PROJETO / ENCOMENDA */}
      {/* ========================================================================= */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#161618] border border-white/[0.1] rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span>{editingProject ? 'Editar Encomenda / Projeto' : 'Nova Encomenda Sob Medida'}</span>
              </h3>
              <button onClick={() => setIsProjectModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitProject} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Código</label>
                  <input
                    type="text"
                    value={projectFormCode}
                    onChange={(e) => setProjectFormCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white font-mono"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Centro de Custos *</label>
                  <select
                    value={projectFormCostCenterId}
                    onChange={(e) => setProjectFormCostCenterId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white"
                    required
                  >
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.code} - {cc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Título da Encomenda *</label>
                <input
                  type="text"
                  value={projectFormTitle}
                  onChange={(e) => setProjectFormTitle(e.target.value)}
                  placeholder="Ex: Lote 50x Troféus Futuristas Tech Summit"
                  className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Cliente Solicitante</label>
                  <input
                    type="text"
                    value={projectFormClientName}
                    onChange={(e) => setProjectFormClientName(e.target.value)}
                    placeholder="Nome do cliente ou empresa"
                    list="clients-list"
                    className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white"
                  />
                  <datalist id="clients-list">
                    {clients.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Prazo de Entrega</label>
                  <input
                    type="date"
                    value={projectFormTargetDate}
                    onChange={(e) => setProjectFormTargetDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Preço Acordado / Orçamento (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={projectFormAgreedPrice}
                    onChange={(e) => setProjectFormAgreedPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Adiantamento Pago / Entrada (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={projectFormAmountPaid}
                    onChange={(e) => setProjectFormAmountPaid(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Status Atual</label>
                  <select
                    value={projectFormStatus}
                    onChange={(e) => setProjectFormStatus(e.target.value as CustomProjectStatus)}
                    className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="quote">Orçamento Enviado</option>
                    <option value="approved">Aprovado pelo Cliente</option>
                    <option value="in_progress">Em Produção</option>
                    <option value="completed">Concluído</option>
                    <option value="delivered">Entregue / Faturado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Prioridade</label>
                  <select
                    value={projectFormPriority}
                    onChange={(e) => setProjectFormPriority(e.target.value as CustomProjectPriority)}
                    className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white"
                  >
                    <option value="low">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Observações Técnicas</label>
                <textarea
                  rows={2}
                  value={projectFormNotes}
                  onChange={(e) => setProjectFormNotes(e.target.value)}
                  placeholder="Requisitos de acabamento, tolerâncias dimensionais, embalagens..."
                  className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProject}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2"
                >
                  {isSubmittingProject && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingProject ? 'Salvar Alterações' : 'Criar Encomenda'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO / EDITAR CENTRO DE CUSTOS */}
      {/* ========================================================================= */}
      {isCostCenterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161618] border border-white/[0.1] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>{editingCostCenter ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}</span>
              </h3>
              <button onClick={() => setIsCostCenterModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCostCenter} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Código</label>
                  <input
                    type="text"
                    value={ccFormCode}
                    onChange={(e) => setCcFormCode(e.target.value.toUpperCase())}
                    placeholder="CC-01"
                    className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white font-mono"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Nome do Centro *</label>
                  <input
                    type="text"
                    value={ccFormName}
                    onChange={(e) => setCcFormName(e.target.value)}
                    placeholder="Ex: Projetos Sob Medida"
                    className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={ccFormDescription}
                  onChange={(e) => setCcFormDescription(e.target.value)}
                  placeholder="Finalidade e escopo deste centro de custo..."
                  className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Orçamento Previsto Mensal (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={ccFormBudgetMonthly}
                  onChange={(e) => setCcFormBudgetMonthly(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#121214] border border-white/[0.08] rounded-xl text-xs text-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Utilizado para alertar caso os custos alocados ultrapassem a meta da oficina.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsCostCenterModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCc}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2"
                >
                  {isSubmittingCc && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCostCenter ? 'Salvar Alterações' : 'Criar Centro'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
