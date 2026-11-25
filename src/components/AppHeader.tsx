import { Menu, Sparkles } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth';
import { initials } from '@/lib/utils';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onOpenSidebar: () => void;
  onNavigate: (r: 'dashboard') => void;
}

export function AppHeader({ title, subtitle, onOpenSidebar }: AppHeaderProps) {
  const { profile, user } = useAuth();
  const name = profile?.full_name || user?.user_metadata?.full_name || 'there';

  return (
    <header className="sticky top-0 z-20 bg-ivory/85 backdrop-blur-md border-b border-espresso/5">
      <div className="h-16 px-4 sm:px-6 flex items-center gap-3">
        <button onClick={onOpenSidebar} className="lg:hidden text-espresso p-1.5 -ml-1.5" aria-label="Open menu">
          <Menu size={22} />
        </button>
        <div className="lg:hidden"><Logo showText={false} /></div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl text-espresso truncate font-serif">{title}</h1>
          {subtitle && <p className="text-xs text-taupe truncate hidden sm:block">{subtitle}</p>}
        </div>
        <div className="w-9 h-9 rounded-full bg-champagne/15 flex items-center justify-center text-champagne-dark text-xs font-semibold shrink-0">
          {initials(name) || 'U'}
        </div>
      </div>
    </header>
  );
}
