import { useState, useEffect } from 'react';
import {
  User, Bell, Shield, Download, Trash2, Mail, Globe, Phone, Heart,
  Loader2, AlertTriangle, Check,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { upsertProfile, listDocuments, listReminders, listChecklists, listVaultEntries, listConversations } from '@/lib/services';
import { supabase } from '@/lib/supabase';
import { DocumentRecord, Reminder, Checklist, VaultEntry, AiConversation, AppRoute } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';

const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'India', 'Germany', 'France', 'Singapore', 'United Arab Emirates', 'Other'];
const INTERESTS = ['Education', 'Career', 'Travel', 'Finance', 'Health', 'Family', 'Property', 'Legal'];

interface SettingsProps {
  onSignedOut: () => void;
}

export function Settings({ onSignedOut }: SettingsProps) {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [intervals, setIntervals] = useState<number[]>([90, 30, 7, 1]);
  const [notifications, setNotifications] = useState(true);
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState<{ docs: number; reminders: number; checklists: number; vault: number; conversations: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setCountry(profile.country || '');
      setPhone(profile.phone || '');
      setIntervals(profile.reminder_preferences?.intervals || [90, 30, 7, 1]);
      setNotifications(profile.notification_enabled ?? true);
      setInterests(profile.interests || []);
    }
  }, [profile]);

  useEffect(() => {
    (async () => {
      try {
        const [docs, reminders, checklists, vault, convos] = await Promise.all([
          listDocuments(), listReminders(), listChecklists(), listVaultEntries(), listConversations(),
        ]);
        setStats({
          docs: (docs as DocumentRecord[]).length,
          reminders: (reminders as Reminder[]).length,
          checklists: (checklists as Checklist[]).length,
          vault: (vault as VaultEntry[]).length,
          conversations: (convos as AiConversation[]).length,
        });
      } catch { /* ignore */ } finally {
        setLoadingStats(false);
      }
    })();
  }, []);

  function toggleInterval(n: number) {
    setIntervals(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort((a, b) => a - b));
  }
  function toggleInterest(i: string) {
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  }

  async function handleSaveProfile() {
    if (!user) return;
    setSaving(true);
    try {
      await upsertProfile(user.id, {
        full_name: fullName, country, phone,
        reminder_preferences: { intervals },
        notification_enabled: notifications,
        interests,
      });
      await refreshProfile();
      toast('Profile updated.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save profile.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    if (!user) return;
    setExporting(true);
    try {
      const [docs, reminders, checklists, vault] = await Promise.all([
        listDocuments(), listReminders(), listChecklists(), listVaultEntries(),
      ]);
      const data = {
        exported_at: new Date().toISOString(),
        profile: { email: user.email, full_name: fullName, country, phone, interests },
        documents: (docs as DocumentRecord[]).map(d => ({
          name: d.document_name, category: d.category, file_type: d.file_type,
          issue_date: d.issue_date, expiry_date: d.expiry_date,
          issuing_authority: d.issuing_authority, document_number: d.document_number,
          extracted_data: d.extracted_data?.extracted_json,
        })),
        reminders: (reminders as Reminder[]).map(r => ({
          title: r.title, description: r.description, type: r.reminder_type,
          due_date: r.due_date, priority: r.priority, status: r.status,
        })),
        checklists: (checklists as Checklist[]).map(c => ({
          title: c.title, situation: c.situation_type, items: c.checklist_items?.map(i => ({
            title: i.title, is_completed: i.is_completed, is_required: i.is_required,
          })),
        })),
        vault: (vault as VaultEntry[]).map(v => ({
          field_name: v.field_name, category: v.category, value: v.protected_field_value,
        })),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifeos-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Data exported.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed.', 'error');
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;
    setDeleting(true);
    try {
      // Delete all user data via service calls (RLS-scoped)
      const { error: dErr } = await supabase.from('documents').delete().eq('user_id', user.id);
      const { error: rErr } = await supabase.from('reminders').delete().eq('user_id', user.id);
      const { error: cErr } = await supabase.from('checklists').delete().eq('user_id', user.id);
      const { error: vErr } = await supabase.from('vault_entries').delete().eq('user_id', user.id);
      const { error: acErr } = await supabase.from('ai_conversations').delete().eq('user_id', user.id);
      const { error: pErr } = await supabase.from('profiles').delete().eq('id', user.id);
      if ([dErr, rErr, cErr, vErr, acErr, pErr].some(Boolean)) {
        toast('Some data could not be deleted. Please try again.', 'error');
        return;
      }
      await signOut();
      toast('Account data deleted.', 'success');
      onSignedOut();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete account.', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-24 lg:pb-6">
      <div className="mb-6">
        <h2 className="font-serif text-2xl sm:text-3xl text-espresso">Settings</h2>
        <p className="text-taupe text-sm mt-1">Manage your profile, preferences and account.</p>
      </div>

      <div className="space-y-5">
        {/* Profile */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <User size={18} className="text-champagne-dark" />
            <h3 className="font-serif text-lg text-espresso">Profile</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
                <input className="input pl-10" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
                <input className="input pl-10 bg-ivory-2/50" value={user?.email || ''} disabled />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Country</label>
                <div className="relative">
                  <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
                  <select className="input pl-10 appearance-none" value={country} onChange={e => setCountry(e.target.value)}>
                    <option value="">Select country</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Phone</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
                  <input className="input pl-10" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
                </div>
              </div>
            </div>
            <div>
              <label className="label"><Heart size={12} className="inline mr-1" /> Interests</label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(i => (
                  <button key={i} type="button" onClick={() => toggleInterest(i)}
                    className={cn('chip px-3 py-1.5 border transition-colors',
                      interests.includes(i) ? 'bg-sage/15 border-sage text-sage' : 'bg-ivory border-espresso/10 text-taupe hover:border-sage/50')}>
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-primary" onClick={handleSaveProfile} disabled={saving}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save profile
            </button>
          </div>
        </section>

        {/* Reminder preferences */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <Bell size={18} className="text-champagne-dark" />
            <h3 className="font-serif text-lg text-espresso">Reminder preferences</h3>
          </div>
          <div>
            <p className="text-xs text-taupe/80 mb-2">Days before a deadline to remind you.</p>
            <div className="flex flex-wrap gap-2">
              {[90, 30, 14, 7, 3, 1].map(n => (
                <button key={n} type="button" onClick={() => toggleInterval(n)}
                  className={cn('chip px-3 py-1.5 border transition-colors',
                    intervals.includes(n) ? 'bg-champagne/15 border-champagne text-champagne-dark' : 'bg-ivory border-espresso/10 text-taupe hover:border-champagne/50')}>
                  {n} days
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-espresso">In-app notifications</p>
              <p className="text-xs text-taupe">Show reminders within the app.</p>
            </div>
            <button
              onClick={() => setNotifications(n => !n)}
              className={cn('relative w-11 h-6 rounded-full transition-colors', notifications ? 'bg-sage' : 'bg-taupe/30')}
              aria-label="Toggle notifications"
            >
              <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform', notifications && 'translate-x-5')} />
            </button>
          </div>
        </section>

        {/* Security */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield size={18} className="text-champagne-dark" />
            <h3 className="font-serif text-lg text-espresso">Security</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-espresso/5">
              <span className="text-taupe">Account email</span>
              <span className="text-espresso font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-espresso/5">
              <span className="text-taupe">Row Level Security</span>
              <span className="chip bg-sage/15 text-sage">Enabled</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-taupe">Private storage bucket</span>
              <span className="chip bg-sage/15 text-sage">Active</span>
            </div>
          </div>
        </section>

        {/* Data */}
        <section className="card p-5 sm:p-6">
          <h3 className="font-serif text-lg text-espresso mb-4">Your data</h3>
          {loadingStats ? (
            <div className="space-y-2"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /></div>
          ) : stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              {[
                ['Documents', stats.docs], ['Reminders', stats.reminders],
                ['Checklists', stats.checklists], ['Vault entries', stats.vault],
                ['Conversations', stats.conversations],
              ].map(([label, count]) => (
                <div key={label as string} className="rounded-xl bg-ivory-2/40 p-3">
                  <p className="text-xs text-taupe">{label}</p>
                  <p className="text-lg font-serif text-espresso mt-0.5">{count as number}</p>
                </div>
              ))}
            </div>
          ) : null}
          <button className="btn-outline w-full" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Export my data
          </button>
          <p className="text-xs text-taupe mt-2">Download a JSON file with all your LifeOS data.</p>
        </section>

        {/* Danger zone */}
        <section className="card p-5 sm:p-6 border-rose/20">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-rose" />
            <h3 className="font-serif text-lg text-espresso">Account actions</h3>
          </div>
          <div className="space-y-3">
            <button className="btn bg-rose/10 text-rose hover:bg-rose/20 w-full" onClick={() => setDeleteConfirm(true)}>
              <Trash2 size={15} /> Delete account and all data
            </button>
            <p className="text-xs text-taupe">This permanently deletes all your documents, reminders, checklists, vault entries and conversations. This cannot be undone.</p>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        title="Delete your account?"
        message="This will permanently delete all your data — documents, reminders, checklists, vault entries and conversations. This action cannot be undone."
        confirmLabel="Delete everything"
        destructive
        onConfirm={handleDeleteAccount}
        onClose={() => setDeleteConfirm(false)}
      />
    </div>
  );
}
