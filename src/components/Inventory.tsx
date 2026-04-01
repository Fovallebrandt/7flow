import React, { useState, useEffect } from 'react';
import { storage } from '../lib/storage';
import { InventoryItem, InventoryStatus, InventoryConfig, ProjectPhotoStage } from '../types';
import { 
  Package, 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Wrench,
  ChevronDown,
  X,
  Save,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import ConfirmDialog from './ConfirmDialog';

const INVENTORY_STATUS_ORDER: InventoryStatus[] = [
  'En uso',
  'Para usar',
  'Para mejorar',
  'Guardado',
  'Consumido',
];

const PARA_USAR_OPTIONS = ['Sin abrir', 'Listo para usar', 'Reservado'];

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>(storage.getInventory());
  const [config, setConfig] = useState<InventoryConfig>(storage.getInventoryConfig());
  const [activeTab, setActiveTab] = useState<InventoryStatus>('En uso');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<InventoryItem | null>(null);

  useEffect(() => {
    const currentItems = storage.getInventory();
    const sourceProjectIds = Array.from(
      new Set(currentItems.map((item) => item.sourceProjectId).filter(Boolean) as string[]),
    );

    sourceProjectIds.forEach((projectId) => {
      storage.syncProjectPhotosToInventory(projectId);
    });

    setItems(storage.getInventory());
    setConfig(storage.getInventoryConfig());
  }, []);

  const filteredItems = items.filter(item => 
    item.status === activeTab && 
    (item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleUpdateStatus = (id: string, status: InventoryStatus, subStatus: string) => {
    storage.updateInventoryItem(id, { status, subStatus });
    setItems(storage.getInventory());
    toast.success('Estado actualizado');
  };

  const handleDelete = (id: string) => {
    const item = items.find((currentItem) => currentItem.id === id);
    if (item) setDeleteCandidate(item);
  };

  const confirmDelete = () => {
    if (!deleteCandidate) return;

    storage.deleteInventoryItem(deleteCandidate.id);
    setItems(storage.getInventory());
    toast.success('Item eliminado');
    setDeleteCandidate(null);
  };

  const getSubStatusOptions = (status: InventoryStatus) => {
    switch (status) {
      case 'Consumido': return ['Vendido', 'Comido', 'Regalado'];
      case 'En uso': return ['Subido', 'En la casa', 'En proyectos'];
      case 'Para usar': return PARA_USAR_OPTIONS;
      case 'Para mejorar': return config.improvementOptions;
      case 'Guardado': return config.locationOptions;
      default: return [];
    }
  };

  return (
    <div className="space-y-6 pb-40">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">Inventario</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Gestión de recursos y outputs</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsConfigOpen(true)}
            className="p-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-dim)] hover:text-[var(--accent)] transition-all"
          >
            <Wrench size={18} />
          </button>
          <button 
            onClick={() => setIsAddingItem(true)}
            className="p-3 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-xl shadow-lg shadow-[var(--accent)]/20 hover:opacity-90 transition-all"
          >
            <Plus size={18} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Buscar en el inventario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:border-[var(--accent)] transition-all shadow-sm"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
          {INVENTORY_STATUS_ORDER.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2.5 rounded-full text-[9px] font-bold uppercase tracking-[0.1em] transition-all whitespace-nowrap border",
                activeTab === tab 
                  ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-foreground)] shadow-md" 
                  : "bg-[var(--bg-card)] text-[var(--text-dim)] border-[var(--border-subtle)] hover:border-[var(--border-active)]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-4">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <InventoryCard 
              key={item.id} 
              item={item} 
              onDelete={() => handleDelete(item.id)}
              onEdit={() => setEditingItem(item)}
              onUpdateStatus={(status, sub) => handleUpdateStatus(item.id, status, sub)}
            />
          ))
        ) : (
          <div className="text-center py-20 card-clean border-dashed opacity-50">
            <Package size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest">No hay items en esta categoría</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(isAddingItem || editingItem) && (
          <InventoryFormModal 
            item={editingItem}
            config={config}
            onClose={() => {
              setIsAddingItem(false);
              setEditingItem(null);
            }}
            onSave={() => {
              setItems(storage.getInventory());
              setIsAddingItem(false);
              setEditingItem(null);
            }}
          />
        )}

        {isConfigOpen && (
          <InventoryConfigModal 
            config={config}
            onClose={() => setIsConfigOpen(false)}
            onSave={(newConfig) => {
              storage.saveInventoryConfig(newConfig);
              setConfig(newConfig);
              setIsConfigOpen(false);
              toast.success('Configuración guardada');
            }}
          />
        )}

        <ConfirmDialog
          open={Boolean(deleteCandidate)}
          title="Eliminar item"
          description={
            deleteCandidate
              ? `¿Seguro que quieres eliminar "${deleteCandidate.name}"? Esta acción no se puede deshacer.`
              : ''
          }
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          destructive
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={confirmDelete}
        />
      </AnimatePresence>
    </div>
  );
}

