import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Calculator,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Factory,
  Link as LinkIcon,
  Package,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '../lib/storage';
import {
  InventoryCategory,
  ProductionCostCategory,
  ProjectCostRecord,
  ProjectProductionData,
  PurchasePlanItem,
} from '../types';
import { cn } from '../lib/utils';
import ConfirmDialog from './ConfirmDialog';

const COST_CATEGORIES: ProductionCostCategory[] = [
  'Materiales',
  'Herramientas',
  'Servicios',
  'Transporte',
  'Mano de obra',
  'Otros',
];

const CATEGORY_TO_INVENTORY: Record<ProductionCostCategory, InventoryCategory> = {
  Materiales: 'Material',
  Herramientas: 'Herramienta',
  Servicios: 'Otro',
  Transporte: 'Otro',
  'Mano de obra': 'Otro',
  Otros: 'Otro',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(amount || 0)));

const toAmount = (value: string) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
};

type ProductionTab = 'budget' | 'purchases' | 'quotes';

interface ProjectProductionPanelProps {
  projectId: string;
  projectName: string;
  onChange?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ProjectProductionPanel({ projectId, projectName, onChange, open, onOpenChange }: ProjectProductionPanelProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProductionTab>('budget');
  const [data, setData] = useState<ProjectProductionData>(storage.getProjectProduction(projectId));
  const [providers, setProviders] = useState(storage.getProviders());
  const [budgetInput, setBudgetInput] = useState(String(storage.getProject(projectId)?.direction?.budgetTarget || ''));
  const [quoteForm, setQuoteForm] = useState({
    provider: '',
    itemName: '',
    category: 'Materiales' as ProductionCostCategory,
    quantity: '1',
    unitPrice: '',
    contact: '',
    notes: '',
  });
  const [purchaseForm, setPurchaseForm] = useState({
    itemName: '',
    category: 'Materiales' as ProductionCostCategory,
    quantity: '1',
    estimatedUnitCost: '',
    provider: '',
  });
  const [costForm, setCostForm] = useState({
    itemName: '',
    category: 'Materiales' as ProductionCostCategory,
    quantity: '1',
    unitCost: '',
    provider: '',
  });
  const [inventoryCandidate, setInventoryCandidate] = useState<ProjectCostRecord | null>(null);
  const isOpen = open ?? internalOpen;
  const setIsOpen = (nextOpen: boolean) => {
    if (onOpenChange) onOpenChange(nextOpen);
    else setInternalOpen(nextOpen);
  };

  const refresh = () => {
    setData(storage.getProjectProduction(projectId));
    setProviders(storage.getProviders());
    setBudgetInput(String(storage.getProject(projectId)?.direction?.budgetTarget || ''));
    onChange?.();
  };

  const summary = storage.getProjectProductionSummary(projectId);
  const budgetProgress = summary.budgetTarget > 0
    ? Math.min(100, (summary.totalWithLegacy / summary.budgetTarget) * 100)
    : 0;
  const budgetState = summary.budgetTarget <= 0
    ? 'idle'
    : summary.totalWithLegacy > summary.budgetTarget
      ? 'over'
      : summary.totalWithLegacy / summary.budgetTarget >= 0.8
        ? 'near'
        : 'safe';

  const pendingPurchases = useMemo(
    () => data.purchases.filter((purchase) => purchase.status === 'Pendiente'),
    [data.purchases],
  );

  const handleBudgetSave = () => {
    const project = storage.getProject(projectId);
    if (!project) return;

    storage.updateProject(projectId, {
      direction: {
        ...project.direction,
        budgetTarget: toAmount(budgetInput),
      },
    });
    toast.success('Presupuesto actualizado');
    refresh();
  };

  const handleAddQuote = () => {
    if (!quoteForm.provider.trim() || !quoteForm.itemName.trim()) {
      toast.error('Proveedor e item son obligatorios');
      return;
    }

    const providerName = quoteForm.provider.trim();
    const existingProvider = providers.find(
      (provider) => provider.name.trim().toLowerCase() === providerName.toLowerCase(),
    );

    if (!existingProvider) {
      storage.addProvider({
        name: providerName,
        category: quoteForm.category,
        contact: quoteForm.contact.trim(),
        phone: '',
        email: '',
        website: quoteForm.contact.trim(),
        address: '',
        notes: '',
        archived: false,
      });
    }

    storage.addQuote(projectId, {
      provider: providerName,
      itemName: quoteForm.itemName.trim(),
      category: quoteForm.category,
      quantity: toAmount(quoteForm.quantity) || 1,
      unitPrice: toAmount(quoteForm.unitPrice),
      contact: quoteForm.contact.trim(),
      notes: quoteForm.notes.trim(),
      status: 'Cotizada',
    });
    setQuoteForm({ provider: '', itemName: '', category: 'Materiales', quantity: '1', unitPrice: '', contact: '', notes: '' });
    toast.success('Cotización agregada');
    refresh();
  };

  const handleQuoteToPurchase = (quoteId: string) => {
    const purchaseId = storage.convertQuoteToPurchase(projectId, quoteId);
    if (!purchaseId) return;
    toast.success('Cotización enviada al plan de compra');
    refresh();
    setActiveTab('purchases');
  };

  const handleAddPurchase = () => {
    if (!purchaseForm.itemName.trim()) {
      toast.error('El item de compra es obligatorio');
      return;
    }

    storage.addPurchasePlanItem(projectId, {
      itemName: purchaseForm.itemName.trim(),
      category: purchaseForm.category,
      quantity: toAmount(purchaseForm.quantity) || 1,
      estimatedUnitCost: toAmount(purchaseForm.estimatedUnitCost),
      provider: purchaseForm.provider.trim() || undefined,
      status: 'Pendiente',
    });
    setPurchaseForm({ itemName: '', category: 'Materiales', quantity: '1', estimatedUnitCost: '', provider: '' });
    toast.success('Compra agregada al checklist');
    refresh();
  };

  const handlePurchaseToCost = (purchase: PurchasePlanItem) => {
    const costId = storage.convertPurchaseToCost(projectId, purchase.id);
    if (!costId) return;

    const nextData = storage.getProjectProduction(projectId);
    const cost = nextData.costs.find((record) => record.id === costId);
    if (cost) {
      setInventoryCandidate(cost);
    }
    toast.success('Compra registrada como costo');
    setData(nextData);
    onChange?.();
  };

  const handleAddCost = () => {
    if (!costForm.itemName.trim()) {
      toast.error('El nombre del costo es obligatorio');
      return;
    }

    const costId = storage.addCostRecord(projectId, {
      itemName: costForm.itemName.trim(),
      category: costForm.category,
      quantity: toAmount(costForm.quantity) || 1,
      unitCost: toAmount(costForm.unitCost),
      provider: costForm.provider.trim() || undefined,
    });
    const cost = storage.getProjectProduction(projectId).costs.find((record) => record.id === costId);
    if (cost) setInventoryCandidate(cost);
    setCostForm({ itemName: '', category: 'Materiales', quantity: '1', unitCost: '', provider: '' });
    toast.success('Costo agregado');
    refresh();
  };

  const handleInventoryConfirm = () => {
    if (!inventoryCandidate) return;

    const inventory = storage.getInventory();
    const existing = inventory.find((item) =>
      item.name.trim().toLowerCase() === inventoryCandidate.itemName.trim().toLowerCase() &&
      item.sourceProjectId === projectId,
    );

    if (existing) {
      storage.updateInventoryItem(existing.id, {
        quantity: existing.quantity + inventoryCandidate.quantity,
        unitCost: inventoryCandidate.unitCost,
      });
      toast.success('Inventario actualizado');
    } else {
      storage.addInventoryItem({
        name: inventoryCandidate.itemName,
        description: `Compra/costo del proyecto: ${projectName}`,
        category: CATEGORY_TO_INVENTORY[inventoryCandidate.category],
        quantity: inventoryCandidate.quantity,
        unitCost: inventoryCandidate.unitCost,
        status: 'Para usar',
        subStatus: 'Listo para usar',
        sourceProjectId: projectId,
      });
      toast.success('Item agregado al inventario');
    }

    setInventoryCandidate(null);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 z-[101] w-[94%] max-w-md border-l border-[var(--border-subtle)] bg-[var(--bg-app)] shadow-2xl flex flex-col"
            >
              <div className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Producción</p>
                    <h3 className="text-lg font-bold tracking-tight text-[var(--text-main)]">{projectName}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-full p-2 text-[var(--text-dim)] transition-all hover:text-[var(--accent)] active:scale-90"
                  >
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-app)] p-1">
                  {[
                    { id: 'budget' as ProductionTab, label: 'Presupuesto', icon: Calculator },
                    { id: 'purchases' as ProductionTab, label: 'Compras', icon: ClipboardList },
                    { id: 'quotes' as ProductionTab, label: 'Cotizador', icon: Send },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "rounded-xl px-2 py-2.5 text-[7px] font-bold uppercase tracking-[0.12em] transition-all flex flex-col items-center gap-1",
                          activeTab === tab.id
                            ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm"
                            : "text-[var(--text-dim)] hover:text-[var(--accent)]",
                        )}
                      >
                        <Icon size={13} strokeWidth={2.5} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 pb-10 space-y-4 no-scrollbar">
                {activeTab === 'budget' && (
                  <BudgetTab
                    budgetInput={budgetInput}
                    setBudgetInput={setBudgetInput}
                    onBudgetSave={handleBudgetSave}
                    summary={summary}
                    budgetProgress={budgetProgress}
                    budgetState={budgetState}
                    data={data}
                    costForm={costForm}
                    setCostForm={setCostForm}
                    onAddCost={handleAddCost}
                    onDeleteCost={(costId) => {
                      storage.deleteCostRecord(projectId, costId);
                      toast.success('Costo eliminado');
                      refresh();
                    }}
                  />
                )}

