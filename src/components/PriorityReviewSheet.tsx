import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp, ChevronRight, ListChecks, MoreHorizontal, Target, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { storage } from '../lib/storage';
import { Priority, Project } from '../types';
import { cn } from '../lib/utils';

const PRIORITIES: Priority[] = ['NOW', 'Next1', 'Next2', 'Next3'];

const PRIORITY_LABELS: Record<Priority, string> = {
  NOW: 'NOW',
  Next1: 'Next1',
  Next2: 'Next2',
  Next3: 'Next3',
};

interface PriorityReviewSheetProps {
  open: boolean;
  projects: Project[];
  onClose: () => void;
  onProjectsChange: (projects: Project[]) => void;
}

export default function PriorityReviewSheet({ open, projects, onClose, onProjectsChange }: PriorityReviewSheetProps) {
  const navigate = useNavigate();
  const activeProjects = projects.filter((project) => project.status !== 'Terminado');

  const refreshProjects = () => {
    onProjectsChange(storage.getProjects());
  };

  const moveProject = (project: Project, priority: Priority) => {
    if (project.priority === priority) return;

    if (priority === 'NOW') {
      storage.getProjects().forEach((currentProject) => {
        if (currentProject.id !== project.id && currentProject.priority === 'NOW' && currentProject.status !== 'Terminado') {
          storage.updateProject(currentProject.id, { priority: 'Next1' });
        }
      });
    }

    storage.updateProject(project.id, {
      priority,
      status: priority === 'NOW' ? 'Activo' : project.status,
    });
    refreshProjects();
    toast.success(`Movido a ${PRIORITY_LABELS[priority]}`);
  };

  const moveByStep = (project: Project, direction: -1 | 1) => {
    const index = PRIORITIES.indexOf(project.priority);
    const nextPriority = PRIORITIES[index + direction];
    if (!nextPriority) return;
    moveProject(project, nextPriority);
  };

  const openProject = (projectId: string) => {
    onClose();
    navigate(`/project/${projectId}`);
  };

  const groupedProjects = PRIORITIES.map((priority) => ({
    priority,
    projects: activeProjects.filter((project) => project.priority === priority),
  }));

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
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                  <ListChecks size={16} strokeWidth={2.5} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--text-dim)]">
                    Revisión rápida
                  </p>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-main)]">
                    Prioridades
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-[var(--text-dim)] transition-all hover:text-[var(--accent)] active:scale-90"
                aria-label="Cerrar revisión de prioridades"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-3 pb-8 no-scrollbar">
              {groupedProjects.map(({ priority, projects: priorityProjects }) => (
                <section key={priority} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-6 min-w-11 items-center justify-center rounded-full border px-2.5 text-[7px] font-black uppercase tracking-[0.12em]",
                          priority === 'NOW'
                            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                            : "border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-main)]",
                        )}
                      >
                        {PRIORITY_LABELS[priority]}
                      </span>
                      {priority === 'NOW' && <Target size={13} className="text-[var(--accent)]" strokeWidth={2.5} />}
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--text-dim)]">
                      {priorityProjects.length}
                    </span>
                  </div>

                  {priorityProjects.length > 0 ? (
                    <div className="space-y-2">
                      {priorityProjects.map((project) => (
                        <PriorityProjectCard
                          key={project.id}
                          project={project}
                          onMoveUp={() => moveByStep(project, -1)}
                          onMoveDown={() => moveByStep(project, 1)}
                          onMoveNow={() => moveProject(project, 'NOW')}
                          onOpen={() => openProject(project.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-center">
                      <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--text-dim)]">Sin proyectos</p>
                    </div>
                  )}
                </section>
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

interface PriorityProjectCardProps {
  project: Project;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveNow: () => void;
  onOpen: () => void;
}

const PriorityProjectCard: React.FC<PriorityProjectCardProps> = ({ project, onMoveUp, onMoveDown, onMoveNow, onOpen }) => {
  const isNow = project.priority === 'NOW';
  const canMoveUp = project.priority !== 'NOW';
  const canMoveDown = project.priority !== 'Next3';
  const stagnationDays = storage.getProjectStagnationDays(project.id);

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-bold text-[var(--text-main)]">{project.name}</h4>
            {stagnationDays >= 3 && (
              <span className="shrink-0 rounded-full bg-orange-500/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-orange-500">
                {stagnationDays}d
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-1 text-[11px] font-medium leading-relaxed text-[var(--text-dim)]">
            {project.nextAction || 'Sin siguiente acción definida'}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-app)] px-2 py-0.5 text-[6px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
              {project.type}
            </span>
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-app)] px-2 py-0.5 text-[6px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
              {project.status}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onOpen}
          className="rounded-full p-2 text-[var(--text-dim)] transition-colors hover:text-[var(--accent)]"
          aria-label={`Abrir ${project.name}`}
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <ActionButton label="Subir" disabled={!canMoveUp} onClick={onMoveUp}>
          <ArrowUp size={14} strokeWidth={2.5} />
        </ActionButton>
        <ActionButton label="Bajar" disabled={!canMoveDown} onClick={onMoveDown}>
          <ArrowDown size={14} strokeWidth={2.5} />
        </ActionButton>
        <ActionButton label="NOW" active={isNow} disabled={isNow} onClick={onMoveNow}>
          <Target size={14} strokeWidth={2.5} />
        </ActionButton>
        <ActionButton label="Mas" onClick={onOpen}>
          <MoreHorizontal size={14} strokeWidth={2.5} />
        </ActionButton>
      </div>
    </div>
  );
};

interface ActionButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ActionButton({ label, active = false, disabled = false, onClick, children }: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-12 items-center justify-center rounded-xl border transition-all active:scale-95",
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
          : "border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-dim)] hover:border-[var(--border-active)] hover:text-[var(--accent)]",
        disabled && "cursor-not-allowed opacity-35 active:scale-100",
      )}
      aria-label={label}
    >
      {children}
    </button>
  );
}
