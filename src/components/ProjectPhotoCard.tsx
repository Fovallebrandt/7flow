import React from 'react';
import { Camera, Image as ImageIcon, RefreshCcw, Trash2 } from 'lucide-react';
import { ProjectPhoto, ProjectPhotoStage } from '../types';
import { cn } from '../lib/utils';
import LoadingSpinner from './LoadingSpinner';

interface ProjectPhotoCardProps {
  stage: ProjectPhotoStage | 'process';
  title: string;
  subtitle: string;
  photo?: ProjectPhoto;
  loading?: boolean;
  onCapture: () => void;
  onDelete: () => void;
  captureLabel?: string;
}

const STAGE_STYLES: Record<ProjectPhotoStage | 'process', {
  badge: string;
  accent: string;
  iconBg: string;
}> = {
  before: {
    badge: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    accent: 'from-amber-500/20 via-amber-400/10 to-transparent',
    iconBg: 'bg-amber-500/10 text-amber-700',
  },
  after: {
    badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    accent: 'from-emerald-500/20 via-emerald-400/10 to-transparent',
    iconBg: 'bg-emerald-500/10 text-emerald-700',
  },
  process: {
    badge: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
    accent: 'from-sky-500/20 via-sky-400/10 to-transparent',
    iconBg: 'bg-sky-500/10 text-sky-700',
  },
};

export default function ProjectPhotoCard({
  stage,
  title,
  subtitle,
  photo,
  loading = false,
  onCapture,
  onDelete,
  captureLabel,
}: ProjectPhotoCardProps) {
  const styles = STAGE_STYLES[stage];
  const hasPhoto = Boolean(photo);

  return (
    <article className="card-clean overflow-hidden shadow-lg shadow-black/5">
      <div className="relative aspect-[4/3] bg-[var(--bg-app)] border-b border-[var(--border-subtle)]">
        {hasPhoto ? (
          <img
            src={photo?.dataUrl}
            alt={`${title} del proyecto`}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center border border-[var(--border-subtle)]", styles.iconBg)}>
              <ImageIcon size={28} strokeWidth={2.25} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[var(--text-main)]">{title}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                {subtitle}
              </p>
            </div>
          </div>
        )}

        <div className={cn(
          "absolute left-3 top-3 rounded-full border px-3 py-1 text-[8px] font-bold uppercase tracking-[0.15em] backdrop-blur-sm",
          styles.badge,
        )}>
          {title}
        </div>

        {hasPhoto && (
          <div className="absolute right-3 bottom-3 rounded-full bg-black/65 text-white px-3 py-1 text-[8px] font-bold uppercase tracking-[0.15em] backdrop-blur-sm">
            {photo ? new Date(photo.capturedAt).toLocaleDateString('es-ES') : ''}
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px]">
            <div className="rounded-full bg-[var(--bg-card)]/90 px-4 py-3 shadow-xl">
              <LoadingSpinner size="sm" />
            </div>
          </div>
        )}

        <div className={cn("absolute inset-x-0 top-0 h-24 bg-gradient-to-b pointer-events-none", styles.accent)} />
      </div>

      <div className="space-y-4 p-4">
        <div className="space-y-1">
          <p className="text-sm font-bold tracking-tight text-[var(--text-main)]">{title}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)] leading-relaxed">
            {subtitle}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCapture}
            disabled={loading}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-[8px] font-bold uppercase tracking-[0.18em] transition-all active:scale-[0.98]",
              hasPhoto
                ? "border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)] hover:border-[var(--border-active)]"
                : "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90",
              loading && "opacity-50 cursor-not-allowed",
            )}
          >
            {loading ? (
              <LoadingSpinner size="sm" light={hasPhoto} />
            ) : hasPhoto ? (
              <RefreshCcw size={14} strokeWidth={2.5} />
            ) : (
              <Camera size={14} strokeWidth={2.5} />
            )}
            {captureLabel || (hasPhoto ? 'Retomar' : 'Tomar foto')}
          </button>

          {hasPhoto && (
            <button
              type="button"
              onClick={onDelete}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-3 text-[8px] font-bold uppercase tracking-[0.18em] text-red-500/70 transition-all hover:border-red-500/30 hover:text-red-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
