import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 18 }}
            transition={{ type: 'spring', damping: 24, stiffness: 220 }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[28px] shadow-2xl p-6 space-y-5"
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                destructive ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-[var(--accent)]/10 border-[var(--border-subtle)] text-[var(--accent)]"
              )}>
                {destructive ? <AlertTriangle size={22} strokeWidth={2.5} /> : <Check size={22} strokeWidth={2.5} />}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold tracking-tight text-[var(--text-main)]">{title}</h3>
                <p className="text-sm text-[var(--text-dim)] leading-relaxed">{description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onCancel}
                className="py-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)] text-[10px] font-bold uppercase tracking-[0.18em] hover:border-[var(--border-active)] transition-all active:scale-[0.98]"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={cn(
                  "py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.18em] transition-all active:scale-[0.98]",
                  destructive
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
