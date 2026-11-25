import { LayoutDashboard, FolderOpen, MessageSquareText, Bell, ListChecks, Lock, Settings, LogOut, X, ListTodo, GitBranch, Mail, Calendar } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth';
import { initials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { AppRoute } from '@/lib/types';

export const NAV_ITEMS: { route: AppRoute; label: string; icon: typeof LayoutDashboard }[] = [
  { route: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { route: 'documents', label: 'Documents', icon: FolderOpen },
  { route: 'actions', label: 'Action Center', icon: ListTodo },
  { route: 'lifegraph', label: 'LifeGraph', icon: GitBranch },
  { route: 'ask', label: 'Ask AI', icon: MessageSquareText },
  { route: 'reminders', label: 'Reminders', icon: Bell },
  { route: 'calendar', label: 'Calendar', icon: Calendar },
  { route: 'checklists', label: 'Checklists', icon: ListChecks },
  { route: 'followups', label: 'Follow-ups', icon: Mail },
  { route: 'vault', label: 'Vault', icon: Lock },
];

interface SidebarProps {
  route: AppRoute;
  onNavigate: (r: AppRoute) => void;
  onSignOut: () => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ route, onNavigate, onSignOut, open, onClose }: SidebarProps) {
  const { profile, user } = useAuth();
  const name = profile?.full_name || user?.user_metadata?.full_name || 'there';

  return (
    <>
      {open && <div className="fixed inset-0 bg-espresso/30 backdrop-blur-sm z-30 lg:hidden" onClick={onClose} />}
      <aside className={cn(
        'fixed lg:sticky top-0 left-0 z-40 lg:z-0 h-screen w-64 shrink-0 bg-card border-r border-espresso/5 flex flex-col transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-espresso/5 shrink-0">
          <Logo />
          <button onClick={onClose} className="lg:hidden text-taupe hover:text-espresso"><X size={20} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scroll-thin">
          {NAV_ITEMS.map(item => {
            const active = route === item.route;
            return (
              <button
                key={item.route}
                onClick={() => { onNavigate(item.route); onClose(); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                  active
                    ? 'bg-champagne/12 text-espresso font-medium'
                    : 'text-espresso/65 hover:bg-ivory-2 hover:text-espresso',
                )}
              >
                <item.icon size={18} className={active ? 'text-champagne-dark' : ''} />
                {item.label}
              </button>
            );
          })}
          <button
            onClick={() => { onNavigate('settings'); onClose(); }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
              route === 'settings' ? 'bg-champagne/12 text-espresso font-medium' : 'text-espresso/65 hover:bg-ivory-2 hover:text-espresso',
            )}
          >
            <Settings size={18} className={route === 'settings' ? 'text-champagne-dark' : ''} />
            Settings
          </button>
        </nav>

        <div className="p-3 border-t border-espresso/5 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-champagne/15 flex items-center justify-center text-champagne-dark text-xs font-semibold shrink-0">
              {initials(name) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-espresso truncate">{name}</p>
              <p className="text-xs text-taupe truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={onSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-espresso/65 hover:bg-rose/8 hover:text-rose transition-colors mt-1">
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
