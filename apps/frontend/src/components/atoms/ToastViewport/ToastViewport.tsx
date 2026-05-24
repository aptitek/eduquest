import { X } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { useToastStore } from '../../../features/toast/toastStore';
import { cn } from '../../../utils/cn';

export function ToastViewport() {
  const { t } = useTranslation();
  const { toasts, dismissToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast toast-top toast-center z-[9999] w-full max-w-md pointer-events-none">
      {toasts.map((toast) => {
        const translated = t(toast.messageKey);
        const message = translated === toast.messageKey ? toast.fallback || translated : translated;

        return (
          <div
            key={toast.id}
            className={cn(
              'alert pointer-events-auto shadow-lg border border-gaming-border',
              toast.type === 'error' && 'alert-error',
              toast.type === 'success' && 'alert-success',
              toast.type === 'info' && 'alert-info'
            )}
          >
            <span className="text-sm">{message}</span>
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
