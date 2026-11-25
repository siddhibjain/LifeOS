import { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { Spinner } from '@/components/ui/Spinner';
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { AuthView } from '@/lib/types';

interface AuthScreenProps {
  view: AuthView;
  onChangeView: (v: AuthView) => void;
  onBack: () => void;
}

export function AuthScreen({ view, onChangeView, onBack }: AuthScreenProps) {
  const { toast } = useToast();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (view === 'signup' && !fullName.trim()) e.fullName = 'Please enter your name.';
    if (!email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address.';
    if (view !== 'forgot') {
      if (!password) e.password = 'Password is required.';
      else if (password.length < 6) e.password = 'Password must be at least 6 characters.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (view === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            onboarding_completed: false,
          });
        }
        toast('Account created. Welcome to LifeOS.', 'success');
      } else if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast('Welcome back.', 'success');
      } else if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/#reset`,
        });
        if (error) throw error;
        toast('Password reset link sent to your email.', 'success');
        onChangeView('login');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      toast(msg, 'error');
    } finally {
      setLoading(false);
      refreshProfile();
    }
  }

  const titles: Record<AuthView, { title: string; sub: string }> = {
    login: { title: 'Welcome back', sub: 'Sign in to your LifeOS account.' },
    signup: { title: 'Create your account', sub: 'Start organizing your life in minutes.' },
    forgot: { title: 'Reset password', sub: "Enter your email and we'll send you a reset link." },
    reset: { title: 'Set new password', sub: 'Choose a new password for your account.' },
  };
  const t = titles[view];

  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-8">
            <Logo />
            <button onClick={onBack} className="btn-ghost text-xs">
              <ArrowLeft size={14} /> Home
            </button>
          </div>

          <div className="card p-7 sm:p-8 animate-slide-up">
            <h1 className="text-2xl sm:text-3xl text-espresso mb-1.5">{t.title}</h1>
            <p className="text-sm text-taupe mb-6">{t.sub}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {view === 'signup' && (
                <div>
                  <label className="label">Full name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
                    <input
                      className="input pl-10"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Alexandra Chen"
                      autoComplete="name"
                    />
                  </div>
                  {errors.fullName && <p className="text-xs text-rose mt-1">{errors.fullName}</p>}
                </div>
              )}

              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
                  <input
                    className="input pl-10"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                {errors.email && <p className="text-xs text-rose mt-1">{errors.email}</p>}
              </div>

              {view !== 'forgot' && (
                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
                    <input
                      className="input pl-10 pr-10"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-taupe hover:text-espresso"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-rose mt-1">{errors.password}</p>}
                </div>
              )}

              {view === 'login' && (
                <div className="text-right">
                  <button type="button" onClick={() => onChangeView('forgot')} className="text-xs text-champagne-dark hover:underline">
                    Forgot password?
                  </button>
                </div>
              )}

              <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
                {loading ? <Spinner /> : (
                  view === 'login' ? 'Sign in' :
                  view === 'signup' ? 'Create account' :
                  view === 'forgot' ? 'Send reset link' : 'Update password'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-espresso/5 text-center text-sm text-taupe">
              {view === 'login' && (
                <>Don't have an account?{' '}
                  <button onClick={() => onChangeView('signup')} className="text-espresso font-medium hover:underline">Sign up</button>
                </>
              )}
              {view === 'signup' && (
                <>Already have an account?{' '}
                  <button onClick={() => onChangeView('login')} className="text-espresso font-medium hover:underline">Sign in</button>
                </>
              )}
              {view === 'forgot' && (
                <button onClick={() => onChangeView('login')} className="text-espresso font-medium hover:underline">Back to sign in</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
