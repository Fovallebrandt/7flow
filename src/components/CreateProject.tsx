import React, { useState } from 'react';
import { storage } from '../lib/storage';
import { useNavigate } from 'react-router-dom';
import { Priority, ProjectType } from '../types';
import { ArrowLeft, Check, Factory, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import LoadingSpinner from './LoadingSpinner';
import { createDefaultDirection } from '../lib/direction';

export default function CreateProject() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('Next1');
  const [type, setType] = useState<ProjectType>('De la vida');
  const [productionEnabled, setProductionEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setLoading(true);
    try {
      // If priority is NOW, we need to demote any existing NOW project
      if (priority === 'NOW') {
        const projects = storage.getProjects();
        projects.forEach(p => {
          if (p.priority === 'NOW' && p.status !== 'Terminado') {
            storage.updateProject(p.id, { priority: 'Next1' });
          }
        });
      }

      const id = storage.addProject({
        name,
        description,
        priority,
        type,
        status: 'Idea',
        createdAt: new Date().toISOString(),
        nextAction: '',
        direction: createDefaultDirection(),
        ownerId: 'local-user',
        productionEnabled
      });
      
      navigate(`/project/${id}`, { state: { isNew: true } });
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-24">
      <div className="flex items-center gap-4 px-2">
        <button onClick={() => navigate(-1)} className="p-2 text-[var(--text-dim)] hover:text-[var(--accent)] transition-all active:scale-90">
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
        <h2 className="text-[10px] uppercase font-bold tracking-[0.15em] text-[var(--text-main)]">Nuevo Proyecto</h2>
      </div>

      <form onSubmit={handleCreate} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="label-caps">Nombre del Proyecto</label>
            <input
              autoFocus
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="¿Qué vamos a construir?"
              className="input-clean text-xl font-bold tracking-tight !p-4"
            />
          </div>

          <div className="space-y-1">
            <label className="label-caps">Descripción Breve</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Unas palabras sobre el objetivo..."
              className="input-clean text-base font-medium h-24 resize-none !p-4"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 px-1">
          <div className="space-y-3">
            <label className="label-caps">Prioridad</label>
            <div className="space-y-1.5">
              {(['NOW', 'Next1', 'Next2', 'Next3'] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border font-bold uppercase tracking-[0.1em] text-[8px] transition-all active:scale-[0.97]",
                    priority === p ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-foreground)] shadow-md shadow-black/5" : "bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-dim)] hover:border-[var(--border-active)] shadow-sm"
                  )}
                >
                  {p}
                  {priority === p && <Check size={12} strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="label-caps">Tipo</label>
            <div className="space-y-1.5">
              {(['De la vida', 'Software', 'Contenido', 'Fisico'] as ProjectType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border font-bold uppercase tracking-[0.1em] text-[8px] transition-all active:scale-[0.97]",
                    type === t ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-foreground)] shadow-md shadow-black/5" : "bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-dim)] hover:border-[var(--border-active)] shadow-sm"
                  )}
                >
                  {t}
                  {type === t && <Check size={12} strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setProductionEnabled((current) => !current)}
          className="w-full flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-left shadow-sm transition-all hover:border-[var(--border-active)] active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              productionEnabled ? "bg-emerald-500/10 text-emerald-600" : "bg-[var(--bg-app)] text-[var(--text-dim)]"
            )}>
              <Factory size={18} strokeWidth={2.5} />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-[var(--text-main)]">¿Activar modo Producción?</p>
            </div>
          </div>
          <div className={cn(
            "w-12 h-6 rounded-full p-1 transition-colors duration-300",
            productionEnabled ? "bg-[var(--accent)]" : "bg-gray-300"
          )}>
            <div className={cn(
              "w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300",
              productionEnabled ? "translate-x-6" : "translate-x-0"
            )} />
          </div>
        </button>

        <div className="pt-2">
          <button
            disabled={loading}
            type="submit"
            className="w-full bg-[var(--accent)] text-[var(--accent-foreground)] py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-[9px] shadow-lg shadow-black/10 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <LoadingSpinner size="sm" light />
            ) : (
              <>
                <Plus size={18} strokeWidth={2.5} />
                Inicializar Proyecto
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
