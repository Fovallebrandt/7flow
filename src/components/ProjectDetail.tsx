import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { storage } from '../lib/storage';
import { fileToProjectPhoto } from '../lib/image';
import { Project, LogEntry, ProjectStatus, Priority, ProjectPhoto, ProjectPhotoStage } from '../types';
import { ArrowLeft, Edit3, CheckCircle2, Clock, History, Send, Target, ChevronRight, Check, Package as PackageIcon, AlertTriangle, Camera } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatMinutes } from '../lib/direction';
import { toast } from 'sonner';
import LoadingSpinner from './LoadingSpinner';
import DirectionSheet from './DirectionSheet';
import ProjectPhotoSheet from './ProjectPhotoSheet';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState<Project | null>(id ? storage.getProject(id) || null : null);
  const [logs, setLogs] = useState<LogEntry[]>(id ? storage.getLogs(id) : []);
  const [newLog, setNewLog] = useState('');
  const [newNextAction, setNewNextAction] = useState(project?.nextAction || '');
  const [isFinished, setIsFinished] = useState(false);
  const [showFinishedModal, setShowFinishedModal] = useState(false);
  const [isDirectionOpen, setIsDirectionOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [photoReminderMode, setPhotoReminderMode] = useState(false);
  const [pendingFinishOptions, setPendingFinishOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stagnationDays, setStagnationDays] = useState(0);
  const [beforePhoto, setBeforePhoto] = useState<ProjectPhoto | undefined>(id ? storage.getProjectPhoto(id, 'before') : undefined);
  const [afterPhoto, setAfterPhoto] = useState<ProjectPhoto | undefined>(id ? storage.getProjectPhoto(id, 'after') : undefined);
  const [photoLoadingStage, setPhotoLoadingStage] = useState<ProjectPhotoStage | null>(null);
  const beforePhotoInputRef = useRef<HTMLInputElement>(null);
  const afterPhotoInputRef = useRef<HTMLInputElement>(null);
  const photoCount = (beforePhoto ? 1 : 0) + (afterPhoto ? 1 : 0);

  const syncPhotos = (projectId: string) => {
    setBeforePhoto(storage.getProjectPhoto(projectId, 'before'));
    setAfterPhoto(storage.getProjectPhoto(projectId, 'after'));
  };

  useEffect(() => {
    if (!id) return;

    const p = storage.getProject(id);
    if (p) {
      setProject(p);
      setNewNextAction(p.nextAction || '');
      setLogs(storage.getLogs(id));
      
      // Check stagnation days
      const days = storage.getProjectStagnationDays(id);
      setStagnationDays(days);
      syncPhotos(id);
      storage.syncProjectPhotosToInventory(id);
      
      // Auto-open direction sheet if it's a new project from the creation flow
      if (location.state?.isNew) {
        setIsDirectionOpen(true);
        // Clear state to prevent re-opening on refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [id, location.state]);

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newLog.trim()) return;

    try {
      const logData = {
        text: newLog.trim(),
        timestamp: new Date().toISOString(),
        completedAction: project?.nextAction || '',
        newNextAction: isFinished ? 'Proyecto Finalizado' : newNextAction.trim()
      };

      storage.addLog(id, logData);
      
      const updates: Partial<Project> = {
        nextAction: isFinished ? '' : newNextAction.trim(),
        status: isFinished ? 'Terminado' : (project?.status === 'Idea' ? 'Activo' : project?.status)
      };
      
      storage.updateProject(id, updates);
      if (isFinished) {
        storage.recordProjectTimeStat(id, logData.timestamp);
      }
      
      if (isFinished) {
        const needsAfterPhotoReminder = Boolean(beforePhoto && !afterPhoto);
        if (needsAfterPhotoReminder) {
          setPhotoReminderMode(true);
          setPendingFinishOptions(true);
          setIsPhotoOpen(true);
          toast.info('Tienes foto de inicio. Saca la foto final antes de cerrar.');
        } else {
          setShowFinishedModal(true);
        }
      }
      
      // Refresh state
      const updatedProject = storage.getProject(id);
      if (updatedProject) setProject(updatedProject);
      setLogs(storage.getLogs(id));
      setStagnationDays(0); // Reset stagnation after activity

      setNewLog('');
      setNewNextAction('');
      setIsFinished(false);
    } catch (error) {
      console.error('Error adding log:', error);
    }
  };

  const handleStatusChange = (status: ProjectStatus) => {
    if (!id || !project) return;
    try {
      storage.updateProject(id, { status });
      setProject({ ...project, status });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handlePriorityChange = (priority: Priority) => {
    if (!id || !project) return;
    try {
      if (priority === 'NOW') {
        const projects = storage.getProjects();
        projects.forEach(p => {
          if (p.id !== id && p.priority === 'NOW' && p.status !== 'Terminado') {
            storage.updateProject(p.id, { priority: 'Next1' });
          }
        });
      }
      const updates: Partial<Project> = { priority };
      if (priority === 'NOW') {
        updates.status = 'Activo';
      }
      storage.updateProject(id, updates);
      setProject({ ...project, ...updates });
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  const handlePhotoChange = async (stage: ProjectPhotoStage, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (!id || !file) return;

    setPhotoLoadingStage(stage);

    try {
      const photo = await fileToProjectPhoto(file);
      storage.saveProjectPhoto(id, stage, photo);
      storage.syncProjectPhotosToInventory(id);
      syncPhotos(id);
      toast.success(
        stage === 'before' ? 'Foto de antes guardada' : 'Foto de después guardada',
        stage === 'after' && photoReminderMode
          ? { description: 'Ya puedes cerrar el proyecto y guardar el inventario.' }
          : undefined,
      );
    } catch (error) {
      console.error('Error saving project photo:', error);
      toast.error('No se pudo guardar la foto', {
        description:
          error instanceof DOMException && error.name === 'QuotaExceededError'
            ? 'La imagen es demasiado grande para este navegador. Prueba con otra más pequeña.'
            : error instanceof Error
              ? error.message
              : 'Inténtalo de nuevo con otra imagen.',
      });
    } finally {
      setPhotoLoadingStage(null);
    }
  };

  const handleDeletePhoto = (stage: ProjectPhotoStage) => {
    if (!id) return;

    storage.deleteProjectPhoto(id, stage);
    storage.syncProjectPhotosToInventory(id);
    syncPhotos(id);
    toast.success(stage === 'before' ? 'Foto de antes eliminada' : 'Foto de después eliminada');
  };

  const handlePhotoSheetClose = () => {
    setIsPhotoOpen(false);

    if (pendingFinishOptions) {
      setPendingFinishOptions(false);
      setPhotoReminderMode(false);
      setShowFinishedModal(true);
    }
  };

  const getStagnationLevel = () => {
    if (stagnationDays >= 15) return { level: 3, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Crítico', days: '15+', iconColor: 'bg-red-600', dotColor: 'bg-red-600' };
    if (stagnationDays >= 7) return { level: 2, color: 'text-orange-700 dark:text-orange-500', bg: 'bg-orange-600/10', border: 'border-orange-600/20', label: 'Alerta', days: '7+', iconColor: 'bg-orange-700', dotColor: 'bg-orange-700' };
    if (stagnationDays >= 3) return { level: 1, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'Rezago', days: '3+', iconColor: 'bg-orange-500', dotColor: 'bg-orange-500' };
    return null;
  };

  const stagnation = getStagnationLevel();

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>;
  if (!project) return <div className="text-[var(--text-dim)] font-sans font-medium text-center py-20">Proyecto no encontrado</div>;

  const direction = project.direction;
  const timeTargetMinutes = direction?.timeTargetMinutes ?? 0;
  const timeAccumulatedMinutes = direction?.timeAccumulatedMinutes ?? 0;
  const hasTimeProgress = timeTargetMinutes > 0 || timeAccumulatedMinutes > 0;
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

  const finishedOptions = [
    { label: 'Venderlo', icon: '💰' },
    { label: 'Regalarlo', icon: '🎁' },
    { label: 'Comerlo', icon: '😋' },
    { label: 'Usarlo', icon: '🛠️' },
    { label: 'Subirlo', icon: '🚀' },
    { label: 'Pintarlo', icon: '🎨' },
  ];

  const handleFinishOption = (option: string) => {
    if (!id || !project) return;
    
    // Export all OUT items to inventory if they don't exist yet
    if (project.direction?.out && project.direction.out.length > 0) {
      const inventory = storage.getInventory();
      project.direction.out.forEach(outName => {
        const exists = inventory.some(item => item.name === outName && item.sourceProjectId === id);
        if (!exists) {
          storage.addInventoryItem({
            name: outName,
            description: `Resultado del proyecto: ${project.name}`,
            status: 'Guardado',
            subStatus: 'En la casa',
            sourceProjectId: id
          });
        }
      });
      
      toast.success('Resultados guardados en el inventario', {
        description: `${project.direction.out.length} items agregados.`
      });
    }

    storage.syncProjectPhotosToInventory(id);

    const logData = {
      text: `Decisión final: ${option}`,
      timestamp: new Date().toISOString(),
      completedAction: 'Proyecto Finalizado',
      newNextAction: option
    };
    storage.addLog(id, logData);
    setLogs(storage.getLogs(id));
    setShowFinishedModal(false);
  };

  const handleExportToInventory = (outputName: string) => {
    if (!id) return;
    
    // Check if already exported (simple check by name in inventory)
    const inventory = storage.getInventory();
    const exists = inventory.some(item => item.name === outputName && item.sourceProjectId === id);
    
    if (exists) {
      toast.error('Este resultado ya está en el inventario');
      return;
    }

    storage.addInventoryItem({
      name: outputName,
      description: `Resultado del proyecto: ${project.name}`,
      status: 'Guardado',
      subStatus: 'En la casa',
      sourceProjectId: id
    });

    toast.success('Resultado guardado en el inventario', {
      description: `"${outputName}" ahora está disponible como insumo.`
    });
  };

  return (
    <div className="space-y-8 pb-40">
      {/* Direction Sheet */}
      <DirectionSheet 
        isOpen={isDirectionOpen} 
        onClose={() => setIsDirectionOpen(false)} 
        projectId={id || ''}
        onSave={() => {
          const p = storage.getProject(id || '');
          if (p) setProject(p);
        }}
      />

      <ProjectPhotoSheet
        isOpen={isPhotoOpen}
        onClose={handlePhotoSheetClose}
        projectName={project.name}
        reminderMode={photoReminderMode}
        beforePhoto={beforePhoto}
        afterPhoto={afterPhoto}
        beforeLoading={photoLoadingStage === 'before'}
        afterLoading={photoLoadingStage === 'after'}
        onCaptureBefore={() => beforePhotoInputRef.current?.click()}
        onCaptureAfter={() => afterPhotoInputRef.current?.click()}
        onDeleteBefore={() => handleDeletePhoto('before')}
        onDeleteAfter={() => handleDeletePhoto('after')}
      />

      {/* Finished Modal */}
      {showFinishedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[32px] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center"
          >
            <div className="space-y-2">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">¡Muy bien!</h3>
              <p className="text-sm text-[var(--text-dim)] leading-relaxed">
                Has terminado este proyecto. Ahora, dime... ¿cuál es el siguiente paso real?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {finishedOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => handleFinishOption(opt.label)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-subtle)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all active:scale-95 group"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">{opt.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-main)]">{opt.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowFinishedModal(false)}
              className="w-full py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors"
            >
              Omitir por ahora
            </button>
          </div >
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 text-[var(--text-dim)] hover:text-[var(--accent)] transition-all active:scale-90">
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-bold tracking-[0.15em] text-[var(--text-dim)] uppercase">
                {project.type}
              </span>
              {stagnation && (
                <span className={cn("text-[7px] font-black tracking-widest uppercase flex items-center gap-1", stagnation.color)}>
                  <div className={cn("w-1 h-1 rounded-full animate-pulse", stagnation.dotColor)} />
                  {stagnation.label}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--text-main)] leading-tight">{project.name}</h2>
          </div>
        </div>
        <button
          onClick={() => setIsDirectionOpen(true)}
          className="p-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--border-active)] transition-all shadow-sm active:scale-95"
        >
          <Edit3 size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Status & Priority Selectors */}
      {stagnation && (
        <div className={cn("mx-2 p-4 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500", stagnation.bg, stagnation.border, "border")}>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg", stagnation.iconColor)}>
            <AlertTriangle size={20} strokeWidth={2.5} />
          </div>
          <div className="flex-1 space-y-3">
            <div className="space-y-0.5">
              <p className={cn("text-xs font-bold", stagnation.color)}>
                Este proyecto está en nivel de {stagnation.label}
              </p>
              <p className={cn("text-[9px] uppercase font-bold tracking-wider opacity-70", stagnation.color)}>
                No has registrado avances en {stagnationDays} días. ¿Qué tal un pequeño paso hoy?
              </p>
            </div>
            {project.status !== 'Bloqueado' && (
              <button
                onClick={() => handleStatusChange('Bloqueado')}
                className={cn("text-white text-[8px] font-black tracking-widest uppercase px-4 py-2 rounded-lg shadow-lg active:scale-95 transition-all", stagnation.iconColor)}
              >
                Mover a Bloqueado
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4 px-1">
        <div className="space-y-2">
          <label className="label-caps">Estado</label>
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
            {(['Idea', 'Activo', 'Bloqueado', 'Terminado'] as ProjectStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={cn(
                  "px-4 py-2 rounded-full text-[8px] font-bold uppercase tracking-[0.1em] transition-all whitespace-nowrap border active:scale-95",
                  project.status === s ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-foreground)] shadow-md shadow-black/5" : "bg-[var(--bg-card)] text-[var(--text-dim)] border-[var(--border-subtle)] hover:border-[var(--border-active)]"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="label-caps">Prioridad</label>
          <div className="flex items-end gap-2">
            <div className="flex-1 overflow-x-auto pb-1.5 no-scrollbar">
              <div className="flex gap-1.5">
                {(['NOW', 'Next1', 'Next2', 'Next3'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePriorityChange(p)}
                    className={cn(
                      "px-4 py-2 rounded-full text-[8px] font-bold uppercase tracking-[0.1em] transition-all whitespace-nowrap flex items-center gap-1.5 border active:scale-95",
                      project.priority === p ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-foreground)] shadow-md shadow-black/5" : "bg-[var(--bg-card)] text-[var(--text-dim)] border-[var(--border-subtle)] hover:border-[var(--border-active)]"
                    )}
                  >
                    {p}
                    {project.priority === p && <Check size={10} strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPhotoOpen(true)}
              className="relative flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-dim)] shadow-sm transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95"
              aria-label="Abrir fotos del proyecto"
            >
              <Camera size={14} strokeWidth={2.5} />
              <span className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.12em]">Foto</span>
              {photoCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-[var(--bg-app)] bg-[var(--accent)] px-1 text-[9px] font-black text-[var(--accent-foreground)]">
                  {photoCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Summary of Direction */}
      <section className="card-clean p-5 space-y-6">
        <div className="flex items-center justify-between">
          <label className="label-caps !ml-0 !mb-0">Resumen de 7Flow ADN</label>
          <button onClick={() => setIsDirectionOpen(true)} className="text-[var(--accent)] text-[8px] font-bold uppercase tracking-[0.1em] flex items-center gap-1.5 hover:opacity-70 transition-opacity">
            Ver Todo <ChevronRight size={12} strokeWidth={3} />
          </button>
        </div>
        
        <div className="space-y-2">
          <p className="label-caps !ml-0 opacity-60">Propósito (WHY)</p>
          <p className="text-sm font-medium text-[var(--text-main)] leading-relaxed">{project.direction?.why || 'No definido'}</p>
        </div>

        {project.direction?.out && project.direction.out.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-[var(--border-subtle)]">
            <p className="label-caps !ml-0 opacity-60">Resultados (OUT)</p>
            <div className="space-y-2">
              {project.direction.out.map((out, i) => (
                <div key={i} className="flex items-center justify-between bg-[var(--bg-app)] border border-[var(--border-subtle)] p-3 rounded-xl group">
                  <span className="text-xs font-medium text-[var(--text-main)]">{out}</span>
                  <button 
                    onClick={() => handleExportToInventory(out)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg text-[7px] font-bold uppercase tracking-widest text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all"
                  >
                    <PackageIcon size={10} />
                    Inventario
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {(direction?.in?.length > 0 || hasTimeProgress) && (
        <section className="card-clean p-5 space-y-5">
          <div className="flex items-center justify-between">
            <label className="label-caps !ml-0 !mb-0">Insumos (IN)</label>
            <button onClick={() => setIsDirectionOpen(true)} className="text-[var(--accent)] text-[8px] font-bold uppercase tracking-[0.1em] flex items-center gap-1.5 hover:opacity-70 transition-opacity">
              Ver Todo <ChevronRight size={12} strokeWidth={3} />
            </button>
          </div>

          {direction?.in?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {direction.in.map((input, index) => (
                <div key={index} className="flex items-center gap-2 bg-[var(--bg-app)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-full shadow-sm">
                  <span className="text-[10px] font-medium text-[var(--text-main)]">{input}</span>
                </div>
              ))}
            </div>
          )}

          {hasTimeProgress && (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-app)] p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-[var(--text-dim)]">Deadline</p>
                  <p className="text-sm font-semibold text-[var(--text-main)]">
                    {timeTargetMinutes > 0 ? formatMinutes(timeTargetMinutes) : 'Sin deadline definido'}
                  </p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-[var(--text-dim)]">Consumido</p>
                  <p className="text-sm font-semibold text-[var(--text-main)]">
                    {formatMinutes(timeAccumulatedMinutes)}
                  </p>
                </div>
              </div>

              {timeTargetMinutes > 0 && (
                <div className="space-y-2">
                  <div className="h-2 overflow-hidden rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        deadlineBarColor
                      )}
                      style={{ width: `${timeProgress}%` }}
                    />
                  </div>
                  <p className={cn(
                    "text-[8px] font-bold uppercase tracking-[0.15em]",
                    deadlineState === 'over'
                      ? "text-red-500"
                      : deadlineState === 'onTime'
                        ? "text-emerald-500"
                        : "text-[var(--text-dim)]"
                  )}>
                    {deadlineMessage}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <input
        ref={beforePhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => void handlePhotoChange('before', event)}
      />
      <input
        ref={afterPhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => void handlePhotoChange('after', event)}
      />

      {/* Log / Update Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 px-2">
          <History size={16} strokeWidth={2.5} className="text-[var(--text-dim)]" />
          <label className="label-caps !ml-0 !mb-0">Bitácora de Avance</label>
        </div>

        <form onSubmit={handleAddLog} className="card-clean p-5 space-y-5 shadow-xl shadow-black/5">
          {/* Current Next Action Display */}
          <div className="space-y-2 pb-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <Target size={14} strokeWidth={2.5} />
              <label className="text-[7px] font-bold uppercase tracking-widest opacity-70">Siguiente Acción Actual</label>
            </div>
            <p className="text-lg font-bold text-[var(--text-main)] tracking-tight leading-tight">
              {project.nextAction || 'Definir el siguiente paso...'}
            </p>
          </div>

          <textarea
            required
            value={newLog}
            onChange={(e) => setNewLog(e.target.value)}
            placeholder="¿Qué avanzaste?"
            className="w-full bg-transparent border-none text-sm font-medium text-[var(--text-main)] placeholder:text-[var(--text-dim)] focus:ring-0 resize-none h-20"
          />
          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex-1 mr-4 space-y-3">
              <input
                type="text"
                value={newNextAction}
                onChange={(e) => setNewNextAction(e.target.value)}
                placeholder="Nueva siguiente acción..."
                disabled={isFinished}
                className={cn(
                  "w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 text-[8px] uppercase font-bold tracking-[0.1em] text-[var(--text-main)] placeholder:text-[var(--text-dim)] focus:border-[var(--border-active)] focus:outline-none transition-all shadow-inner",
                  isFinished && "opacity-50 grayscale"
                )}
              />
              <button
                type="button"
                onClick={() => setIsFinished(!isFinished)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all active:scale-95",
                  isFinished 
                    ? "bg-green-500/10 border-green-500/30 text-green-500" 
                    : "bg-[var(--bg-app)] border-[var(--border-subtle)] text-[var(--text-dim)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                  isFinished ? "bg-green-500 border-green-500" : "border-[var(--border-subtle)]"
                )}>
                  {isFinished && <Check size={10} className="text-white" strokeWidth={4} />}
                </div>
                <span className="text-[8px] font-bold uppercase tracking-[0.1em]">Dar por finalizado</span>
              </button>
            </div>
            <button
              type="submit"
              className={cn(
                "p-4 rounded-2xl transition-all shadow-lg shadow-black/10",
                isFinished 
                  ? "bg-green-500 text-white hover:scale-105 active:scale-95" 
                  : "bg-[var(--accent)] text-[var(--accent-foreground)] hover:scale-105 active:scale-95"
              )}
            >
              <Send size={20} strokeWidth={2.5} />
            </button>
          </div>
        </form>

        <div className="space-y-6 px-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="relative pl-6 border-l border-[var(--border-subtle)] py-1.5"
            >
              <div className="absolute left-[-4.5px] top-3 w-2 h-2 rounded-full bg-[var(--border-active)]" />
              <div className="flex items-center gap-1.5 text-[8px] uppercase font-bold tracking-[0.1em] text-[var(--text-dim)] mb-2">
                <Clock size={10} strokeWidth={2.5} />
                <span>{new Date(log.timestamp).toLocaleString('es-ES')}</span>
              </div>
              <p className="text-sm font-medium text-[var(--text-main)] leading-relaxed mb-3">{log.text}</p>
              {log.completedAction && (
                <div className="flex items-center gap-1.5 text-[8px] uppercase font-bold tracking-[0.1em] text-[var(--accent)] bg-[var(--accent)]/5 px-3 py-1.5 rounded-full w-fit border border-[var(--accent)]/10">
                  <CheckCircle2 size={10} strokeWidth={2.5} />
                  <span>Completado: {log.completedAction}</span>
                </div>
              )}
            </div >
          ))}
        </div>
      </section>
    </div>
  );
}
