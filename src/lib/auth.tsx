import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Profile } from './types';

const DEMO_EMAIL = 'guest@lifeos.app';
const DEMO_PASSWORD = 'LifeOS-guest-2026';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (uid: string) => {
    setProfileLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.warn('Profile load error', error.message);
    }
    setProfile(data as Profile | null);
    setProfileLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      // Try existing session first
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session?.user) {
        if (!mounted) return;
        setSession(existing.session);
        setUser(existing.session.user);
        setLoading(false);
        await loadProfile(existing.session.user.id);
        return;
      }
      // No session — auto sign-in with the persistent guest account
      // so RLS and JWT-based edge functions keep working transparently.
      await ensureDemoUser();
      const { data: signed } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      if (!mounted) return;
      if (signed.session?.user) {
        setSession(signed.session);
        setUser(signed.session.user);
        await loadProfile(signed.session.user.id);
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      (async () => {
        setSession(sess);
        setUser(sess?.user ?? null);
        if (sess?.user) {
          await loadProfile(sess.user.id);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading, profileLoading, refreshProfile, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

async function ensureDemoUser(): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  if (error && !error.message.toLowerCase().includes('already')) {
    console.warn('Guest sign-up notice:', error.message);
  }
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
