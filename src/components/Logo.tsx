import { cn } from '@/lib/utils';

export function Logo({ className, showText = true, size = 28 }: { className?: string; showText?: boolean; size?: number }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
          <circle cx="16" cy="16" r="15" fill="#F1EDE5" stroke="#C6A875" strokeWidth="1" />
          <path d="M10 16.5L14 20.5L22 12" stroke="#C6A875" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="16" cy="16" r="11.5" stroke="#C6A875" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.5" />
        </svg>
      </div>
      {showText && (
        <span className="font-serif text-xl text-espresso tracking-tight">LifeOS</span>
      )}
    </div>
  );
}
