import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Moon, Sun, Settings, LogOut, Clock, Download,
  History as HistoryIcon, Target, CheckCircle2, User, X, Info
} from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { storage } from '../lib/storage';
import { cn } from '../lib/utils';
import { LogEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import SettingsPanel from './Settings';
import { usePwaInstall } from '../lib/pwaInstall';
import { formatMinutes } from '../lib/direction';
import { formatDeltaMinutes } from '../lib/timeStats';

export default function Profile() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { canInstall, promptInstall } = usePwaInstall();
  const projects = storage.getProjects();
  const user = storage.getUserProfile();
  const [logs, setLogs] = useState<(LogEntry & { projectId: string })[]>([]);
  const [timeStats, setTimeStats] = useState(storage.getProjectTimeSummary());
  const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');
  const [showSettings, setShowSettings] = useState(false);
  
  useEffect(() => {
    storage.syncProjectTimeStats();
    setLogs(storage.getAllLogs());
    setTimeStats(storage.getProjectTimeSummary());
  }, []);

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'Activo' || p.priority === 'NOW').length,
    finished: projects.filter(p => p.status === 'Terminado').length,
    idea: projects.filter(p => p.status === 'Idea').length
  };

  return (
    <div className="space-y-6 pb-24 relative">
      {/* Header */}
      <div className="flex items-center gap-4 px-2">
        <button onClick={() => navigate(-1)} className="p-2 text-[var(--text-dim)] hover:text-[var(--accent)] transition-all active:scale-90">
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
        <h2 className="text-xl font-bold tracking-tight text-[var(--text-main)]">Perfil de Usuario</h2>
      </div>

      {/* Tabs */}
      <div className="px-2">
        <div className="flex p-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl relative">
          {/* Animated Background Indicator */}
          <div 
            className={cn(
              "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[var(--accent)] rounded-xl transition-all duration-300 ease-out shadow-lg shadow-[var(--accent)]/20",
              activeTab === 'profile' ? "left-1" : "left-[calc(50%+1px)]"
            )}
          />
          
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex-1 py-3 text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl transition-all relative z-10 flex items-center justify-center gap-2",
              activeTab === 'profile' ? "text-[var(--accent-foreground)]" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
            )}
          >
            <User size={14} />
            Perfil
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex-1 py-3 text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl transition-all relative z-10 flex items-center justify-center gap-2",
              activeTab === 'history' ? "text-[var(--accent-foreground)]" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
            )}
          >
            <HistoryIcon size={14} />
            Historial
          </button>
        </div>
      </div>

      {activeTab === 'profile' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Profile Card */}
          <section className="card-clean p-8 text-center space-y-6 relative overflow-hidden mx-2">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent)] to-transparent opacity-50" />
            
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full bg-[var(--bg-app)] border-2 border-[var(--accent)] flex items-center justify-center text-[var(--accent)] shadow-xl mx-auto">
                <span className="text-3xl font-black">{user.avatarLetter}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 border-4 border-[var(--bg-card)] rounded-full" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">{user.name}</h3>
              <p className="label-caps !ml-0 opacity-60">Creador de Proyectos</p>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--border-subtle)]">
              <div className="space-y-1">
                <p className="text-xl font-black text-[var(--text-main)]">{stats.total}</p>
                <p className="text-[7px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Total</p>
              </div>
              <div className="space-y-1">
                <p className="text-xl font-black text-[var(--accent)]">{stats.active}</p>
                <p className="text-[7px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Activos</p>
              </div>
              <div className="space-y-1">
                <p className="text-xl font-black text-green-500">{stats.finished}</p>
                <p className="text-[7px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Hechos</p>
              </div>
            </div>
          </section>

          {/* Time Stats */}
          <section className="space-y-4 px-2">
            <div className="flex items-center justify-between px-2">
              <div className="space-y-1">
                <label className="label-caps !mb-0">Tiempo por tipo</label>
                <p className="text-[9px] text-[var(--text-dim)] uppercase font-bold tracking-wider">
                  Sólo proyectos cerrados con deadline definido
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-dim)]">
                <Clock size={18} />
              </div>
            </div>

            <div className="space-y-3">
              {timeStats.some((summary) => summary.projectCount > 0) ? (
                timeStats.map((summary) => {
                  if (summary.projectCount === 0) return null;

                  const averageEstimated = Math.round(summary.totalEstimatedMinutes / summary.projectCount);
                  const averageActual = Math.round(summary.totalActualMinutes / summary.projectCount);
                  const averageDelta = Math.round(summary.totalDeltaMinutes / summary.projectCount);
                  const deltaLabel =
                    averageDelta === 0
                      ? 'Clavado'
                      : averageDelta < 0
                        ? 'Más rápido'
                        : 'Se pasó';
                  const deltaTone =
                    averageDelta === 0
                      ? 'bg-[var(--bg-app)] text-[var(--text-main)] border-[var(--border-subtle)]'
                      : averageDelta < 0
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-500 border-red-500/20';

                  return (
                    <div key={summary.projectType} className="card-clean p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-[var(--text-main)] tracking-tight">{summary.projectType}</p>
                          <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                            {summary.projectCount} proyectos cerrados
                          </p>
                        </div>
                        <div className={cn("rounded-full border px-3 py-1 text-[8px] font-bold uppercase tracking-[0.12em]", deltaTone)}>
                          {deltaLabel}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <MetricPill label="Real" value={formatMinutes(averageActual)} />
                        <MetricPill label="Deadline" value={formatMinutes(averageEstimated)} />
                        <MetricPill label="Delta" value={formatDeltaMinutes(averageDelta)} />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-1.5 text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                          Rápidos: {summary.fasterCount}
                        </span>
                        <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-1.5 text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                          En tiempo: {summary.onTimeCount}
                        </span>
                        <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-1.5 text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                          Se pasaron: {summary.overCount}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="card-clean p-6 text-center space-y-2">
                  <Clock size={20} className="mx-auto text-[var(--text-dim)]" />
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-main)]">
                    Aún no hay estadísticas de tiempo
                  </p>
                  <p className="text-[10px] text-[var(--text-dim)] leading-relaxed">
                    Cuando cierres proyectos con deadline, aquí verás cuánto demoraste por tipo.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Settings List */}
          <section className="space-y-3 px-2">
            <label className="label-caps px-2">Preferencias</label>
            
            <div className="card-clean overflow-hidden">
              <button 
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-5 hover:bg-[var(--accent)]/5 transition-colors group border-b border-[var(--border-subtle)]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-app)] flex items-center justify-center text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors">
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-[var(--text-main)]">Modo {theme === 'light' ? 'Oscuro' : 'Claro'}</p>
                    <p className="text-[9px] text-[var(--text-dim)] uppercase font-bold tracking-wider">Cambiar apariencia visual</p>
                  </div>
                </div>
                <div className={cn(
                  "w-12 h-6 rounded-full p-1 transition-colors duration-300",
                  theme === 'dark' ? "bg-[var(--accent)]" : "bg-gray-300"
                )}>
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300",
                    theme === 'dark' ? "translate-x-6" : "translate-x-0"
                  )} />
                </div>
              </button>

              <button 
                onClick={() => setShowSettings(true)}
                className="w-full flex items-center justify-between p-5 hover:bg-[var(--accent)]/5 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-app)] flex items-center justify-center text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors">
                    <Settings size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-[var(--text-main)]">Configuración</p>
                    <p className="text-[9px] text-[var(--text-dim)] uppercase font-bold tracking-wider">Ajustes de la aplicación</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => void promptInstall()}
                disabled={!canInstall}
                className={cn(
                  "w-full flex items-center justify-between p-5 hover:bg-[var(--accent)]/5 transition-colors group border-t border-[var(--border-subtle)]",
                  !canInstall && "opacity-45 cursor-not-allowed hover:bg-transparent"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-app)] flex items-center justify-center text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors">
                    <Download size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-[var(--text-main)]">Instalar PWA</p>
                    <p className="text-[9px] text-[var(--text-dim)] uppercase font-bold tracking-wider">
                      {canInstall ? 'Agregar a pantalla de inicio' : 'Disponible cuando el navegador la permita'}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </section>

          {/* About Section */}
          <section className="space-y-3 px-2">
            <label className="label-caps px-2">Sobre la App</label>
            <div className="card-clean p-6 space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] shrink-0">
                  <Info size={18} />
                </div>
              </div>
              <div className="pt-4 border-t border-[var(--border-subtle)] flex justify-between items-center">
                <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Versión 1.0.0</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--accent)]">© 2026 Respiro y Conecto</span>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 px-2">
          {/* History Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="space-y-1">
                <label className="label-caps !mb-0">Historial de Actividad</label>
                <p className="text-[9px] text-[var(--text-dim)] uppercase font-bold tracking-wider">Tus últimos 20 movimientos</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-dim)]">
                <HistoryIcon size={18} />
              </div>
            </div>
            
            <div className="space-y-3">
              {logs.length > 0 ? (
                logs.slice(0, 20).map((log) => (
                  <div key={log.id} className="card-clean p-0 overflow-hidden group hover:border-[var(--accent)]/30 transition-all">
                    <div className="flex">
                      {/* Time indicator */}
                      <div className="w-16 bg-[var(--bg-app)] border-r border-[var(--border-subtle)] flex flex-col items-center justify-center py-4 space-y-1 group-hover:bg-[var(--accent)]/5 transition-colors">
                        <span className="text-[10px] font-black text-[var(--text-main)]">
                          {new Date(log.timestamp).toLocaleDateString('es-ES', { day: '2-digit' })}
                        </span>
                        <span className="text-[7px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                          {new Date(log.timestamp).toLocaleDateString('es-ES', { month: 'short' })}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                            <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                              {new Date(log.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs font-medium text-[var(--text-main)] leading-relaxed">
                          {log.text}
                        </p>

                        {(log.completedAction || log.newNextAction) && (
                          <div className="grid grid-cols-1 gap-2 pt-3 border-t border-[var(--border-subtle)]">
                            {log.completedAction && (
                              <div className="flex items-center gap-2 bg-green-500/5 border border-green-500/10 rounded-lg p-2">
                                <CheckCircle2 size={10} className="text-green-500" />
                                <span className="text-[8px] font-bold uppercase tracking-wider text-green-600/80 truncate">
                                  Hecho: {log.completedAction}
                                </span>
                              </div>
                            )}
                            {log.newNextAction && (
                              <div className="flex items-center gap-2 bg-[var(--accent)]/5 border border-[var(--accent)]/10 rounded-lg p-2">
                                <Target size={10} className="text-[var(--accent)]" />
                                <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--accent)]/80 truncate">
                                  Siguiente: {log.newNextAction}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 card-clean border-dashed opacity-50">
                  <HistoryIcon size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-[8px] font-bold uppercase tracking-widest">Sin actividad registrada</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <button className="w-full py-6 text-[10px] font-bold uppercase tracking-[0.3em] text-red-500/60 hover:text-red-500 transition-colors flex items-center justify-center gap-3">
        <LogOut size={14} />
        Cerrar Sesión
      </button>

      {/* Settings Sheet */}
      <AnimatePresence>
        {showSettings && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            
            {/* Sheet Content */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[90%] max-w-md bg-[var(--bg-app)] shadow-2xl z-[101] border-l border-[var(--border-subtle)]"
            >
              <SettingsPanel onClose={() => setShowSettings(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-3 text-center">
      <p className="text-[7px] font-bold uppercase tracking-widest text-[var(--text-dim)]">{label}</p>
      <p className="mt-1 text-sm font-black tracking-tight text-[var(--text-main)]">{value}</p>
    </div>
  );
}
