import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-14 px-6', className)}>
      {icon && (
        <div className="mb-4 w-16 h-16 rounded-full bg-ivory-2 flex items-center justify-center text-champagne">
          {icon}
        </div>
      )}
      <h3 className="text-xl text-espresso mb-1.5">{title}</h3>
      {description && <p className="text-sm text-taupe max-w-sm leading-relaxed mb-5">{description}</p>}
      {action}
    </div>
  );
}
