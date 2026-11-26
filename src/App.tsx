import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';
import { AppRoute } from '@/lib/types';
import { FullPageLoader } from '@/components/ui/Spinner';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { AppHeader } from '@/components/AppHeader';
import { Onboarding } from '@/pages/Onboarding';
import { Dashboard } from '@/pages/Dashboard';
import { Documents } from '@/pages/Documents';
import { AskAi } from '@/pages/AskAi';
import { Reminders } from '@/pages/Reminders';
import { Checklists } from '@/pages/Checklists';
import { Vault } from '@/pages/Vault';
import { Settings } from '@/pages/Settings';
import { ActionCenter } from '@/pages/ActionCenter';
import { LifeGraph } from '@/pages/LifeGraph';
import { FollowUpAssistant } from '@/pages/FollowUpAssistant';
import { Calendar } from '@/pages/Calendar';

const ROUTE_TITLES: Record<AppRoute, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: "Here's your life at a glance." },
  documents: { title: 'Documents', subtitle: 'Your private document archive.' },
  ask: { title: 'Ask AI', subtitle: 'Chat with your documents.' },
  reminders: { title: 'Reminders', subtitle: 'Deadlines and renewals.' },
  checklists: { title: 'Checklists', subtitle: 'AI-prepared life checklists.' },
  vault: { title: 'Vault', subtitle: 'Reusable personal information.' },
  settings: { title: 'Settings', subtitle: 'Profile and preferences.' },
  actions: { title: 'Action Center', subtitle: 'Tasks created from documents and manually.' },
  lifegraph: { title: 'LifeGraph', subtitle: 'Visualize task dependencies.' },
  followups: { title: 'FollowUp Assistant', subtitle: 'Track pending responses.' },
  calendar: { title: 'Calendar', subtitle: 'Tasks, deadlines, and reminders at a glance.' },
};

function AppContent() {
  const { session, user, profile, loading, profileLoading } = useAuth();
  const [route, setRoute] = useState<AppRoute>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading || profileLoading) {
    return <FullPageLoader label="Loading your LifeOS…" />;
  }

  // If we somehow have no session yet, keep showing the loader.
  if (!session || !user) {
    return <FullPageLoader label="Loading your LifeOS…" />;
  }

  // First-time onboarding if profile exists but isn't completed
  if (profile && !profile.onboarding_completed) {
    return <Onboarding />;
  }

  const meta = ROUTE_TITLES[route];
  const isAskRoute = route === 'ask';

  return (
    <div className="min-h-screen bg-ivory flex">
      <Sidebar
        route={route}
        onNavigate={setRoute}
        onSignOut={async () => { /* no-op: guests don't sign out */ }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {!isAskRoute && (
          <AppHeader
            title={meta.title}
            subtitle={meta.subtitle}
            onOpenSidebar={() => setSidebarOpen(true)}
            onNavigate={() => setRoute('dashboard')}
          />
        )}
        <main className={isAskRoute ? 'flex-1' : 'flex-1'}>
          {route === 'dashboard' && <Dashboard onNavigate={setRoute} />}
          {route === 'documents' && <Documents />}
          {route === 'ask' && <AskAi />}
          {route === 'reminders' && <Reminders />}
          {route === 'checklists' && <Checklists />}
          {route === 'vault' && <Vault />}
          {route === 'settings' && <Settings onSignedOut={() => setRoute('dashboard')} />}
          {route === 'actions' && <ActionCenter onNavigate={setRoute} />}
          {route === 'lifegraph' && <LifeGraph />}
          {route === 'followups' && <FollowUpAssistant />}
          {route === 'calendar' && <Calendar onNavigate={setRoute} />}
        </main>
      </div>

      <BottomNav route={route} onNavigate={setRoute} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
