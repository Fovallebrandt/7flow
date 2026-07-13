import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Home, Package, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { storage } from '../lib/storage';
import { PwaInstallProvider } from '../lib/pwaInstall';

const TasksSheet = lazy(() => import('./Tasks').then((module) => ({ default: module.TasksSheet })));

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showNav?: boolean;
}

export default function Layout({ children, title, showNav = true }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isTasksOpen, setIsTasksOpen] = useState(false);

  useEffect(() => {
    storage.syncProjectTimeStats();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const today = new Date();
  const formattedDate = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).replace(/^\w/, (c) => c.toUpperCase());

  const projects = storage.getProjects();
  const todayProjects = projects.filter(p => {
    const pDate = new Date(p.createdAt);
    return pDate.toDateString() === today.toDateString();
  }).length;

  return (
    <PwaInstallProvider>
      <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] font-sans selection:bg-[var(--accent)] selection:text-[var(--accent-foreground)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--bg-app)]/80 backdrop-blur-md border-b border-[var(--border-subtle)] px-5 py-4 flex items-center justify-between pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="space-y-1">
          <h1 className="text-lg font-bold tracking-tight text-[var(--text-main)] leading-none">
            {formattedDate}
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--text-dim)]">Hola, Fernando</span>
            <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-full px-2 py-0.5 flex items-center gap-1">
              <span className="text-[8px] font-bold text-[var(--accent)] uppercase tracking-wider">
                {todayProjects} PROYECTOS HOY
              </span>
            </div>
          </div>
        </div>

          <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/profile')}
            className="relative w-10 h-10 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--border-active)] active:scale-90 shadow-sm transition-all"
            aria-label="View profile"
          >
            <User size={18} strokeWidth={2} />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-[var(--bg-app)] rounded-full" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-36 max-w-xl mx-auto px-4 pt-4 relative">
        {children}
      </main>

      {/* Bottom Background Block (Stylistic Anchor) */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-[var(--bg-card)] rounded-t-[24px] border-t border-[var(--border-subtle)] z-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]" />

      {isTasksOpen && (
        <Suspense fallback={null}>
          <TasksSheet open={isTasksOpen} onClose={() => setIsTasksOpen(false)} />
        </Suspense>
      )}

      {/* Bottom Navigation */}
      {showNav && (
        <nav className="fixed bottom-[calc(2rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 bg-[var(--nav-bg)]/90 backdrop-blur-2xl border border border-[var(--border-subtle)] px-7 py-3 flex gap-9 items-center rounded-[32px] shadow-2xl shadow-black/10 z-50">
          <button
            onClick={() => navigate('/')}
            className={cn(
              "flex flex-col items-center gap-1.5",
              isActive('/') ? "text-[var(--accent)]" : "text-[var(--text-dim)] hover:text-[var(--accent)]"
            )}
          >
            <Home size={20} strokeWidth={isActive('/') ? 3 : 2} />
            <span className="text-[9px] font-bold uppercase tracking-[0.1em]">Inicio</span>
          </button>

          <button
            onClick={() => navigate('/create')}
            className="bg-[var(--accent)] w-14 h-14 rounded-full text-[var(--accent-foreground)] shadow-xl shadow-[var(--accent)]/20 hover:opacity-90 flex items-center justify-center -mt-2 border-4 border-[var(--bg-app)]"
          >
            <Plus size={28} strokeWidth={3} />
          </button>

          <button
            onClick={() => navigate('/inventory')}
            className={cn(
              "flex flex-col items-center gap-1.5",
              isActive('/inventory') ? "text-[var(--accent)]" : "text-[var(--text-dim)] hover:text-[var(--accent)]"
            )}
          >
            <Package size={20} strokeWidth={isActive('/inventory') ? 3 : 2} />
            <span className="text-[9px] font-bold uppercase tracking-[0.1em]">Inventario</span>
          </button>
        </nav>
      )}
      </div>
    </PwaInstallProvider>
  );
}
