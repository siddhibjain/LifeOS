import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => remove(id), 4200);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className="animate-slide-up flex items-start gap-3 rounded-xl bg-card border border-espresso/5 shadow-lift px-4 py-3"
          >
            <span className="mt-0.5 shrink-0">
              {t.type === 'success' && <CheckCircle2 size={18} className="text-sage" />}
              {t.type === 'error' && <AlertCircle size={18} className="text-rose" />}
              {t.type === 'info' && <Info size={18} className="text-champagne-dark" />}
            </span>
            <p className="text-sm text-espresso flex-1 leading-snug">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="text-taupe hover:text-espresso transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
