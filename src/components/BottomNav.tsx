import { LayoutDashboard, FolderOpen, ListTodo, Calendar, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppRoute } from '@/lib/types';

const ITEMS: { route: AppRoute; label: string; icon: typeof LayoutDashboard }[] = [
  { route: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { route: 'documents', label: 'Docs', icon: FolderOpen },
  { route: 'actions', label: 'Tasks', icon: ListTodo },
  { route: 'calendar', label: 'Calendar', icon: Calendar },
  { route: 'ask', label: 'Ask AI', icon: MoreHorizontal },
];

const MORE_ROUTES: AppRoute[] = ['reminders', 'checklists', 'followups', 'lifegraph', 'vault', 'settings'];

interface BottomNavProps {
  route: AppRoute;
  onNavigate: (r: AppRoute) => void;
}

export function BottomNav({ route, onNavigate }: BottomNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-espresso/5 px-1 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around">
        {ITEMS.map(item => {
          const active = route === item.route;
          return (
            <button
              key={item.route}
              onClick={() => onNavigate(item.route)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[58px] transition-colors',
                active ? 'text-champagne-dark' : 'text-taupe',
              )}
            >
              <item.icon size={20} className={active ? 'scale-110 transition-transform' : ''} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => onNavigate('checklists')}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[58px] transition-colors',
            MORE_ROUTES.includes(route) ? 'text-champagne-dark' : 'text-taupe',
          )}
        >
          <MoreHorizontal size={20} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}