                {activeTab === 'purchases' && (
                  <PurchasesTab
                    purchases={data.purchases}
                    pendingPurchases={pendingPurchases.length}
                    purchaseForm={purchaseForm}
                    setPurchaseForm={setPurchaseForm}
                    onAddPurchase={handleAddPurchase}
                    onDeletePurchase={(purchaseId) => {
                      storage.deletePurchasePlanItem(projectId, purchaseId);
                      toast.success('Compra eliminada');
                      refresh();
                    }}
                    onCancelPurchase={(purchaseId) => {
                      storage.updatePurchasePlanItem(projectId, purchaseId, { status: 'Cancelado' });
                      refresh();
                    }}
                    onPurchaseToCost={handlePurchaseToCost}
                  />
                )}

                {activeTab === 'quotes' && (
                  <QuotesTab
                    quotes={data.quotes}
                    providers={providers}
                    quoteForm={quoteForm}
                    setQuoteForm={setQuoteForm}
                    onAddQuote={handleAddQuote}
                    onDeleteQuote={(quoteId) => {
                      storage.deleteQuote(projectId, quoteId);
                      toast.success('Cotización eliminada');
                      refresh();
                    }}
                    onQuoteToPurchase={handleQuoteToPurchase}
                  />
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={Boolean(inventoryCandidate)}
        title="Actualizar inventario"
        description={
          inventoryCandidate
            ? `¿Quieres crear o actualizar "${inventoryCandidate.itemName}" en inventario?`
            : ''
        }
        confirmLabel="Inventariar"
        cancelLabel="No ahora"
        destructive={false}
        onCancel={() => setInventoryCandidate(null)}
        onConfirm={handleInventoryConfirm}
      />
    </>
  );
}

function MoneyMetric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'good' | 'bad' }) {
  return (
    <div className={cn(
      "rounded-2xl border bg-[var(--bg-app)] p-4",
      tone === 'good' && "border-emerald-500/20 bg-emerald-500/10",
      tone === 'bad' && "border-red-500/20 bg-red-500/10",
      tone === 'default' && "border-[var(--border-subtle)]",
    )}>
      <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">{label}</p>
      <p className="mt-1 text-base font-black tracking-tight text-[var(--text-main)]">{value}</p>
    </div>
  );
}

