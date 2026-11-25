import { FileText, Sparkles, Bell, ShieldCheck, Brain, Upload, MessageSquare, ListChecks, Lock, ArrowRight, Check } from 'lucide-react';
import { Logo } from '@/components/Logo';

interface LandingProps {
  onGetStarted: () => void;
}

export function Landing({ onGetStarted }: LandingProps) {
  return (
    <div className="min-h-screen bg-ivory">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-ivory/80 backdrop-blur-md border-b border-espresso/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-espresso/70">
            <a href="#features" className="hover:text-espresso transition-colors">Features</a>
            <a href="#how" className="hover:text-espresso transition-colors">How it works</a>
            <a href="#privacy" className="hover:text-espresso transition-colors">Privacy</a>
          </nav>
          <button className="btn-primary" onClick={onGetStarted}>Get Started</button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 -right-24 w-96 h-96 rounded-full bg-champagne/10 blur-3xl" />
          <div className="absolute bottom-0 -left-24 w-96 h-96 rounded-full bg-rose/8 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-16 sm:pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 chip bg-champagne/15 text-champagne-dark mb-6">
              <Sparkles size={13} /> Your intelligent life assistant
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl text-espresso leading-[1.1] mb-5">
              Your life,<br />beautifully organized.
            </h1>
            <p className="text-base sm:text-lg text-taupe max-w-md leading-relaxed mb-8">
              One intelligent space for your documents, deadlines and everyday responsibilities — understood by AI, secured by design.
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="btn-gold text-base px-6 py-3" onClick={onGetStarted}>
                Get Started <ArrowRight size={16} />
              </button>
              <a href="#features" className="btn-outline text-base px-6 py-3">Explore Features</a>
            </div>
            <div className="flex items-center gap-5 mt-8 text-xs text-taupe">
              <span className="inline-flex items-center gap-1.5"><Lock size={13} /> Private storage</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Per-user security</span>
              <span className="inline-flex items-center gap-1.5"><Brain size={13} /> AI document intelligence</span>
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative animate-fade-in hidden lg:block">
            <div className="card p-6 rotate-1 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center justify-between mb-4">
                <p className="font-serif text-lg text-espresso">Good morning, Alexandra</p>
                <span className="chip bg-sage/15 text-sage">All caught up</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl bg-ivory-2 p-4">
                  <p className="text-xs text-taupe uppercase tracking-wide">Documents</p>
                  <p className="text-2xl font-serif text-espresso mt-1">24</p>
                </div>
                <div className="rounded-xl bg-ivory-2 p-4">
                  <p className="text-xs text-taupe uppercase tracking-wide">Upcoming</p>
                  <p className="text-2xl font-serif text-espresso mt-1">3</p>
                </div>
              </div>
              <div className="rounded-xl border border-champagne/20 bg-champagne/5 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles size={14} className="text-champagne-dark" />
                  <p className="text-xs font-medium text-champagne-dark uppercase tracking-wide">Your LifeOS Insights</p>
                </div>
                <p className="text-sm text-espresso/80 leading-snug">
                  Your insurance document expires in 30 days. Consider reviewing its renewal requirements.
                </p>
              </div>
            </div>
            <div className="card p-4 -mt-6 ml-12 -rotate-2 hover:rotate-0 transition-transform duration-500 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose/15 flex items-center justify-center">
                  <FileText size={18} className="text-rose" />
                </div>
                <div>
                  <p className="text-sm font-medium text-espresso">Passport.pdf</p>
                  <p className="text-xs text-taupe">Identity · expires Mar 2028</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What LifeOS does */}
      <section id="features" className="py-16 sm:py-24 bg-ivory-2/50">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl text-espresso mb-3">What LifeOS does</h2>
            <p className="text-taupe leading-relaxed">Six focused capabilities that turn scattered paperwork into an organized, intelligent archive you can actually use.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Upload, title: 'Document vault', text: 'Upload and organize PDFs and images into a private, categorized library with search and filters.' },
              { icon: Brain, title: 'AI extraction', text: 'Gemini reads your documents and pulls out document numbers, dates, authorities and key clauses.' },
              { icon: MessageSquare, title: 'Ask your documents', text: 'Chat with your archive. Get grounded answers with sources — no more digging through files.' },
              { icon: Bell, title: 'Smart reminders', text: 'Never miss a renewal. Reminders are suggested from expiry dates and tracked to completion.' },
              { icon: ListChecks, title: 'Life checklists', text: 'Generate situation-based checklists for travel, applications and major life events.' },
              { icon: Sparkles, title: 'Life insights', text: 'A quiet assistant that surfaces what needs attention this week, grounded in your real data.' },
            ].map((f, i) => (
              <div key={i} className="card p-6 hover:shadow-lift transition-shadow duration-300">
                <div className="w-11 h-11 rounded-xl bg-champagne/12 flex items-center justify-center text-champagne-dark mb-4">
                  <f.icon size={20} />
                </div>
                <h3 className="text-lg text-espresso mb-2">{f.title}</h3>
                <p className="text-sm text-taupe leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Document intelligence */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="chip bg-sage/15 text-sage mb-4">Signature feature</p>
            <h2 className="text-3xl sm:text-4xl text-espresso mb-4 leading-tight">Smart document intelligence</h2>
            <p className="text-taupe leading-relaxed mb-6">When you upload a document, LifeOS reads it, classifies it and extracts the fields that matter — then asks you to confirm before anything is saved as fact.</p>
            <ul className="space-y-3">
              {[
                'Automatic categorization across 8 document types',
                'Structured extraction of numbers, dates and authorities',
                'Uncertain fields flagged for your manual review',
                'You confirm — nothing is overwritten without permission',
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-espresso/85">
                  <Check size={16} className="text-sage mt-0.5 shrink-0" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6 animate-fade-in">
            <div className="flex items-center gap-3 pb-4 border-b border-espresso/5">
              <div className="w-12 h-12 rounded-xl bg-rose/15 flex items-center justify-center">
                <FileText size={22} className="text-rose" />
              </div>
              <div>
                <p className="font-medium text-espresso">Insurance_Policy_2024.pdf</p>
                <p className="text-xs text-taupe">Insurance · extracted by Gemini</p>
              </div>
            </div>
            <dl className="divide-y divide-espresso/5">
              {[
                ['Document type', 'Health insurance policy'],
                ['Policy number', 'POL-8847-2024'],
                ['Issue date', 'Jan 12, 2024'],
                ['Expiry date', 'Jan 12, 2025'],
                ['Issuing authority', 'BlueShield Mutual'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-3 text-sm">
                  <dt className="text-taupe">{k}</dt>
                  <dd className="text-espresso font-medium text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <button className="btn-gold w-full mt-4">Confirm details</button>
          </div>
        </div>
      </section>

      {/* Reminders & organization */}
      <section className="py-16 sm:py-24 bg-ivory-2/50">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 card p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="font-serif text-lg text-espresso">Upcoming reminders</p>
              <span className="chip bg-rose/15 text-rose">2 overdue</span>
            </div>
            <div className="space-y-3">
              {[
                { t: 'Renew car insurance', d: 'in 7 days', p: 'high', c: 'text-rose' },
                { t: 'Passport renewal', d: 'in 45 days', p: 'medium', c: 'text-champagne-dark' },
                { t: 'Submit tax documents', d: 'in 3 days', p: 'high', c: 'text-rose' },
                { t: 'Annual health check-up', d: 'in 90 days', p: 'low', c: 'text-sage' },
              ].map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-ivory-2/60">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${r.c === 'text-rose' ? 'bg-rose' : r.c === 'text-champagne-dark' ? 'bg-champagne' : 'bg-sage'}`} />
                    <span className="text-sm text-espresso">{r.t}</span>
                  </div>
                  <span className={`text-xs ${r.c}`}>{r.d}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="chip bg-rose/15 text-rose mb-4">Reminders & organization</p>
            <h2 className="text-3xl sm:text-4xl text-espresso mb-4 leading-tight">Never let a deadline slip</h2>
            <p className="text-taupe leading-relaxed mb-6">LifeOS turns expiry dates into actionable reminders, organized by upcoming, overdue and completed. Configure intervals that suit your pace — 90, 30, 7 and 1 day before each deadline.</p>
            <ul className="space-y-3">
              {[
                'Auto-suggested from confirmed expiry dates',
                'Priorities, categories and linked documents',
                'Calendar view alongside list views',
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-espresso/85">
                  <Check size={16} className="text-sage mt-0.5 shrink-0" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl text-espresso mb-3">How it works</h2>
            <p className="text-taupe leading-relaxed">Three steps from scattered to organized.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: '01', t: 'Upload your documents', d: 'Drag and drop PDFs, photos of IDs, certificates and agreements. Files land in private, user-scoped storage.' },
              { n: '02', t: 'Let AI understand them', d: 'Gemini extracts the important fields and asks you to confirm. You stay in control of what gets saved.' },
              { n: '03', t: 'Act on what matters', d: 'Get insights, ask questions, generate checklists and set reminders — all grounded in your real archive.' },
            ].map((s, i) => (
              <div key={i} className="card p-6 relative">
                <span className="font-serif text-4xl text-champagne/40 absolute top-4 right-5">{s.n}</span>
                <h3 className="text-lg text-espresso mb-2 mt-2">{s.t}</h3>
                <p className="text-sm text-taupe leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="py-16 sm:py-24 bg-ivory-2/50">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-sage/15 flex items-center justify-center text-sage mb-5">
              <ShieldCheck size={26} />
            </div>
            <h2 className="text-3xl sm:text-4xl text-espresso mb-4 leading-tight">Privacy and security by design</h2>
            <p className="text-taupe leading-relaxed mb-6">Your documents are personal. LifeOS stores them in a private bucket scoped to your account, with row-level security enforced at the database. No other user can read your data — not even by accident.</p>
            <ul className="space-y-3">
              {[
                'Private, per-user document storage',
                'Row Level Security on every table',
                'AI calls proxied through server-side functions',
                'Sensitive vault entries stay private to you',
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-espresso/85">
                  <Lock size={15} className="text-sage mt-0.5 shrink-0" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-champagne/12 flex items-center justify-center text-champagne-dark">
                <Lock size={18} />
              </div>
              <p className="font-medium text-espresso">lifeos-documents</p>
            </div>
            <div className="rounded-xl bg-ivory-2/60 p-4 font-mono text-xs text-espresso/70 space-y-1.5">
              <p><span className="text-sage">RLS:</span> enabled on all tables</p>
              <p><span className="text-sage">Storage:</span> private bucket</p>
              <p><span className="text-sage">Policy:</span> auth.uid() = user_id</p>
              <p><span className="text-sage">AI key:</span> server-side only</p>
              <p><span className="text-sage">Paths:</span> {`{user_id}/{file}`}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="text-3xl sm:text-5xl text-espresso mb-4 leading-tight">Bring order to your everyday</h2>
          <p className="text-taupe text-lg mb-8 max-w-xl mx-auto">Start with a single document. LifeOS takes care of the rest.</p>
          <button className="btn-gold text-base px-8 py-3.5" onClick={onGetStarted}>
            Get Started Free <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-espresso/5 py-10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-xs text-taupe">© {new Date().getFullYear()} LifeOS. Your life, beautifully organized.</p>
        </div>
      </footer>
    </div>
  );
}
