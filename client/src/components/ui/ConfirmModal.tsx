import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen, onClose, onConfirm,
  title = 'Confirm Delete',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  itemName, confirmText = 'Delete', cancelText = 'Cancel', loading = false,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => cancelRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !loading) onClose();
    if (e.key === 'Enter' && !loading) onConfirm();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onKeyDown={handleKeyDown}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-surface-950/60 backdrop-blur-sm cursor-pointer"
            onClick={loading ? undefined : onClose}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-white dark:bg-surface-900 rounded-2xl shadow-modal w-full max-w-sm border border-surface-100 dark:border-surface-800"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-surface-800">
              <h2 className="text-base font-semibold text-surface-900 dark:text-white">{title}</h2>
              <button
                onClick={onClose}
                disabled={loading}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg text-surface-500 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-30"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} className="text-red-600" aria-hidden />
                </div>
                <div>
                  <p className="text-sm text-surface-700 dark:text-surface-300">{message}</p>
                  {itemName && (
                    <p className="text-sm font-semibold text-surface-900 dark:text-white mt-1.5 truncate max-w-[280px]">&ldquo;{itemName}&rdquo;</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-950/50 rounded-b-2xl">
              <button
                ref={cancelRef}
                onClick={onClose}
                disabled={loading}
                className="btn-secondary text-sm"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-accent-red text-white hover:bg-red-700 active:bg-red-800 transition-colors shadow-sm disabled:opacity-50"
              >
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}