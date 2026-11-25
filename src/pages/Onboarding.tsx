import { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { upsertProfile } from '@/lib/services';
import { Logo } from '@/components/Logo';
import { Spinner } from '@/components/ui/Spinner';
import { User, Globe, Phone, Bell, Heart, ArrowRight, SkipForward } from 'lucide-react';

const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'India', 'Germany', 'France', 'Singapore', 'United Arab Emirates', 'Other'];
const INTERESTS = ['Education', 'Career', 'Travel', 'Finance', 'Health', 'Family', 'Property', 'Legal'];

export function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [intervals, setIntervals] = useState<number[]>([90, 30, 7, 1]);
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleInterval(n: number) {
    setIntervals(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort((a, b) => a - b));
  }
  function toggleInterest(i: string) {
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  }

  async function handleSubmit(skip = false) {
    if (!user) return;
    if (!skip) {
      const e: Record<string, string> = {};
      if (!fullName.trim()) e.fullName = 'Please enter your name.';
      if (!country) e.country = 'Please select your country.';
      setErrors(e);
      if (Object.keys(e).length) return;
    }
    setLoading(true);
    try {
      await upsertProfile(user.id, {
        full_name: skip ? (fullName || null) : fullName,
        country: skip ? null : country,
        phone: phone || null,
        reminder_preferences: { intervals },
        interests,
        onboarding_completed: true,
      });
      await refreshProfile();
      toast(skip ? 'Skipped for now — you can complete this later in Settings.' : 'Profile saved. Welcome aboard!', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save profile.';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-lg">
          <div className="flex justify-center mb-8"><Logo /></div>

          <div className="card p-7 sm:p-8 animate-slide-up">
            <h1 className="text-2xl sm:text-3xl text-espresso mb-1.5">Let's set up your profile</h1>
            <p className="text-sm text-taupe mb-6">A few details so LifeOS can personalize your experience. Optional fields can be skipped.</p>

            <form onSubmit={(e: FormEvent) => { e.preventDefault(); handleSubmit(false); }} className="space-y-5">
              <div>
                <label className="label">Full name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
                  <input className="input pl-10" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Alexandra Chen" />
                </div>
                {errors.fullName && <p className="text-xs text-rose mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="label">Country</label>
                <div className="relative">
                  <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
                  <select className="input pl-10 appearance-none" value={country} onChange={e => setCountry(e.target.value)}>
                    <option value="">Select your country</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {errors.country && <p className="text-xs text-rose mt-1">{errors.country}</p>}
              </div>

              <div>
                <label className="label">Phone number <span className="text-taupe/60 normal-case">(optional)</span></label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
                  <input className="input pl-10" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
                </div>
              </div>

              <div>
                <label className="label"><Bell size={12} className="inline mr-1" /> Reminder intervals</label>
                <p className="text-xs text-taupe/80 mb-2">Days before a deadline to remind you.</p>
                <div className="flex flex-wrap gap-2">
                  {[90, 30, 14, 7, 3, 1].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => toggleInterval(n)}
                      className={`chip px-3 py-1.5 border transition-colors ${
                        intervals.includes(n)
                          ? 'bg-champagne/15 border-champagne text-champagne-dark'
                          : 'bg-ivory border-espresso/10 text-taupe hover:border-champagne/50'
                      }`}
                    >
                      {n} days
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label"><Heart size={12} className="inline mr-1" /> Interests <span className="text-taupe/60 normal-case">(optional)</span></label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map(i => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleInterest(i)}
                      className={`chip px-3 py-1.5 border transition-colors ${
                        interests.includes(i)
                          ? 'bg-sage/15 border-sage text-sage'
                          : 'bg-ivory border-espresso/10 text-taupe hover:border-sage/50'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button type="button" className="btn-ghost sm:mr-auto" onClick={() => handleSubmit(true)} disabled={loading}>
                  <SkipForward size={15} /> Skip for now
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <Spinner /> : <>Continue <ArrowRight size={15} /></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
