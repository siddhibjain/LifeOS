import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return <Loader2 size={size} className={cn('animate-spin', className)} />;
}

export function FullPageLoader({ label }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ivory gap-3">
      <div className="w-12 h-12 rounded-full border-2 border-champagne/30 border-t-champagne animate-spin" />
      {label && <p className="text-sm text-taupe">{label}</p>}
    </div>
  );
}
