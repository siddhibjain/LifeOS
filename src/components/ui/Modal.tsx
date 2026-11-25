import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-espresso/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={cn(
        'relative bg-card w-full rounded-t-2xl sm:rounded-xl2 shadow-lift border border-espresso/5 max-h-[92vh] flex flex-col animate-slide-up',
        sizes[size],
      )}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-espresso/5 shrink-0">
            <h3 className="text-xl text-espresso">{title}</h3>
            <button onClick={onClose} className="text-taupe hover:text-espresso transition-colors p-1" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto scroll-thin px-6 py-5 flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-espresso/5 flex gap-3 justify-end shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
