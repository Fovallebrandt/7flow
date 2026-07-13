import React, { lazy, Suspense, useEffect, useState } from 'react';
import { storage } from '../lib/storage';
import { Project } from '../types';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Target, Clock, AlertCircle, CheckCircle2, Plus, AlertTriangle, ListChecks } from 'lucide-react';
import { cn } from '../lib/utils';
import LoadingSpinner from './LoadingSpinner';
import PriorityReviewSheet from './PriorityReviewSheet';

const TasksSheet = lazy(() => import('./Tasks').then((module) => ({ default: module.TasksSheet })));

export default function Home() {
  const [projects, setProjects] = useState<Project[]>(storage.getProjects());
  const [loading, setLoading] = useState(false);
  const [isPriorityReviewOpen, setIsPriorityReviewOpen] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [startTaskCreate, setStartTaskCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const p = storage.getProjects();
    setProjects(p);
  }, []);

  const nowProject = projects.find((p) => p.priority === 'NOW' && p.status !== 'Terminado');
  const nextProjects = projects.filter((p) => p.priority !== 'NOW' && p.status !== 'Terminado')
    .sort((a, b) => {
      const pA = a.priority.replace('Next', '');
      const pB = b.priority.replace('Next', '');
      return parseInt(pA) - parseInt(pB);
    });
  const finishedProjects = projects.filter((p) => p.status === 'Terminado');
  const stagnantProjects = storage.getStagnantProjects(3); // 3 days threshold

  const getStagnationLevel = (id: string) => {
    const days = storage.getProjectStagnationDays(id);
    if (days >= 15) return { level: 3, color: 'text-red-600 dark:text-red-400', label: 'Crítico', icon: AlertTriangle, bg: 'bg-red-500/10', border: 'border-red-500/20', iconColor: 'bg-red-600' };
    if (days >= 7) return { level: 2, color: 'text-orange-700 dark:text-orange-500', label: 'Alerta', icon: AlertTriangle, bg: 'bg-orange-600/10', border: 'border-orange-600/20', iconColor: 'bg-orange-700' };
    if (days >= 3) return { level: 1, color: 'text-orange-500 dark:text-orange-400', label: 'Rezago', icon: AlertTriangle, bg: 'bg-orange-500/10', border: 'border-orange-500/20', iconColor: 'bg-orange-500' };
    return null;
  };

  const getBannerInfo = () => {
    const levels = stagnantProjects.map(p => getStagnationLevel(p.id)).filter(Boolean);
    if (levels.some(l => l?.level === 3)) return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', iconColor: 'bg-red-600', label: 'Crítico' };
    if (levels.some(l => l?.level === 2)) return { color: 'text-orange-700 dark:text-orange-500', bg: 'bg-orange-600/10', border: 'border-orange-600/20', iconColor: 'bg-orange-700', label: 'Alerta' };
    return { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', iconColor: 'bg-orange-500', label: 'Rezago' };
  };

  const bannerInfo = getBannerInfo();

  const handleStartProject = (id: string) => {
    storage.updateProject(id, { priority: 'NOW', status: 'Activo' });
    const p = storage.getProjects();
    setProjects(p);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="px-2">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setIsTasksOpen(true)}
            className="flex h-14 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-center shadow-sm transition-all hover:border-[var(--border-active)] active:scale-[0.98]"
            aria-label="Abrir tareas"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <ListChecks size={18} strokeWidth={2.5} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsPriorityReviewOpen(true)}
            className="flex h-14 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-center shadow-sm transition-all hover:border-[var(--border-active)] active:scale-[0.98]"
            aria-label="Abrir prioridades"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
              <Target size={18} strokeWidth={2.5} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setStartTaskCreate(true);
              setIsTasksOpen(true);
            }}
            className="flex h-14 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-center shadow-sm transition-all hover:border-[var(--border-active)] active:scale-[0.98]"
            aria-label="Agregar tarea"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-app)] text-[var(--text-main)]">
              <Plus size={18} strokeWidth={2.5} />
            </div>
          </button>
        </div>
      </div>

      {/* Stagnant Warning */}
      {stagnantProjects.length > 0 && (
        <div className={cn("mx-2 p-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500 border", bannerInfo.bg, bannerInfo.border)}>
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-lg", bannerInfo.iconColor)}>
            <AlertTriangle size={20} strokeWidth={2.5} />
          </div>
          <div className="space-y-0.5">
            <p className={cn("text-xs font-bold", bannerInfo.color)}>
              Atención: {stagnantProjects.length} {stagnantProjects.length === 1 ? 'proyecto' : 'proyectos'} en {bannerInfo.label}
            </p>
            <p className={cn("text-[9px] uppercase font-bold tracking-wider opacity-70", bannerInfo.color)}>
              Requieren tu atención inmediata para mantener el flujo
            </p>
          </div>
        </div>
      )}

      {/* NOW Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <label className="label-caps">Ejecutando Ahora</label>
          <span className="text-[8px] font-bold tracking-[0.1em] text-[var(--text-dim)] uppercase">Foco: 1 Proyecto</span>
        </div>

        {nowProject ? (
          <div
            onClick={() => navigate(`/project/${nowProject.id}`)}
            className="group relative card-clean p-4 cursor-pointer hover:shadow-xl hover:shadow-black/5 transition-all active:scale-[0.98]"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-bold tracking-[0.2em] text-[var(--text-dim)] uppercase">
                    {nowProject.type}
                  </span>
                  {(() => {
                    const level = getStagnationLevel(nowProject.id);
                    if (!level) return null;
                    return (
                      <span className={cn("text-[7px] font-black tracking-widest uppercase flex items-center gap-1", level.color)}>
                        <div className={cn("w-1 h-1 rounded-full animate-pulse", level.level === 3 ? "bg-red-600" : level.level === 2 ? "bg-orange-700" : "bg-orange-500")} />
                        {level.label}
                      </span>
                    );
                  })()}
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[var(--text-main)] group-hover:text-[var(--accent)] transition-colors leading-tight">
                  {nowProject.name}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-[var(--bg-app)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-main)] shadow-sm">
                <Target size={18} strokeWidth={2.5} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-[var(--bg-app)] p-3 rounded-lg border border-[var(--border-subtle)] shadow-inner">
                <p className="label-caps !ml-0 mb-1">Siguiente Acción</p>
                <p className="text-base font-medium text-[var(--text-main)] leading-relaxed">
                  {nowProject.nextAction || 'Define el siguiente paso...'}
                </p>
              </div>

              <div className="flex items-center gap-4 text-[var(--text-dim)] text-[8px] font-bold tracking-[0.1em] uppercase px-1">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} strokeWidth={2.5} />
                  <span>{new Date(nowProject.createdAt).toLocaleDateString('es-ES')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={12} strokeWidth={2.5} />
                  <span>{nowProject.status}</span>
                </div>
              </div>
            </div>
          </div >
        ) : (
          <div className="space-y-4">
            {nextProjects.length > 0 ? (
              <div className="space-y-3">
                <div className="bg-[var(--bg-card)] border border-dashed border-[var(--border-subtle)] rounded-[16px] p-6 text-center">
                  <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[var(--accent)] mb-1">Recomendados para hoy</p>
                  <p className="text-sm text-[var(--text-main)] font-medium">Elige uno de tu cola para comenzar:</p>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {nextProjects.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3 rounded-xl group hover:border-[var(--border-active)] transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-[8px] font-bold tracking-[0.1em] border transition-all",
                          p.priority === 'Next1' ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-foreground)] shadow-md shadow-black/5" : "bg-[var(--bg-app)] border-[var(--border-subtle)] text-[var(--text-dim)]"
                        )}>
                          {p.priority.replace('Next', 'N')}
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-base text-[var(--text-main)]">{p.name}</h4>
                          <p className="text-[8px] font-bold tracking-[0.15em] text-[var(--text-dim)] uppercase">{p.type}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartProject(p.id);
                        }}
                        className="bg-[var(--text-main)] text-[var(--bg-app)] text-[8px] font-bold tracking-[0.1em] uppercase px-4 py-2 rounded-full hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] transition-all active:scale-95"
                      >
                        Comenzar
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => navigate('/create')}
                    className="flex items-center gap-2 text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors"
                  >
                    <Plus size={14} />
                    <span className="text-[9px] font-bold tracking-[0.1em] uppercase">O crea algo nuevo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => navigate('/create')}
                className="bg-[var(--bg-card)] border border-dashed border-[var(--border-subtle)] rounded-[16px] p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[var(--accent)]/5 hover:border-[var(--border-active)] transition-all group"
              >
                <Plus className="text-[var(--text-dim)] mb-3 group-hover:text-[var(--accent)] transition-colors" size={24} />
                <p className="text-[var(--text-dim)] font-medium text-base mb-4">Sin proyecto en ejecución</p>
                <span className="bg-[var(--accent)] text-[var(--accent-foreground)] font-bold tracking-[0.15em] text-[9px] px-6 py-2.5 rounded-full uppercase shadow-lg shadow-black/10 active:scale-95 transition-all">
                  Comenzar algo nuevo
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Next Projects Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <label className="label-caps">En Cola</label>
          <span className="text-[8px] font-bold tracking-[0.1em] text-[var(--text-dim)] opacity-50 uppercase">{nextProjects.length} PROYECTOS</span>
        </div>
        <div className="space-y-2">
          {nextProjects.length > 0 ? (
            nextProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/project/${p.id}`)}
                className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3 rounded-xl cursor-pointer hover:shadow-lg hover:shadow-black/5 hover:border-[var(--border-active)] transition-all active:scale-[0.99] group"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-[8px] font-bold tracking-[0.1em] border transition-all",
                    p.priority === 'Next1' ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-foreground)] shadow-md shadow-black/5" : "bg-[var(--bg-app)] border-[var(--border-subtle)] text-[var(--text-dim)]"
                  )}>
                    {p.priority.replace('Next', 'N')}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-[var(--text-main)] group-hover:text-[var(--accent)] transition-colors">{p.name}</h4>
                      {(() => {
                        const level = getStagnationLevel(p.id);
                        if (!level) return null;
                        return (
                          <level.icon size={12} className={level.color} />
                        );
                      })()}
                    </div>
                    <p className="text-[8px] font-bold tracking-[0.15em] text-[var(--text-dim)] uppercase">{p.type}</p>
                  </div>
                </div>
                <ChevronRight className="text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-all" size={16} strokeWidth={2.5} />
              </div >
            ))
          ) : (
            <div className="text-center py-8 border border-dashed border-[var(--border-subtle)] rounded-[16px] opacity-50">
              <p className="text-[8px] uppercase font-bold tracking-[0.2em] text-[var(--text-dim)]">Cola vacía</p>
            </div>
          )}
        </div>
      </section>

      {/* Finished Projects Section */}
      {finishedProjects.length > 0 && (
        <section className="space-y-4 opacity-60 hover:opacity-100 transition-opacity">
          <label className="label-caps px-2">Completados</label>
          <div className="space-y-2">
            {finishedProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/project/${p.id}`)}
                className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 px-2 cursor-pointer hover:border-[var(--border-active)] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors" size={14} strokeWidth={2.5} />
                  <span className="text-base font-medium text-[var(--text-main)] line-through decoration-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors">{p.name}</span>
                </div>
                <span className="text-[8px] font-bold tracking-[0.15em] text-[var(--text-dim)] uppercase">{p.type}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <PriorityReviewSheet
        open={isPriorityReviewOpen}
        projects={projects}
        onClose={() => setIsPriorityReviewOpen(false)}
        onProjectsChange={setProjects}
      />
      {isTasksOpen && (
        <Suspense fallback={null}>
          <TasksSheet
            open={isTasksOpen}
            startCreate={startTaskCreate}
            onClose={() => {
              setIsTasksOpen(false);
              setStartTaskCreate(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
