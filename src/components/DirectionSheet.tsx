import React, { useEffect, useState, useRef } from 'react';
import { storage } from '../lib/storage';
import { Project, Direction } from '../types';
import { Save, Plus, X, Target, HelpCircle, FileText, List, Wrench, Box, ChevronRight, Package, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import LoadingSpinner from './LoadingSpinner';
import ConfirmDialog from './ConfirmDialog';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { InventoryItem } from '../types';
import { formatMinutes, normalizeDirection } from '../lib/direction';

interface DirectionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSave?: () => void;
}

export default function DirectionSheet({ isOpen, onClose, projectId, onSave }: DirectionSheetProps) {
  const [project, setProject] = useState<Project | null>(storage.getProject(projectId) || null);
  const [direction, setDirection] = useState<Direction>(normalizeDirection(project?.direction));
  const [saving, setSaving] = useState(false);
  const [newOut, setNewOut] = useState('');
  const [newIn, setNewIn] = useState('');
  const [isInventoryPickerOpen, setIsInventoryPickerOpen] = useState(false);
  const [pendingInventoryInput, setPendingInventoryInput] = useState<string | null>(null);
  const outInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const p = storage.getProject(projectId);
      if (p) {
        setProject(p);
        setDirection(normalizeDirection(p.direction));
      }
      // Focus after animation
      setTimeout(() => {
        outInputRef.current?.focus();
      }, 400);
    }
  }, [isOpen, projectId]);

  const handleSave = () => {
    setSaving(true);
    try {
      storage.updateProject(projectId, { direction });
      toast.success('7flow actualizado', {
        description: 'ADN del proyecto guardado correctamente.',
        duration: 2000,
      });
      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error('Error saving direction:', error);
      toast.error('Error al actualizar el 7flow');
    } finally {
      setSaving(false);
    }
  };

  const addOut = () => {
    if (!newOut.trim()) return;
    setDirection((current) => ({ ...current, out: [...current.out, newOut.trim()] }));
    setNewOut('');
  };

  const removeOut = (index: number) => {
    setDirection((current) => ({ ...current, out: current.out.filter((_, i) => i !== index) }));
  };

  const addIn = () => {
    const value = newIn.trim();
    if (!value) return;

    setDirection((current) => ({ ...current, in: [...current.in, value] }));
    setNewIn('');
    setPendingInventoryInput(value);
  };

  const removeIn = (index: number) => {
    setDirection((current) => ({ ...current, in: current.in.filter((_, i) => i !== index) }));
  };

  const handleImportFromInventory = (item: InventoryItem) => {
    if (direction.in.includes(item.name)) {
      toast.error('Este insumo ya está en la lista');
      return;
    }

    setDirection((current) => ({
      ...current,
      in: current.in.includes(item.name) ? current.in : [...current.in, item.name],
    }));
    setIsInventoryPickerOpen(false);
    toast.success('Insumo importado del inventario');
  };

  const handleTimeTargetChange = (value: string) => {
    const parsed = Number(value);
    setDirection((current) => ({
      ...current,
      timeTargetMinutes: Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0,
    }));
  };

  const addTimeMinutes = (minutes: number) => {
    setDirection((current) => ({
      ...current,
      timeAccumulatedMinutes: Math.max(0, current.timeAccumulatedMinutes + minutes),
    }));
  };

  const resetTimeProgress = () => {
    setDirection((current) => ({
      ...current,
      timeAccumulatedMinutes: 0,
    }));
  };

  const timeTargetMinutes = direction.timeTargetMinutes ?? 0;
  const timeAccumulatedMinutes = direction.timeAccumulatedMinutes ?? 0;
  const timeProgress = timeTargetMinutes > 0
    ? Math.min(100, (timeAccumulatedMinutes / timeTargetMinutes) * 100)
    : 0;
  const deadlineState = timeTargetMinutes <= 0
    ? 'idle'
    : timeAccumulatedMinutes > timeTargetMinutes
      ? 'over'
      : timeAccumulatedMinutes === timeTargetMinutes
        ? 'onTime'
      : timeTargetMinutes > 0 && timeAccumulatedMinutes / timeTargetMinutes >= 0.8
        ? 'near'
        : 'safe';
  const deadlineMessage = (() => {
    if (timeTargetMinutes <= 0) return 'Define el deadline del proyecto para empezar a medir.';
    if (timeAccumulatedMinutes === timeTargetMinutes) return 'Clavamos el deadline.';
    if (timeAccumulatedMinutes < timeTargetMinutes) {
      return `Vamos ${formatMinutes(timeTargetMinutes - timeAccumulatedMinutes)} por debajo del deadline.`;
    }
    return `Nos pasamos ${formatMinutes(timeAccumulatedMinutes - timeTargetMinutes)} del deadline.`;
  })();
  const deadlineBarColor = deadlineState === 'over'
    ? 'bg-red-500'
    : deadlineState === 'near'
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  const confirmAddInputToInventory = () => {
    if (!pendingInventoryInput) return;

    const normalizedInput = pendingInventoryInput.trim().toLowerCase();
    const exists = storage.getInventory().some(
      item => item.name.trim().toLowerCase() === normalizedInput && item.sourceProjectId === projectId
    );

    if (exists) {
      toast.error('Ese insumo ya existe en inventario');
      setPendingInventoryInput(null);
      return;
    }

    storage.addInventoryItem({
      name: pendingInventoryInput,
      description: `Insumo del proyecto: ${project?.name || '7Flow'}`,
      category: 'Insumo',
      quantity: 1,
      status: 'Para usar',
      subStatus: 'Sin abrir',
      sourceProjectId: projectId
    });

    toast.success('Insumo agregado también al inventario');
    setPendingInventoryInput(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />

          {/* Sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-[90%] max-w-md bg-[var(--bg-app)] z-[101] shadow-2xl flex flex-col border-l border-[var(--border-subtle)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-app)] sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="p-1.5 text-[var(--text-dim)] hover:text-[var(--accent)] transition-all active:scale-90">
                  <ChevronRight size={22} strokeWidth={2.5} />
                </button>
                <div className="space-y-0.5">
                  <label className="label-caps !ml-0 !mb-0 text-[7px]">7Flow ADN</label>
                  <p className="text-base font-bold text-[var(--text-main)] truncate max-w-[200px] tracking-tight leading-tight">
                    {project?.name || 'Cargando...'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-[var(--text-dim)] hover:text-[var(--accent)]">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-10">
              {/* OUT Section */}
              <DirectionBlock
                title="RESULTADOS (OUT)"
                subtitle="Entregables tangibles"
                icon={<Target size={14} strokeWidth={2.5} />}
              >
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      ref={outInputRef}
                      type="text"
                      value={newOut}
                      onChange={(e) => setNewOut(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addOut()}
                      placeholder="Añadir resultado..."
                      className="input-clean !p-3 text-xs font-medium"
                    />
                    <button onClick={addOut} className="bg-[var(--bg-card)] p-3 rounded-xl text-[var(--text-main)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] transition-all border border-[var(--border-subtle)] shadow-sm active:scale-90">
                      <Plus size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {direction.out.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-full shadow-sm group">
                        <span className="text-xs font-medium text-[var(--text-main)]">{item}</span>
                        <button onClick={() => removeOut(i)} className="text-[var(--text-dim)] hover:text-red-500 transition-colors">
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </DirectionBlock>

              {/* WHY Section */}
              <DirectionBlock title="PROPÓSITO (WHY)" subtitle="Razón fundamental" icon={<HelpCircle size={14} strokeWidth={2.5} />}>
                <textarea
                  value={direction.why}
                  onChange={(e) => setDirection({ ...direction, why: e.target.value })}
                  placeholder="¿Por qué estamos haciendo esto?"
                  className="input-clean !p-3 text-xs font-medium h-20 resize-none"
                />
              </DirectionBlock>

              {/* Dirección Section */}
              <DirectionBlock title="DIRECCIÓN (D)" subtitle="Visión general" icon={<FileText size={14} strokeWidth={2.5} />}>
                <textarea
                  value={direction.d}
                  onChange={(e) => setDirection({ ...direction, d: e.target.value })}
                  placeholder="Define la estrategia..."
                  className="input-clean !p-3 text-xs font-medium h-20 resize-none"
                />
              </DirectionBlock>

              {/* P Section */}
              <DirectionBlock title="PROCEDIMIENTO (P)" subtitle="Metodología" icon={<List size={14} strokeWidth={2.5} />}>
                <textarea
                  value={direction.p}
                  onChange={(e) => setDirection({ ...direction, p: e.target.value })}
                  placeholder="¿Cómo llegaremos ahí?"
                  className="input-clean !p-3 text-xs font-medium h-20 resize-none"
                />
              </DirectionBlock>

              {/* H Section */}
              <DirectionBlock title="HERRAMIENTAS (H)" subtitle="Software y técnicas" icon={<Wrench size={14} strokeWidth={2.5} />}>
                <textarea
                  value={direction.h}
                  onChange={(e) => setDirection({ ...direction, h: e.target.value })}
                  placeholder="Detalles específicos..."
                  className="input-clean !p-3 text-xs font-medium h-20 resize-none"
                />
              </DirectionBlock>

              {/* IN Section */}
              <DirectionBlock title="INSUMOS (IN)" subtitle="Recursos y tiempo" icon={<Box size={14} strokeWidth={2.5} />}>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newIn}
                      onChange={(e) => setNewIn(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addIn()}
                      placeholder="Añadir recurso..."
                      className="input-clean !p-3 text-xs font-medium"
                    />
                    <button onClick={addIn} className="bg-[var(--bg-card)] p-3 rounded-xl text-[var(--text-main)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] transition-all border border-[var(--border-subtle)] shadow-sm active:scale-90">
                      <Plus size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => setIsInventoryPickerOpen(true)}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-[var(--bg-app)] border border-dashed border-[var(--border-subtle)] rounded-xl text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all text-[8px] font-bold uppercase tracking-widest"
                  >
                    <Package size={14} />
                    Importar de Inventario
                  </button>

                  <div className="flex flex-wrap gap-2">
                    {direction.in.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-full shadow-sm group">
                        <span className="text-xs font-medium text-[var(--text-main)]">{item}</span>
                        <button onClick={() => removeIn(i)} className="text-[var(--text-dim)] hover:text-red-500 transition-colors">
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-3 border-t border-[var(--border-subtle)] pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock size={14} strokeWidth={2.5} className="text-[var(--accent)]" />
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                          Deadline
                        </p>
                        <p className="text-sm font-bold text-[var(--text-main)] leading-none">
                          {timeTargetMinutes > 0 ? formatMinutes(timeTargetMinutes) : 'Sin deadline'}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-2 text-right shadow-sm">
                      <p className="text-[7px] font-bold uppercase tracking-[0.15em] text-[var(--text-dim)]">
                        Consumido
                      </p>
                      <p className="text-sm font-black leading-none text-[var(--text-main)]">
                        {formatMinutes(timeAccumulatedMinutes)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-center">
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={timeTargetMinutes || ''}
                      onChange={(event) => handleTimeTargetChange(event.target.value)}
                      placeholder="Ej. 60"
                      className="input-clean !p-3 h-11 text-xs font-medium"
                    />

                    <div className="flex gap-1.5">
                      {[5, 10, 30].map((minutes) => (
                        <button
                          key={minutes}
                          type="button"
                          onClick={() => addTimeMinutes(minutes)}
                          className="h-11 min-w-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--text-main)] shadow-sm transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95"
                        >
                          +{minutes}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="h-1.5 overflow-hidden rounded-full border border-[var(--border-subtle)] bg-[var(--bg-app)]">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          deadlineBarColor
                        )}
                        style={{ width: `${timeProgress}%` }}
                      />
                    </div>
                    <div className={cn(
                      "text-[8px] font-bold uppercase tracking-[0.12em] leading-tight",
                      deadlineState === 'over'
                        ? "text-red-500"
                        : deadlineState === 'onTime'
                          ? "text-emerald-500"
                          : "text-[var(--text-dim)]"
                    )}>
                      {deadlineMessage}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetTimeProgress}
                    className="text-[7px] font-bold uppercase tracking-[0.16em] text-[var(--text-dim)] transition-colors hover:text-[var(--accent)]"
                  >
                    Reiniciar consumo
                  </button>
                </div>
              </DirectionBlock>
            </div>

            {/* Bottom Action Bar */}
            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-app)] sticky bottom-0 z-10">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-[var(--accent)] text-[var(--accent-foreground)] py-4 rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-black/10 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <LoadingSpinner size="sm" light /> : <Save size={18} strokeWidth={2.5} />}
                Guardar ADN 7Flow
              </button>
            </div>

            {/* Inventory Picker Modal */}
            <AnimatePresence>
              {isInventoryPickerOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[32px] p-6 max-w-sm w-full shadow-2xl space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-[var(--text-main)]">Elegir de Inventario</h3>
                      <button onClick={() => setIsInventoryPickerOpen(false)} className="p-2 text-[var(--text-dim)] hover:text-[var(--accent)]">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="max-h-[40vh] overflow-y-auto pr-2 space-y-2 no-scrollbar">
                      {storage.getInventory().filter(item => item.status !== 'Consumido').length > 0 ? (
                        storage.getInventory()
                          .filter(item => item.status !== 'Consumido')
                          .map(item => (
                            <button
                              key={item.id}
                              onClick={() => handleImportFromInventory(item)}
                              className="w-full flex items-center justify-between p-4 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-2xl hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all text-left group"
                            >
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-[var(--text-main)]">{item.name}</p>
                                <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                                  {item.status} • {item.subStatus}
                                </p>
                              </div>
                              <Plus size={14} className="text-[var(--text-dim)] group-hover:text-[var(--accent)]" />
                            </button>
                          ))
                      ) : (
                        <div className="text-center py-10 opacity-50">
                          <Package size={32} className="mx-auto mb-2 opacity-20" />
                          <p className="text-[8px] font-bold uppercase tracking-widest">No hay items disponibles</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <ConfirmDialog
              open={Boolean(pendingInventoryInput)}
              title="Agregar al inventario"
              description={
                pendingInventoryInput
                  ? `¿Quieres guardar "${pendingInventoryInput}" también como item de inventario? Se creará como "Para usar".`
                  : ''
              }
              confirmLabel="Agregar"
              cancelLabel="Solo 7Flow"
              destructive={false}
              onCancel={() => setPendingInventoryInput(null)}
              onConfirm={confirmAddInputToInventory}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DirectionBlock({ title, subtitle, icon, children, className }: { title: string, subtitle: string, icon: React.ReactNode, children: React.ReactNode, className?: string }) {
  return (
    <div
      className={cn("card-clean p-4 space-y-4 shadow-lg shadow-black/5", className)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl flex items-center justify-center text-[var(--accent)] shadow-sm">
            {icon}
          </div>
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-[var(--text-main)] tracking-tight leading-none">{title}</h3>
            <p className="label-caps !ml-0 !mb-0 opacity-70 text-[7px]">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="pt-1">
        {children}
      </div>
    </div >
  );
}
