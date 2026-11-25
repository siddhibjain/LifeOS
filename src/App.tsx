import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';
import { AuthView, AppRoute } from '@/lib/types';
import { FullPageLoader } from '@/components/ui/Spinner';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { AppHeader } from '@/components/AppHeader';
import { Landing } from '@/pages/Landing';
import { AuthScreen } from '@/pages/Auth';
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

type Screen = 'landing' | 'auth' | 'onboarding' | 'app';

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
  const [screen, setScreen] = useState<Screen>('landing');
  const [authView, setAuthView] = useState<AuthView>('login');
  const [route, setRoute] = useState<AppRoute>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Determine which screen to show based on auth state
  useEffect(() => {
    if (loading) return;
    if (!session || !user) {
      if (screen === 'app' || screen === 'onboarding') setScreen('landing');
    } else if (profileLoading) {
      // wait for profile to load
    } else if (profile && !profile.onboarding_completed) {
      setScreen('onboarding');
    } else if (profile && profile.onboarding_completed) {
      setScreen('app');
    } else if (!profile && !profileLoading) {
      // profile may not exist yet for a fresh signup — show onboarding
      setScreen('onboarding');
    }
  }, [session, user, profile, loading, profileLoading, screen]);

  // Handle reset password hash fragment
  useEffect(() => {
    if (window.location.hash === '#reset' && !session) {
      setAuthView('reset');
      setScreen('auth');
    }
  }, [session]);

  if (loading) {
    return <FullPageLoader label="Loading your LifeOS…" />;
  }

  // Landing page
  if (screen === 'landing' && !session) {
    return <Landing onGetStarted={() => { setAuthView('signup'); setScreen('auth'); }} />;
  }

  // Auth screens
  if (screen === 'auth' && !session) {
    return (
      <AuthScreen
        view={authView}
        onChangeView={setAuthView}
        onBack={() => setScreen('landing')}
      />
    );
  }

  // Onboarding
  if (screen === 'onboarding' && session) {
    return <Onboarding />;
  }

  // Main app
  if (session && (screen === 'app' || screen === 'onboarding')) {
    const meta = ROUTE_TITLES[route];
    const isAskRoute = route === 'ask';

    return (
      <div className="min-h-screen bg-ivory flex">
        <Sidebar
          route={route}
          onNavigate={setRoute}
          onSignOut={async () => {
            // signOut handled by auth context; just reset screen
            setScreen('landing');
          }}
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
            {route === 'settings' && <Settings onSignedOut={() => setScreen('landing')} />}
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

  // Fallback while transitioning
  return <FullPageLoader label="Loading…" />;
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
