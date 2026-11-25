import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('chip', className)}>{children}</span>;
}