interface InventoryCardProps {
  item: InventoryItem;
  onDelete: () => void;
  onEdit: () => void;
  onUpdateStatus: (status: InventoryStatus, sub: string) => void;
}

const InventoryCard: React.FC<InventoryCardProps> = ({ 
  item, 
  onDelete, 
  onEdit, 
  onUpdateStatus 
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const statusColors = {
    'Consumido': 'bg-gray-500',
    'En uso': 'bg-blue-500',
    'Para usar': 'bg-emerald-500',
    'Para mejorar': 'bg-orange-500',
    'Guardado': 'bg-purple-500'
  };
  const photoStages: ProjectPhotoStage[] = ['before', 'after'];

  useEffect(() => {
    if (!showActions) return;

    const closeMenu = () => {
      setShowActions(false);
      setMenuPosition(null);
    };

    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);

    return () => {
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [showActions]);

  const openMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (showActions) {
      setShowActions(false);
      setMenuPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = Math.min(288, window.innerWidth - 24);
    const spaceAbove = rect.top - 12;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const openDown = spaceBelow >= spaceAbove;
    const availableSpace = openDown ? spaceBelow : spaceAbove;
    const maxHeight = Math.min(360, availableSpace);
    const left = Math.min(
      window.innerWidth - menuWidth - 12,
      Math.max(12, rect.right - menuWidth),
    );

    setMenuPosition({
      left,
      width: menuWidth,
      maxHeight,
      top: openDown ? rect.bottom + 8 : undefined,
      bottom: openDown ? undefined : window.innerHeight - rect.top + 8,
    });
    setShowActions(true);
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setIsExpanded((current) => !current)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setIsExpanded((current) => !current);
        }
      }}
      role="button"
      tabIndex={0}
      className="card-clean p-0 overflow-hidden group cursor-pointer"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", statusColors[item.status])} />
              <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                {item.status}
              </span>
            </div>
            <h3 className="text-lg font-bold text-[var(--text-main)] tracking-tight">{item.name}</h3>
          </div>
          <div className="flex gap-1">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              className="p-2 text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              className="p-2 text-[var(--text-dim)] hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {item.description && (
          <p className="text-xs text-[var(--text-dim)] leading-relaxed line-clamp-2">
            {item.description}
          </p>
        )}

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-app)] px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                  Sub-estado
                </span>
                <span className="text-xs font-semibold text-[var(--text-main)] text-right">
                  {item.subStatus}
                </span>
              </div>

              {(item.projectPhotos?.before || item.projectPhotos?.after) && (
                <div className="space-y-2 pt-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                    Fotos vinculadas
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {photoStages.map((stage) => {
                      const photo = item.projectPhotos?.[stage];
                      return (
                        <div key={stage} className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] aspect-[4/3]">
                          {photo ? (
                            <img
                              src={photo.dataUrl}
                              alt={stage === 'before' ? 'Foto de antes' : 'Foto de después'}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-[var(--bg-app)] text-[8px] font-bold uppercase tracking-[0.15em] text-[var(--text-dim)]">
                              Sin foto
                            </div>
                          )}
                          <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[7px] font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm">
                            {stage === 'before' ? 'Antes' : 'Después'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
            <Clock size={10} />
            <span>Actualizado: {new Date(item.updatedAt).toLocaleDateString()}</span>
          </div>
          
          <div className="relative">
            <button 
              onClick={(event) => {
                event.stopPropagation();
                openMenu(event);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg text-[8px] font-bold uppercase tracking-widest hover:border-[var(--accent)] transition-all"
            >
              Cambiar Estado <ChevronDown size={10} />
            </button>

            {showActions && menuPosition && createPortal(
              <AnimatePresence>
                <>
                  <div className="fixed inset-0 z-[90]" onClick={() => {
                    setShowActions(false);
                    setMenuPosition(null);
                  }} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.96, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 4 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      left: menuPosition.left,
                      top: menuPosition.top,
                      bottom: menuPosition.bottom,
                      width: menuPosition.width,
                      maxHeight: menuPosition.maxHeight,
                    }}
                    className="fixed bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl z-[100] overflow-y-auto overscroll-contain p-2 space-y-1"
                  >
                    {INVENTORY_STATUS_ORDER.map((s) => {
                      const defaultSubStatus =
                        getOptionsForStatus(s, storage.getInventoryConfig())[0] ?? item.subStatus ?? s;

                      return (
                        <button
                          key={s}
                          onClick={() => {
                            onUpdateStatus(s, defaultSubStatus);
                            setShowActions(false);
                            setMenuPosition(null);
                          }}
                          className="w-full text-left px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] transition-all"
                        >
                          {s}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              </AnimatePresence>,
              document.body
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function getOptionsForStatus(status: InventoryStatus, config: InventoryConfig) {
  switch (status) {
    case 'Consumido': return ['Vendido', 'Comido', 'Regalado'];
    case 'En uso': return ['Subido', 'En la casa', 'En proyectos'];
    case 'Para usar': return PARA_USAR_OPTIONS;
    case 'Para mejorar': return config.improvementOptions;
    case 'Guardado': return config.locationOptions;
    default: return [];
  }
}

function InventoryFormModal({ item, config, onClose, onSave }: { item: InventoryItem | null, config: InventoryConfig, onClose: () => void, onSave: () => void }) {
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [status, setStatus] = useState<InventoryStatus>(item?.status || 'En uso');
  const [subStatus, setSubStatus] = useState(item?.subStatus || '');

  useEffect(() => {
    const options = getOptionsForStatus(status, config);
    const nextSubStatus = options[0] ?? '';

    if (!options.includes(subStatus)) {
      setSubStatus(nextSubStatus);
    }
  }, [status, config, subStatus]);

  const handleSave = () => {
    if (!name.trim()) return toast.error('El nombre es obligatorio');
    
    if (item) {
      storage.updateInventoryItem(item.id, { name, description, status, subStatus });
      toast.success('Item actualizado');
    } else {
      storage.addInventoryItem({ name, description, status, subStatus });
      toast.success('Item creado');
    }
    onSave();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight text-[var(--text-main)]">
            {item ? 'Editar Item' : 'Nuevo Item'}
          </h3>
          <button onClick={onClose} className="p-2 text-[var(--text-dim)] hover:text-[var(--accent)]">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="label-caps">Nombre</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del recurso..."
              className="input-clean !p-4 text-sm font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="label-caps">Descripción</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles adicionales..."
              className="input-clean !p-4 text-sm font-medium h-24 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label-caps">Estado</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value as InventoryStatus)}
                className="input-clean !p-4 text-[10px] font-bold uppercase tracking-widest appearance-none"
              >
                <option value="En uso">En uso</option>
                <option value="Para usar">Para usar</option>
                <option value="Para mejorar">Para mejorar</option>
                <option value="Guardado">Guardado</option>
                <option value="Consumido">Consumido</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="label-caps">Sub-estado</label>
              <select 
                value={subStatus}
                onChange={(e) => setSubStatus(e.target.value)}
                className="input-clean !p-4 text-[10px] font-bold uppercase tracking-widest appearance-none"
              >
                {getOptionsForStatus(status, config).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-4 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-[var(--accent)]/20 hover:opacity-90 active:scale-95 transition-all"
        >
          {item ? 'Guardar Cambios' : 'Crear Item'}
        </button>
      </motion.div>
    </div>
  );
}

function InventoryConfigModal({ config, onClose, onSave }: { config: InventoryConfig, onClose: () => void, onSave: (config: InventoryConfig) => void }) {
  const [improvementOptions, setImprovementOptions] = useState(config.improvementOptions);
  const [locationOptions, setLocationOptions] = useState(config.locationOptions);
  const [newImprovement, setNewImprovement] = useState('');
  const [newLocation, setNewLocation] = useState('');

  const addOption = (type: 'improvement' | 'location') => {
    if (type === 'improvement') {
      if (!newImprovement.trim()) return;
      setImprovementOptions([...improvementOptions, newImprovement.trim()]);
      setNewImprovement('');
    } else {
      if (!newLocation.trim()) return;
      setLocationOptions([...locationOptions, newLocation.trim()]);
      setNewLocation('');
    }
  };

  const removeOption = (type: 'improvement' | 'location', index: number) => {
    if (type === 'improvement') {
      setImprovementOptions(improvementOptions.filter((_, i) => i !== index));
    } else {
      setLocationOptions(locationOptions.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight text-[var(--text-main)]">Configuración</h3>
          <button onClick={onClose} className="p-2 text-[var(--text-dim)] hover:text-[var(--accent)]">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
          <div className="space-y-4">
            <label className="label-caps">Opciones de Mejora</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newImprovement}
                onChange={(e) => setNewImprovement(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addOption('improvement')}
                placeholder="Nueva mejora..."
                className="input-clean !p-3 text-xs font-medium"
              />
              <button onClick={() => addOption('improvement')} className="p-3 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl text-[var(--accent)]">
                <Plus size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {improvementOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 bg-[var(--bg-app)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-full">
                  <span className="text-[9px] font-bold uppercase tracking-wider">{opt}</span>
                  <button onClick={() => removeOption('improvement', i)} className="text-red-500">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="label-caps">Locaciones de Guardado</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addOption('location')}
                placeholder="Nueva locación..."
                className="input-clean !p-3 text-xs font-medium"
              />
              <button onClick={() => addOption('location')} className="p-3 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl text-[var(--accent)]">
                <Plus size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {locationOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 bg-[var(--bg-app)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-full">
                  <span className="text-[9px] font-bold uppercase tracking-wider">{opt}</span>
                  <button onClick={() => removeOption('location', i)} className="text-red-500">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => onSave({ improvementOptions, locationOptions })}
          className="w-full py-4 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-[var(--accent)]/20 hover:opacity-90 active:scale-95 transition-all"
        >
          Guardar Configuración
        </button>
      </motion.div>
    </div>
  );
}