function CategorySelect({ value, onChange }: { value: ProductionCostCategory; onChange: (value: ProductionCostCategory) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as ProductionCostCategory)}
      className="input-clean !p-3 text-[10px] font-bold uppercase tracking-widest appearance-none"
    >
      {COST_CATEGORIES.map((category) => (
        <option key={category} value={category}>{category}</option>
      ))}
    </select>
  );
}

function BudgetTab({
  budgetInput,
  setBudgetInput,
  onBudgetSave,
  summary,
  budgetProgress,
  budgetState,
  data,
  costForm,
  setCostForm,
  onAddCost,
  onDeleteCost,
}: {
  budgetInput: string;
  setBudgetInput: (value: string) => void;
  onBudgetSave: () => void;
  summary: ReturnType<typeof storage.getProjectProductionSummary>;
  budgetProgress: number;
  budgetState: string;
  data: ProjectProductionData;
  costForm: { itemName: string; category: ProductionCostCategory; quantity: string; unitCost: string; provider: string };
  setCostForm: React.Dispatch<React.SetStateAction<{ itemName: string; category: ProductionCostCategory; quantity: string; unitCost: string; provider: string }>>;
  onAddCost: () => void;
  onDeleteCost: (costId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="card-clean p-4 space-y-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <input
            type="number"
            min="0"
            step="1000"
            value={budgetInput}
            onChange={(event) => setBudgetInput(event.target.value)}
            placeholder="Presupuesto del proyecto"
            className="input-clean !p-3 text-sm font-medium"
          />
          <button
            type="button"
            onClick={onBudgetSave}
            className="rounded-xl bg-[var(--accent)] px-4 text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--accent-foreground)]"
          >
            Guardar
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MoneyMetric label="Presupuesto" value={formatCurrency(summary.budgetTarget)} />
          <MoneyMetric label="Real" value={formatCurrency(summary.totalWithLegacy)} tone={summary.available < 0 ? 'bad' : 'good'} />
          <MoneyMetric label="Plan compra" value={formatCurrency(summary.estimatedTotal)} />
          <MoneyMetric label="Disponible" value={formatCurrency(Math.abs(summary.available))} tone={summary.available < 0 ? 'bad' : 'good'} />
        </div>

        {summary.budgetTarget > 0 && (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full border border-[var(--border-subtle)] bg-[var(--bg-app)]">
              <div
                className={cn(
                  "h-full rounded-full",
                  budgetState === 'over' ? 'bg-red-500' : budgetState === 'near' ? 'bg-amber-500' : 'bg-emerald-500',
                )}
                style={{ width: `${budgetProgress}%` }}
              />
            </div>
            <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-[var(--text-dim)]">
              {summary.available >= 0 ? 'Dentro de presupuesto' : 'Sobre presupuesto'}
            </p>
          </div>
        )}

        {summary.legacyCost > 0 && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Incluye costo previo sin detalle: {formatCurrency(summary.legacyCost)}
          </div>
        )}
      </section>

      <section className="card-clean p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-main)]">Agregar costo directo</p>
        <input
          value={costForm.itemName}
          onChange={(event) => setCostForm((current) => ({ ...current, itemName: event.target.value }))}
          placeholder="Nombre del costo"
          className="input-clean !p-3 text-xs font-medium"
        />
        <div className="grid grid-cols-2 gap-2">
          <CategorySelect value={costForm.category} onChange={(category) => setCostForm((current) => ({ ...current, category }))} />
          <input
            type="number"
            min="1"
            value={costForm.quantity}
            onChange={(event) => setCostForm((current) => ({ ...current, quantity: event.target.value }))}
            placeholder="Cantidad"
            className="input-clean !p-3 text-xs font-medium"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            step="1000"
            value={costForm.unitCost}
            onChange={(event) => setCostForm((current) => ({ ...current, unitCost: event.target.value }))}
            placeholder="Costo unitario"
            className="input-clean !p-3 text-xs font-medium"
          />
          <input
            value={costForm.provider}
            onChange={(event) => setCostForm((current) => ({ ...current, provider: event.target.value }))}
            placeholder="Proveedor"
            className="input-clean !p-3 text-xs font-medium"
          />
        </div>
        <button
          type="button"
          onClick={onAddCost}
          className="w-full rounded-xl bg-[var(--accent)] py-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--accent-foreground)]"
        >
          Agregar costo
        </button>
      </section>

      <section className="space-y-2">
        <p className="label-caps px-2">Costos reales</p>
        {data.costs.length > 0 ? data.costs.map((cost) => (
          <div key={cost.id} className="card-clean p-4 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-bold text-[var(--text-main)]">{cost.itemName}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                {cost.category} · {cost.quantity} x {formatCurrency(cost.unitCost)}
              </p>
              {cost.provider && <p className="text-[10px] text-[var(--text-dim)]">{cost.provider}</p>}
            </div>
            <div className="text-right space-y-2">
              <p className="text-sm font-black text-[var(--text-main)]">{formatCurrency(cost.total)}</p>
              <button type="button" onClick={() => onDeleteCost(cost.id)} className="text-red-500/70 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
            Sin costos reales
          </div>
        )}
      </section>
    </div>
  );
}

function PurchasesTab({
  purchases,
  pendingPurchases,
  purchaseForm,
  setPurchaseForm,
  onAddPurchase,
  onDeletePurchase,
  onCancelPurchase,
  onPurchaseToCost,
}: {
  purchases: PurchasePlanItem[];
  pendingPurchases: number;
  purchaseForm: { itemName: string; category: ProductionCostCategory; quantity: string; estimatedUnitCost: string; provider: string };
  setPurchaseForm: React.Dispatch<React.SetStateAction<{ itemName: string; category: ProductionCostCategory; quantity: string; estimatedUnitCost: string; provider: string }>>;
  onAddPurchase: () => void;
  onDeletePurchase: (purchaseId: string) => void;
  onCancelPurchase: (purchaseId: string) => void;
  onPurchaseToCost: (purchase: PurchasePlanItem) => void;
}) {
  const groupedPurchases = purchases.reduce((groups, purchase) => {
    const provider = purchase.provider?.trim() || 'Sin proveedor';
    const current = groups.get(provider) ?? [];
    current.push(purchase);
    groups.set(provider, current);
    return groups;
  }, new Map<string, PurchasePlanItem[]>());

  return (
    <div className="space-y-4">
      <section className="card-clean p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-main)]">Plan de compra</p>
          <span className="rounded-full bg-[var(--bg-app)] px-3 py-1 text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
            {pendingPurchases} pendientes
          </span>
        </div>
        <input
          value={purchaseForm.itemName}
          onChange={(event) => setPurchaseForm((current) => ({ ...current, itemName: event.target.value }))}
          placeholder="Item a comprar"
          className="input-clean !p-3 text-xs font-medium"
        />
        <div className="grid grid-cols-2 gap-2">
          <CategorySelect value={purchaseForm.category} onChange={(category) => setPurchaseForm((current) => ({ ...current, category }))} />
          <input
            type="number"
            min="1"
            value={purchaseForm.quantity}
            onChange={(event) => setPurchaseForm((current) => ({ ...current, quantity: event.target.value }))}
            placeholder="Cantidad"
            className="input-clean !p-3 text-xs font-medium"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            step="1000"
            value={purchaseForm.estimatedUnitCost}
            onChange={(event) => setPurchaseForm((current) => ({ ...current, estimatedUnitCost: event.target.value }))}
            placeholder="Costo estimado"
            className="input-clean !p-3 text-xs font-medium"
          />
          <input
            value={purchaseForm.provider}
            onChange={(event) => setPurchaseForm((current) => ({ ...current, provider: event.target.value }))}
            placeholder="Proveedor"
            className="input-clean !p-3 text-xs font-medium"
          />
        </div>
        <button
          type="button"
          onClick={onAddPurchase}
          className="w-full rounded-xl bg-[var(--accent)] py-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--accent-foreground)]"
        >
          Agregar al checklist
        </button>
      </section>

      {purchases.length > 0 ? Array.from(groupedPurchases.entries()).map(([provider, providerPurchases]) => {
        const providerTotal = providerPurchases.reduce(
          (total, purchase) => total + purchase.quantity * purchase.estimatedUnitCost,
          0,
        );

        return (
          <section key={provider} className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-main)]">{provider}</p>
                <p className="text-[8px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                  {providerPurchases.length} {providerPurchases.length === 1 ? 'compra' : 'compras'}
                </p>
              </div>
              <p className="text-sm font-black text-[var(--text-main)]">{formatCurrency(providerTotal)}</p>
            </div>

            {providerPurchases.map((purchase) => (
              <div key={purchase.id} className={cn(
                "card-clean p-4 space-y-3",
                purchase.status === 'Comprado' && "opacity-70",
                purchase.status === 'Cancelado' && "opacity-45",
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[var(--text-main)]">{purchase.itemName}</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                      {purchase.status} · {purchase.category} · {purchase.quantity} x {formatCurrency(purchase.estimatedUnitCost)}
                    </p>
                  </div>
                  <p className="text-sm font-black text-[var(--text-main)]">
                    {formatCurrency(purchase.quantity * purchase.estimatedUnitCost)}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={purchase.status !== 'Pendiente'}
                    onClick={() => onPurchaseToCost(purchase)}
                    className="rounded-xl bg-emerald-500 px-2 py-2.5 text-[7px] font-bold uppercase tracking-widest text-white disabled:opacity-40"
                  >
                    Comprado
                  </button>
                  <button
                    type="button"
                    disabled={purchase.status !== 'Pendiente'}
                    onClick={() => onCancelPurchase(purchase.id)}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] px-2 py-2.5 text-[7px] font-bold uppercase tracking-widest text-[var(--text-dim)] disabled:opacity-40"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePurchase(purchase.id)}
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-2 py-2.5 text-[7px] font-bold uppercase tracking-widest text-red-500"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </section>
        );
      }) : (
        <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
          Sin compras planificadas
        </div>
      )}
    </div>
  );
}

function QuotesTab({
  quotes,
  providers,
  quoteForm,
  setQuoteForm,
  onAddQuote,
  onDeleteQuote,
  onQuoteToPurchase,
}: {
  quotes: ProjectProductionData['quotes'];
  providers: ReturnType<typeof storage.getProviders>;
  quoteForm: { provider: string; itemName: string; category: ProductionCostCategory; quantity: string; unitPrice: string; contact: string; notes: string };
  setQuoteForm: React.Dispatch<React.SetStateAction<{ provider: string; itemName: string; category: ProductionCostCategory; quantity: string; unitPrice: string; contact: string; notes: string }>>;
  onAddQuote: () => void;
  onDeleteQuote: (quoteId: string) => void;
  onQuoteToPurchase: (quoteId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="card-clean p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-main)]">Nueva cotización</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <input
              list="provider-options"
              value={quoteForm.provider}
              onChange={(event) => {
                const providerName = event.target.value;
                const provider = providers.find((item) => item.name === providerName);
                setQuoteForm((current) => ({
                  ...current,
                  provider: providerName,
                  category: provider?.category ?? current.category,
                  contact: provider?.website || provider?.phone || provider?.email || current.contact,
                }));
              }}
              placeholder="Proveedor"
              className="input-clean !p-3 text-xs font-medium"
            />
            <datalist id="provider-options">
              {providers.filter((provider) => !provider.archived).map((provider) => (
                <option key={provider.id} value={provider.name} />
              ))}
            </datalist>
          </div>
          <input
            value={quoteForm.itemName}
            onChange={(event) => setQuoteForm((current) => ({ ...current, itemName: event.target.value }))}
            placeholder="Item"
            className="input-clean !p-3 text-xs font-medium"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <CategorySelect value={quoteForm.category} onChange={(category) => setQuoteForm((current) => ({ ...current, category }))} />
          <input
            type="number"
            min="1"
            value={quoteForm.quantity}
            onChange={(event) => setQuoteForm((current) => ({ ...current, quantity: event.target.value }))}
            placeholder="Cantidad"
            className="input-clean !p-3 text-xs font-medium"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            step="1000"
            value={quoteForm.unitPrice}
            onChange={(event) => setQuoteForm((current) => ({ ...current, unitPrice: event.target.value }))}
            placeholder="Precio unitario"
            className="input-clean !p-3 text-xs font-medium"
          />
          <input
            value={quoteForm.contact}
            onChange={(event) => setQuoteForm((current) => ({ ...current, contact: event.target.value }))}
            placeholder="Link o contacto"
            className="input-clean !p-3 text-xs font-medium"
          />
        </div>
        <textarea
          value={quoteForm.notes}
          onChange={(event) => setQuoteForm((current) => ({ ...current, notes: event.target.value }))}
          placeholder="Notas"
          className="input-clean !p-3 text-xs font-medium h-20 resize-none"
        />
        <button
          type="button"
          onClick={onAddQuote}
          className="w-full rounded-xl bg-[var(--accent)] py-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--accent-foreground)]"
        >
          Agregar cotización
        </button>
      </section>

      {quotes.length > 0 ? quotes.map((quote) => (
        <div key={quote.id} className="card-clean p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-bold text-[var(--text-main)]">{quote.itemName}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                {quote.provider} · {quote.status} · {quote.quantity} x {formatCurrency(quote.unitPrice)}
              </p>
              {quote.contact && (
                <p className="flex items-center gap-1 text-[10px] text-[var(--text-dim)]">
                  <LinkIcon size={10} /> {quote.contact}
                </p>
              )}
              {quote.notes && <p className="text-[10px] text-[var(--text-dim)] leading-relaxed">{quote.notes}</p>}
            </div>
            <p className="text-sm font-black text-[var(--text-main)]">
              {formatCurrency(quote.quantity * quote.unitPrice)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={quote.status === 'En compra'}
              onClick={() => onQuoteToPurchase(quote.id)}
              className="rounded-xl bg-[var(--accent)] px-2 py-2.5 text-[7px] font-bold uppercase tracking-widest text-[var(--accent-foreground)] disabled:opacity-40"
            >
              Pasar a compra
            </button>
            <button
              type="button"
              onClick={() => onDeleteQuote(quote.id)}
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-2 py-2.5 text-[7px] font-bold uppercase tracking-widest text-red-500"
            >
              Borrar
            </button>
          </div>
        </div>
      )) : (
        <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
          Sin cotizaciones
        </div>
      )}
    </div>
  );
}
