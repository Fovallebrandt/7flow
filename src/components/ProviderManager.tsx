import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Archive, Building2, Edit2, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '../lib/storage';
import { ProductionCostCategory, Provider } from '../types';
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

const emptyForm = {
  name: '',
  category: 'Materiales' as ProductionCostCategory,
  contact: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  notes: '',
};

interface ProviderManagerProps {
  open: boolean;
  onClose: () => void;
}

export default function ProviderManager({ open, onClose }: ProviderManagerProps) {
  const [providers, setProviders] = useState<Provider[]>(storage.getProviders());
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Provider | null>(null);
  const [form, setForm] = useState(emptyForm);

  const activeProviders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return providers.filter((provider) => {
      const matchesQuery = !query ||
        provider.name.toLowerCase().includes(query) ||
        provider.category.toLowerCase().includes(query) ||
        provider.contact.toLowerCase().includes(query) ||
        provider.phone.toLowerCase().includes(query) ||
        provider.email.toLowerCase().includes(query);

      return matchesQuery;
    });
  }, [providers, searchQuery]);

  const refresh = () => setProviders(storage.getProviders());

  const openCreateForm = () => {
    setEditingProvider(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEditForm = (provider: Provider) => {
    setEditingProvider(provider);
    setForm({
      name: provider.name,
      category: provider.category,
      contact: provider.contact,
      phone: provider.phone,
      email: provider.email,
      website: provider.website,
      address: provider.address,
      notes: provider.notes,
    });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('El nombre del proveedor es obligatorio');
      return;
    }

    if (editingProvider) {
      storage.updateProvider(editingProvider.id, form);
      toast.success('Proveedor actualizado');
    } else {
      storage.addProvider({ ...form, archived: false });
      toast.success('Proveedor creado');
    }

    refresh();
    setIsFormOpen(false);
    setEditingProvider(null);
    setForm(emptyForm);
  };

  const confirmDelete = () => {
    if (!deleteCandidate) return;
    storage.deleteProvider(deleteCandidate.id);
    toast.success('Proveedor eliminado');
    setDeleteCandidate(null);
    refresh();
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
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
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                      <Building2 size={18} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-dim)]">Mantenedor</p>
                      <h3 className="text-lg font-bold tracking-tight text-[var(--text-main)]">Proveedores</h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full p-2 text-[var(--text-dim)] transition-all hover:text-[var(--accent)] active:scale-90"
                  >
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" size={14} />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Buscar proveedor..."
                      className="input-clean !pl-9 !p-3 text-xs font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="rounded-xl bg-[var(--accent)] px-4 text-[var(--accent-foreground)]"
                  >
                    <Plus size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 pb-10 space-y-3 no-scrollbar">
                {activeProviders.length > 0 ? activeProviders.map((provider) => (
                  <article
                    key={provider.id}
                    className={cn(
                      "card-clean p-4 space-y-3",
                      provider.archived && "opacity-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-bold text-[var(--text-main)]">{provider.name}</p>
                          {provider.archived && (
                            <span className="rounded-full bg-[var(--bg-app)] px-2 py-0.5 text-[7px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                              Archivado
                            </span>
                          )}
                        </div>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">{provider.category}</p>
                        {(provider.contact || provider.phone || provider.email) && (
                          <p className="text-[10px] leading-relaxed text-[var(--text-dim)]">
                            {[provider.contact, provider.phone, provider.email].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        {provider.website && (
                          <p className="text-[10px] leading-relaxed text-[var(--accent)] break-all">{provider.website}</p>
                        )}
                        {provider.notes && (
                          <p className="text-xs leading-relaxed text-[var(--text-dim)]">{provider.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEditForm(provider)}
                          className="p-2 text-[var(--text-dim)] hover:text-[var(--accent)]"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            storage.updateProvider(provider.id, { archived: !provider.archived });
                            refresh();
                          }}
                          className="p-2 text-[var(--text-dim)] hover:text-[var(--accent)]"
                        >
                          <Archive size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(provider)}
                          className="p-2 text-[var(--text-dim)] hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                )) : (
                  <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-8 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                    Sin proveedores registrados
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 18 }}
              className="w-full max-w-md rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--text-main)]">
                  {editingProvider ? 'Editar proveedor' : 'Nuevo proveedor'}
                </h3>
                <button type="button" onClick={() => setIsFormOpen(false)} className="p-2 text-[var(--text-dim)] hover:text-[var(--accent)]">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1 no-scrollbar">
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Nombre del proveedor"
                  className="input-clean !p-3 text-sm font-medium"
                />
                <select
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as ProductionCostCategory }))}
                  className="input-clean !p-3 text-[10px] font-bold uppercase tracking-widest appearance-none"
                >
                  {COST_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={form.contact}
                    onChange={(event) => setForm((current) => ({ ...current, contact: event.target.value }))}
                    placeholder="Contacto"
                    className="input-clean !p-3 text-xs font-medium"
                  />
                  <input
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="Teléfono / WhatsApp"
                    className="input-clean !p-3 text-xs font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Email"
                    className="input-clean !p-3 text-xs font-medium"
                  />
                  <input
                    value={form.website}
                    onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                    placeholder="Web / link"
                    className="input-clean !p-3 text-xs font-medium"
                  />
                </div>
                <input
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                  placeholder="Dirección"
                  className="input-clean !p-3 text-xs font-medium"
                />
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Notas"
                  className="input-clean !p-3 text-xs font-medium h-24 resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleSave}
                className="w-full rounded-2xl bg-[var(--accent)] py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-foreground)] flex items-center justify-center gap-2"
              >
                <Save size={14} />
                Guardar proveedor
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={Boolean(deleteCandidate)}
        title="Eliminar proveedor"
        description={
          deleteCandidate
            ? `¿Seguro que quieres eliminar "${deleteCandidate.name}"? Las compras antiguas conservarán el nombre escrito.`
            : ''
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
