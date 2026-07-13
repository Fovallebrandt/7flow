import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, ChevronRight, Circle, Clock3, Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { storage } from '../lib/storage';
import { Project, Task, TaskPriority, TaskStatus } from '../types';
import { cn } from '../lib/utils';
import ConfirmDialog from './ConfirmDialog';

const TASK_PRIORITIES: TaskPriority[] = ['Hoy', 'Pronto', 'Algún día'];
const TASK_STATUSES: TaskStatus[] = ['Pendiente', 'En progreso', 'Hecha', 'Cancelada'];

const PRIORITY_META: Record<TaskPriority, { title: string; subtitle: string }> = {
  Hoy: { title: 'Hoy', subtitle: 'Lo que merece atención inmediata' },
  Pronto: { title: 'Pronto', subtitle: 'Acciones próximas, sin urgencia' },
  'Algún día': { title: 'Algún día', subtitle: 'Ideas y pendientes sin fecha' },
};

interface TasksProps {
  onClose?: () => void;
  embedded?: boolean;
  startCreate?: boolean;
}

export default function Tasks({ onClose, embedded = false, startCreate = false }: TasksProps) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>(storage.getTasks());
  const [projects] = useState<Project[]>(storage.getProjects());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Task | null>(null);

  const activeTasks = tasks.filter((task) => task.status !== 'Hecha' && task.status !== 'Cancelada');
  const completedTasks = tasks.filter((task) => task.status === 'Hecha');

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  const refreshTasks = () => setTasks(storage.getTasks());

  const handleToggleDone = (task: Task) => {
    storage.updateTask(task.id, {
      status: task.status === 'Hecha' ? 'Pendiente' : 'Hecha',
    });
    refreshTasks();
  };

  const handleDelete = () => {
    if (!deleteCandidate) return;
    storage.deleteTask(deleteCandidate.id);
    setDeleteCandidate(null);
    refreshTasks();
    toast.success('Tarea eliminada');
  };

  const openCreate = () => {
    setEditingTask(null);
    setIsTaskSheetOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setIsTaskSheetOpen(true);
  };

  useEffect(() => {
    if (startCreate) openCreate();
  }, [startCreate]);

  return (
    <div className={cn("space-y-4", embedded ? "pb-8" : "pb-40")}>
      <div className="flex items-center justify-between px-1">
        <div className="space-y-0.5">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-main)]">Tareas</h2>
          <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[var(--text-dim)]">
            Sueltas o con proyecto
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] shadow-md shadow-black/10 transition-all hover:opacity-90 active:scale-95"
          aria-label="Crear tarea"
        >
          <Plus size={18} strokeWidth={3} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5 px-1">
        <Metric label="Activas" value={activeTasks.length} />
        <Metric label="Hoy" value={activeTasks.filter((task) => task.priority === 'Hoy').length} />
        <Metric label="Hechas" value={completedTasks.length} />
      </div>

      {TASK_PRIORITIES.map((priority) => {
        const priorityTasks = activeTasks.filter((task) => task.priority === priority);
        const meta = PRIORITY_META[priority];

        return (
          <section key={priority} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="min-w-0">
                <label className="label-caps !mb-0">{meta.title}</label>
              </div>
              <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--text-dim)]">
                {priorityTasks.length}
              </span>
            </div>

            {priorityTasks.length > 0 ? (
              <div className="space-y-2">
                {priorityTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    project={task.projectId ? projectById.get(task.projectId) : undefined}
                    onToggleDone={() => handleToggleDone(task)}
                    onEdit={() => openEdit(task)}
                    onDelete={() => setDeleteCandidate(task)}
                    onOpenProject={(projectId) => {
                      onClose?.();
                      navigate(`/project/${projectId}`);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-center">
                <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--text-dim)]">Sin tareas</p>
              </div>
            )}
          </section>
        );
      })}

      {completedTasks.length > 0 && (
        <section className="space-y-2 opacity-70">
          <div className="flex items-center justify-between px-1">
            <label className="label-caps !mb-0">Hechas</label>
            <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--text-dim)]">
              {completedTasks.length}
            </span>
          </div>
          <div className="space-y-2">
            {completedTasks.slice(0, 10).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                project={task.projectId ? projectById.get(task.projectId) : undefined}
                onToggleDone={() => handleToggleDone(task)}
                onEdit={() => openEdit(task)}
                onDelete={() => setDeleteCandidate(task)}
                onOpenProject={(projectId) => {
                  onClose?.();
                  navigate(`/project/${projectId}`);
                }}
              />
            ))}
          </div>
        </section>
      )}

      <TaskEditorSheet
        open={isTaskSheetOpen}
        task={editingTask}
        projects={projects}
        onClose={() => setIsTaskSheetOpen(false)}
        onSave={() => {
          refreshTasks();
          setIsTaskSheetOpen(false);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteCandidate)}
        title="Eliminar tarea"
        description={deleteCandidate ? `¿Seguro que quieres eliminar "${deleteCandidate.title}"?` : ''}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export function TasksSheet({ open, onClose, startCreate = false }: { open: boolean; onClose: () => void; startCreate?: boolean }) {
  return (
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
            className="fixed top-0 right-0 bottom-0 z-[101] flex w-[94%] max-w-md flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-app)] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3">
              <div className="space-y-0.5">
                <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--text-dim)]">Panel rápido</p>
                <h3 className="text-sm font-bold tracking-tight text-[var(--text-main)]">Tareas</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-[var(--text-dim)] transition-all hover:text-[var(--accent)] active:scale-90"
                aria-label="Cerrar tareas"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
              <Tasks onClose={onClose} embedded startCreate={startCreate} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2.5 text-center">
      <p className="text-base font-black leading-none text-[var(--text-main)]">{value}</p>
      <p className="mt-1 text-[6px] font-bold uppercase tracking-widest text-[var(--text-dim)]">{label}</p>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  project?: Project;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenProject: (projectId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, project, onToggleDone, onEdit, onDelete, onOpenProject }) => {
  const isDone = task.status === 'Hecha';

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleDone}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95",
            isDone
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-dim)] hover:text-[var(--accent)]",
          )}
          aria-label={isDone ? 'Marcar pendiente' : 'Marcar hecha'}
        >
          {isDone ? <CheckCircle2 size={17} strokeWidth={2.5} /> : <Circle size={16} strokeWidth={2.5} />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className={cn("truncate text-sm font-bold leading-tight text-[var(--text-main)]", isDone && "line-through opacity-60")}>
                {task.title}
              </p>
              {task.notes && (
                <p className="mt-0.5 line-clamp-1 text-[11px] font-medium leading-relaxed text-[var(--text-dim)]">{task.notes}</p>
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              <button type="button" onClick={onEdit} className="rounded-lg p-1.5 text-[var(--text-dim)] hover:text-[var(--accent)]" aria-label="Editar tarea">
                <Edit2 size={14} strokeWidth={2.5} />
              </button>
              <button type="button" onClick={onDelete} className="rounded-lg p-1.5 text-red-500/60 hover:text-red-500" aria-label="Eliminar tarea">
                <Trash2 size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-app)] px-2 py-0.5 text-[6px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
              {task.priority}
            </span>
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-app)] px-2 py-0.5 text-[6px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
              {task.status}
            </span>
            {task.dueAt && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-app)] px-2 py-0.5 text-[6px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                <Clock3 size={10} />
                {new Date(task.dueAt).toLocaleDateString('es-ES')}
              </span>
            )}
            {project && (
              <button
                type="button"
                onClick={() => onOpenProject(project.id)}
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-2 py-0.5 text-[6px] font-bold uppercase tracking-widest text-[var(--accent)]"
              >
                <span className="truncate">{project.name}</span>
                <ChevronRight size={10} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TaskEditorSheetProps {
  open: boolean;
  task: Task | null;
  projects: Project[];
  projectId?: string;
  onClose: () => void;
  onSave: () => void;
}

export function TaskEditorSheet({ open, task, projects, projectId, onClose, onSave }: TaskEditorSheetProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Hoy');
  const [status, setStatus] = useState<TaskStatus>('Pendiente');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [dueAt, setDueAt] = useState('');

  React.useEffect(() => {
    if (!open) return;
    setTitle(task?.title || '');
    setNotes(task?.notes || '');
    setPriority(task?.priority || 'Hoy');
    setStatus(task?.status || 'Pendiente');
    setSelectedProjectId(task?.projectId || projectId || '');
    setDueAt(task?.dueAt ? task.dueAt.slice(0, 10) : '');
  }, [open, task, projectId]);

  const handleSave = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast.error('La tarea necesita un título');
      return;
    }

    const payload = {
      title: cleanTitle,
      notes: notes.trim(),
      priority,
      status,
      projectId: selectedProjectId || undefined,
      dueAt: dueAt ? new Date(`${dueAt}T12:00:00`).toISOString() : undefined,
    };

    if (task) {
      storage.updateTask(task.id, payload);
      toast.success('Tarea actualizada');
    } else {
      storage.addTask(payload);
      toast.success('Tarea creada');
    }

    onSave();
  };

  return (
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
            className="fixed top-0 right-0 bottom-0 z-[101] flex w-[94%] max-w-md flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-app)] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-card)] px-5 py-5">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-dim)]">Tarea</p>
                <h3 className="text-base font-bold tracking-tight text-[var(--text-main)]">
                  {task ? 'Editar tarea' : 'Nueva tarea'}
                </h3>
              </div>
              <button type="button" onClick={onClose} className="rounded-full p-2 text-[var(--text-dim)] hover:text-[var(--accent)]" aria-label="Cerrar tarea">
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-4 pb-10 no-scrollbar">
              <div className="space-y-2">
                <label className="label-caps">Título</label>
                <input
                  autoFocus
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="¿Qué hay que hacer?"
                  className="input-clean text-base font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="label-caps">Notas</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Contexto, criterio o detalle..."
                  className="input-clean h-24 resize-none text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="label-caps">Prioridad</label>
                <div className="grid grid-cols-3 gap-2">
                  {TASK_PRIORITIES.map((item) => (
                    <OptionButton key={item} active={priority === item} onClick={() => setPriority(item)}>
                      {item}
                    </OptionButton>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="label-caps">Estado</label>
                <div className="grid grid-cols-2 gap-2">
                  {TASK_STATUSES.map((item) => (
                    <OptionButton key={item} active={status === item} onClick={() => setStatus(item)}>
                      {item}
                    </OptionButton>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="label-caps">Proyecto opcional</label>
                <select
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  className="input-clean text-sm font-medium"
                >
                  <option value="">Sin proyecto</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="label-caps">Fecha opcional</label>
                <input
                  type="date"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                  className="input-clean text-sm font-medium"
                />
              </div>
            </div>

            <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
              <button
                type="button"
                onClick={handleSave}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-4 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--accent-foreground)] shadow-lg shadow-black/10 transition-all hover:opacity-90 active:scale-95"
              >
                <Save size={16} strokeWidth={2.5} />
                Guardar tarea
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

const OptionButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-xl border px-3 py-2 text-[8px] font-bold uppercase tracking-[0.12em] transition-all active:scale-95",
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
          : "border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-dim)] hover:border-[var(--border-active)]",
      )}
    >
      {children}
    </button>
  );
};
