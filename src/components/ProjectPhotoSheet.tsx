import React from 'react';
import { Camera, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectPhoto } from '../types';
import ProjectPhotoCard from './ProjectPhotoCard';

interface ProjectPhotoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  reminderMode?: boolean;
  beforePhoto?: ProjectPhoto;
  afterPhoto?: ProjectPhoto;
  processPhotos?: ProjectPhoto[];
  beforeLoading?: boolean;
  afterLoading?: boolean;
  processLoading?: boolean;
  onCaptureBefore: () => void;
  onCaptureAfter: () => void;
  onCaptureProcess: () => void;
  onDeleteBefore: () => void;
  onDeleteAfter: () => void;
  onDeleteProcess: (photoId: string) => void;
}

export default function ProjectPhotoSheet({
  isOpen,
  onClose,
  projectName,
  reminderMode = false,
  beforePhoto,
  afterPhoto,
  processPhotos = [],
  beforeLoading = false,
  afterLoading = false,
  processLoading = false,
  onCaptureBefore,
  onCaptureAfter,
  onCaptureProcess,
  onDeleteBefore,
  onDeleteAfter,
  onDeleteProcess,
}: ProjectPhotoSheetProps) {
  const photoCount = (beforePhoto ? 1 : 0) + (afterPhoto ? 1 : 0) + processPhotos.length;

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="fixed top-0 right-0 bottom-0 z-[101] w-[92%] max-w-md border-l border-[var(--border-subtle)] bg-[var(--bg-app)] shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-card)] px-5 py-5 sticky top-0 z-10">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                  <Camera size={18} strokeWidth={2.5} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-dim)]">
                    Fotos del proyecto
                  </p>
                  <h3 className="max-w-[220px] truncate text-base font-bold tracking-tight text-[var(--text-main)]">
                    {projectName}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-[var(--text-dim)] transition-all hover:text-[var(--accent)] active:scale-90"
                aria-label="Cerrar fotos"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-10 space-y-4 no-scrollbar">
              {reminderMode && (
                <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-700">
                  Tienes foto de inicio. Toma la foto final para cerrar el proyecto y dejarla vinculada al inventario.
                </div>
              )}

              <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-lg shadow-black/5">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[var(--text-main)]">Antes y después</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                      Toma una foto inicial y otra al terminar
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.15em] text-[var(--text-dim)]">
                    <Camera size={10} strokeWidth={2.5} />
                    {photoCount}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {reminderMode ? (
                  <>
                    <ProjectPhotoCard
                      stage="after"
                      title="Después"
                      subtitle="Captura el resultado final"
                      photo={afterPhoto}
                      loading={afterLoading}
                      onCapture={onCaptureAfter}
                      onDelete={onDeleteAfter}
                    />
                    <ProjectPhotoCard
                      stage="before"
                      title="Antes"
                      subtitle="Captura el estado inicial"
                      photo={beforePhoto}
                      loading={beforeLoading}
                      onCapture={onCaptureBefore}
                      onDelete={onDeleteBefore}
                    />
                  </>
                ) : (
                  <>
                    <ProjectPhotoCard
                      stage="before"
                      title="Antes"
                      subtitle="Captura el estado inicial"
                      photo={beforePhoto}
                      loading={beforeLoading}
                      onCapture={onCaptureBefore}
                      onDelete={onDeleteBefore}
                    />
                    <ProjectPhotoCard
                      stage="after"
                      title="Después"
                      subtitle="Captura el resultado final"
                      photo={afterPhoto}
                      loading={afterLoading}
                      onCapture={onCaptureAfter}
                      onDelete={onDeleteAfter}
                    />
                  </>
                )}
              </div>

              <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-lg shadow-black/5">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[var(--text-main)]">Fotos de proceso</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                      Agrega todas las capturas intermedias que necesites
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onCaptureProcess}
                    disabled={processLoading}
                    className="rounded-xl bg-[var(--accent)] px-4 py-3 text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--accent-foreground)] transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {processPhotos.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {processPhotos.map((photo, index) => (
                    <div key={photo.id || `${photo.capturedAt}-${index}`}>
                      <ProjectPhotoCard
                        stage="process"
                        title={`Proceso ${processPhotos.length - index}`}
                        subtitle={new Date(photo.capturedAt).toLocaleString('es-ES')}
                        photo={photo}
                        loading={processLoading}
                        onCapture={onCaptureProcess}
                        onDelete={() => photo.id && onDeleteProcess(photo.id)}
                        captureLabel="Agregar otra"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                    Aún no hay fotos de proceso
                  </p>
                </div>
              )}

              <div className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-[10px] font-medium leading-relaxed text-[var(--text-dim)]">
                Las fotos quedan guardadas en este dispositivo y también viajan en el export/import de datos.
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
