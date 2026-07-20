import { useMemo, useState } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, ListChecks } from 'lucide-react';
import { storage } from '../lib/storage';
import { CalendarEvent } from '../types';
import { cn } from '../lib/utils';

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const eventDayKey = (event: CalendarEvent) => dayKey(new Date(event.date));

const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const typeLabel: Record<CalendarEvent['type'], string> = {
  task: 'Tarea',
  unblock_task: 'Desbloqueo',
  postponed_review: 'Aplazado',
  blocked_review: 'Bloqueo',
};

const typeStyle: Record<CalendarEvent['type'], string> = {
  task: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  unblock_task: 'bg-red-500/10 text-red-600 border-red-500/20',
  postponed_review: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  blocked_review: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
};

export default function Calendar() {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => startOfLocalDay(new Date()));
  const [selectedKey, setSelectedKey] = useState(() => dayKey(new Date()));
  const events = storage.getCalendarEvents();
  const today = startOfLocalDay(new Date());
  const todayKey = dayKey(today);

  const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const leading = (first.getDay() + 6) % 7;
    return [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length: last.getDate() }, (_, index) => new Date(cursor.getFullYear(), cursor.getMonth(), index + 1)),
    ];
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    return events.reduce((acc, event) => {
      const key = eventDayKey(event);
      acc.set(key, [...(acc.get(key) || []), event]);
      return acc;
    }, new Map<string, CalendarEvent[]>());
  }, [events]);

  const overdue = events.filter((event) => event.status === 'overdue');
  const todayEvents = eventsByDay.get(todayKey) || [];
  const nextSeven = events.filter((event) => {
    const date = startOfLocalDay(new Date(event.date));
    const diff = date.getTime() - today.getTime();
    return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000 && event.status !== 'done';
  });
  const selectedEvents = eventsByDay.get(selectedKey) || [];

  const openEvent = (event: CalendarEvent) => {
    if (event.projectId) navigate(`/project/${event.projectId}`);
  };

  const moveMonth = (delta: number) => {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-main)]">Calendario</h2>
          <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[var(--text-dim)]">
            Tareas, bloqueos y aplazamientos
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--accent)]">
          <CalendarDays size={18} strokeWidth={2.5} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <Metric label="Vencidos" value={overdue.length} tone="danger" />
        <Metric label="Hoy" value={todayEvents.length} />
        <Metric label="7 días" value={nextSeven.length} />
      </div>

      {overdue.length > 0 && (
        <EventSection title="Vencidos" events={overdue} icon={<AlertTriangle size={15} />} onOpen={openEvent} />
      )}

      <EventSection title="Hoy" events={todayEvents} icon={<Clock3 size={15} />} onOpen={openEvent} empty="Sin eventos para hoy" />
      <EventSection title="Próximos 7 días" events={nextSeven} icon={<ListChecks size={15} />} onOpen={openEvent} empty="Sin próximos eventos" />

      <section className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => moveMonth(-1)} className="rounded-lg p-2 text-[var(--text-dim)] hover:text-[var(--accent)]" aria-label="Mes anterior">
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--text-main)]">
            {cursor.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </h3>
          <button type="button" onClick={() => moveMonth(1)} className="rounded-lg p-2 text-[var(--text-dim)] hover:text-[var(--accent)]" aria-label="Mes siguiente">
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, index) => (
            <span key={`${label}-${index}`} className="py-1 text-[7px] font-black uppercase tracking-widest text-[var(--text-dim)]">
              {label}
            </span>
          ))}
          {monthDays.map((date, index) => {
            if (!date) return <div key={`empty-${index}`} />;
            const key = dayKey(date);
            const dayEvents = eventsByDay.get(key) || [];
            const isSelected = selectedKey === key;
            const isToday = todayKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedKey(key)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-lg border text-xs font-bold transition-all",
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]",
                  isToday && !isSelected && "border-[var(--accent)]/40",
                )}
              >
                <span>{date.getDate()}</span>
                {dayEvents.length > 0 && (
                  <span className={cn("mt-1 h-1.5 w-1.5 rounded-full", isSelected ? "bg-[var(--accent-foreground)]" : "bg-[var(--accent)]")} />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <EventSection title="Día seleccionado" events={selectedEvents} icon={<CalendarDays size={15} />} onOpen={openEvent} empty="Sin eventos en este día" />
    </div>
  );
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'danger' }) {
  return (
    <div className={cn("rounded-xl border px-3 py-2.5 text-center", tone === 'danger' ? "border-red-500/20 bg-red-500/10" : "border-[var(--border-subtle)] bg-[var(--bg-card)]")}>
      <p className={cn("text-base font-black leading-none", tone === 'danger' ? "text-red-600" : "text-[var(--text-main)]")}>{value}</p>
      <p className="mt-1 text-[6px] font-bold uppercase tracking-widest text-[var(--text-dim)]">{label}</p>
    </div>
  );
}

function EventSection({ title, events, icon, onOpen, empty = 'Sin eventos' }: { title: string; events: CalendarEvent[]; icon: React.ReactNode; onOpen: (event: CalendarEvent) => void; empty?: string }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <label className="label-caps !mb-0 flex items-center gap-2">
          {icon}
          {title}
        </label>
        <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--text-dim)]">{events.length}</span>
      </div>
      {events.length > 0 ? (
        <div className="space-y-2">
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => onOpen(event)}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 text-left shadow-sm transition-all hover:border-[var(--border-active)] active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--text-main)]">{event.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-[var(--text-dim)]">{event.description}</p>
                </div>
                {event.status === 'done' ? (
                  <CheckCircle2 className="shrink-0 text-emerald-600" size={16} strokeWidth={2.5} />
                ) : (
                  <ChevronRight className="shrink-0 text-[var(--text-dim)]" size={16} strokeWidth={2.5} />
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className={cn("rounded-full border px-2 py-0.5 text-[6px] font-bold uppercase tracking-widest", typeStyle[event.type])}>
                  {typeLabel[event.type]}
                </span>
                <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-app)] px-2 py-0.5 text-[6px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                  {new Date(event.date).toLocaleDateString('es-ES')}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-center">
          <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--text-dim)]">{empty}</p>
        </div>
      )}
    </section>
  );
}
