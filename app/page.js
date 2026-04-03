'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

function getSb() { return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { flowType: 'implicit' } }); }
const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtDate = d => { try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); } catch { return d || ''; } };
function makeSlug(name) { return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) + Math.random().toString(36).slice(2, 6); }
function calcHours(s, e) { if (!s || !e) return 0; return Math.round(((new Date(`2000-01-01T${e}`) - new Date(`2000-01-01T${s}`)) / 3600000) * 4) / 4; }

const PLATFORM_INFO = {
  venmo: { label: 'Venmo', color: '#008CFF', inputLabel: 'Venmo username, phone, or email', placeholder: 'e.g. jerin-v or (713) 555-0123', help: 'Open Venmo → tap your profile icon (top-left) → your username is under your name. Phone or email also work.' },
  paypal: { label: 'PayPal', color: '#0070BA', inputLabel: 'PayPal.me username OR email/phone', placeholder: 'e.g. jerinv or jerin@email.com', help: 'If you have a PayPal.me link (paypal.me/yourname), enter just the username. Otherwise use the email or phone on your PayPal — payers will see it as manual instructions.' },
  cashapp: { label: 'Cash App', color: '#00D632', inputLabel: '$cashtag (without the $)', placeholder: 'e.g. jerinv', help: 'Open Cash App → tap profile (top-right) → your $cashtag is at the top. Enter without the $.' },
  zelle: { label: 'Zelle', color: '#6D1ED4', inputLabel: 'Phone or email enrolled with Zelle', placeholder: 'e.g. (713) 555-0123', help: 'This is the phone/email you enrolled with in your banking app. Payers send via their own bank — no direct link for Zelle.' },
};

const M = PLATFORM_INFO;
const Badge = ({ children, color = 'gray' }) => { const c = { gray: 'bg-stone-800 text-stone-400', green: 'bg-emerald-900/60 text-emerald-300', yellow: 'bg-amber-900/50 text-amber-300', red: 'bg-red-900/50 text-red-300', blue: 'bg-sky-900/50 text-sky-300', purple: 'bg-violet-900/50 text-violet-300' }; return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c[color]}`}>{children}</span>; };
const Card = ({ children, className = '' }) => <div className={`bg-stone-900/80 border border-stone-800 rounded-xl p-4 ${className}`}>{children}</div>;
const Btn = ({ children, onClick, v = 'primary', disabled, className = '' }) => { const vs = { primary: 'bg-emerald-500 hover:bg-emerald-400 text-black', secondary: 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700', ghost: 'text-stone-400 hover:bg-stone-800' }; return <button onClick={onClick} disabled={disabled} className={`font-semibold text-sm px-4 py-2.5 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center gap-2 ${vs[v]} ${disabled ? 'opacity-40' : ''} ${className}`}>{children}</button>; };
const Input = ({ label, ...p }) => <label className="block">{label && <span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">{label}</span>}<input {...p} className={`w-full bg-stone-900 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 ${p.className || ''}`} /></label>;
const Select = ({ label, children, ...p }) => <label className="block">{label && <span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">{label}</span>}<select {...p} className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none">{children}</select></label>;

function Toast({ msg, show }) { if (!show) return null; return <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-sm font-bold px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">{msg}</div>; }

// ============================================================
// LANDING
// ============================================================
function Landing({ supabase }) {
  const [email, setEmail] = useState(''); const [loading, setLoading] = useState(false); const [sent, setSent] = useState(false);
  const google = async () => { setLoading(true); await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }); };
  const magic = async () => { if (!email) return; setLoading(true); const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } }); setLoading(false); if (!error) setSent(true); };
  if (sent) return <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)' }}><div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div><h2 className="text-stone-100 font-bold text-lg mb-2">Check your email</h2><p className="text-stone-500 text-sm">Link sent to <span className="text-stone-300">{email}</span></p><button onClick={() => setSent(false)} className="mt-4 text-stone-600 text-sm cursor-pointer">Try again</button></div>;
  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)' }}>
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><h1 className="text-3xl font-black text-stone-100">GigTab</h1></div>
        <p className="text-stone-400 text-lg font-bold mb-2">Stop texting people their Venmo amounts.</p>
        <p className="text-stone-600 text-sm max-w-sm mx-auto">Create a free payment link with all your Venmo, PayPal, Zelle, and Cash App info. Share it with anyone who pays you. They can also assign you work and track everything for taxes.</p>
      </div>
      <Card className="w-full max-w-sm space-y-4">
        <button onClick={google} disabled={loading} className="w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold text-sm px-4 py-3 rounded-lg border border-gray-300 inline-flex items-center justify-center gap-2 cursor-pointer">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Sign up free with Google
        </button>
        <div className="flex items-center gap-3"><div className="flex-1 h-px bg-stone-800"/><span className="text-stone-600 text-xs">or email</span><div className="flex-1 h-px bg-stone-800"/></div>
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
        <Btn onClick={magic} disabled={loading || !email} className="w-full">{loading ? 'Sending...' : 'Send Sign-In Link'}</Btn>
      </Card>
      <div className="mt-10 max-w-sm mx-auto text-center"><p className="text-stone-600 text-xs uppercase tracking-wider font-bold mb-4">How it works</p><div className="grid grid-cols-3 gap-4"><div><p className="text-2xl mb-1">🔗</p><p className="text-stone-400 text-xs font-semibold">Add your payment info</p><p className="text-stone-600 text-[10px]">Venmo, PayPal, Zelle, Cash App</p></div><div><p className="text-2xl mb-1">📱</p><p className="text-stone-400 text-xs font-semibold">Share one link</p><p className="text-stone-600 text-[10px]">Text it to anyone who pays you</p></div><div><p className="text-2xl mb-1">💸</p><p className="text-stone-400 text-xs font-semibold">Get paid instantly</p><p className="text-stone-600 text-[10px]">One tap, exact amount, auto-tracked</p></div></div></div>
    </div>
  );
}

// ============================================================
// SETUP
// ============================================================
function Setup({ user, supabase, onDone }) {
  const [name, setName] = useState(user.user_metadata?.full_name || ''); const [loading, setLoading] = useState(false);
  const create = async () => { if (!name.trim()) return; setLoading(true); await supabase.from('workers').insert({ user_id: user.id, name: name.trim(), slug: makeSlug(name), email: user.email, payment_methods: [], preferred_method: null }); setLoading(false); onDone(); };
  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)' }}>
      <Card className="w-full max-w-sm space-y-5">
        <div className="text-center"><div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center mx-auto mb-3"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><h2 className="text-xl font-bold text-stone-100">Create your GigTab</h2><p className="text-stone-500 text-sm mt-1">Enter your name. Next you'll add your payment methods.</p></div>
        <Input label="Your full name" value={name} onChange={e => setName(e.target.value)} placeholder="First Last" />
        <Btn onClick={create} disabled={loading || !name.trim()} className="w-full">{loading ? 'Creating...' : 'Create My GigTab'}</Btn>
      </Card>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ worker, supabase, onUpdate, signOut }) {
  const [tab, setTab] = useState(worker.payment_methods?.length === 0 ? 'profile' : 'jobs');
  const [jobs, setJobs] = useState([]); const [payments, setPayments] = useState([]);
  const [methods, setMethods] = useState(worker.payment_methods || []);
  const [pref, setPref] = useState(worker.preferred_method || null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null); // id of method being edited
  const [nm, setNm] = useState({ type: 'venmo', handle: '' });
  const [showHelp, setShowHelp] = useState(false);
  const [phone, setPhone] = useState(worker.phone || '');
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [hrs, setHrs] = useState(''); const [loggingJob, setLoggingJob] = useState(null);
  const [toast, setToast] = useState('');
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const profileUrl = `${baseUrl}/w/${worker.slug}`;

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 2000); };

  useEffect(() => {
    supabase.from('jobs').select('*').eq('worker_id', worker.id).order('created_at', { ascending: false }).then(({ data }) => setJobs(data || []));
    supabase.from('payments').select('*').eq('worker_id', worker.id).order('paid_at', { ascending: false }).then(({ data }) => setPayments(data || []));
  }, [worker.id]);

  const save = async u => { await supabase.from('workers').update(u).eq('id', worker.id); onUpdate(); };
  const updateJob = async (id, u) => { await supabase.from('jobs').update(u).eq('id', id); setJobs(p => p.map(j => j.id === id ? { ...j, ...u } : j)); };
  const submitHours = id => { if (!hrs) return; updateJob(id, { hours_logged: parseFloat(hrs), status: 'completed' }); setLoggingJob(null); setHrs(''); };
  const savePhone = () => { save({ phone }); setPhoneSaved(true); setTimeout(() => setPhoneSaved(false), 2000); };

  const addOrUpdateMethod = () => {
    if (!nm.handle) return;
    let updated;
    if (editing) {
      // Editing existing
      updated = methods.map(m => m.id === editing ? { ...m, type: nm.type, handle: nm.handle } : m);
    } else {
      // Check for duplicate type
      const existing = methods.find(m => m.type === nm.type);
      if (existing) {
        // Replace it
        updated = methods.map(m => m.type === nm.type ? { ...m, handle: nm.handle } : m);
      } else {
        updated = [...methods, { type: nm.type, handle: nm.handle, id: Math.random().toString(36).substr(2, 9) }];
      }
    }
    setMethods(updated);
    if (!pref) setPref(nm.type);
    setAdding(false); setEditing(null); setShowHelp(false);
    setNm({ type: 'venmo', handle: '' });
    save({ payment_methods: updated, preferred_method: pref || nm.type });
    showToast('Payment method saved!');
  };

  const startEdit = m => { setNm({ type: m.type, handle: m.handle }); setEditing(m.id); setAdding(true); };
  const removeMethod = id => { const u = methods.filter(m => m.id !== id); setMethods(u); save({ payment_methods: u }); showToast('Removed'); };

  // Available types to add (exclude already added unless editing)
  const availableTypes = Object.keys(PLATFORM_INFO).filter(t => editing || !methods.find(m => m.type === t));
  const pi = PLATFORM_INFO[nm.type];

  const pending = jobs.filter(j => j.status === 'pending');
  const active = jobs.filter(j => j.status === 'accepted');
  const waiting = jobs.filter(j => j.status === 'completed');
  const done = jobs.filter(j => ['approved', 'paid'].includes(j.status));

  const yr = new Date().getFullYear();
  const byPayer = {};
  payments.filter(p => new Date(p.paid_at).getFullYear() === yr).forEach(p => { const k = p.payer_name || '?'; if (!byPayer[k]) byPayer[k] = 0; byPayer[k] += p.amount; });

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.03) 0%, transparent 50%)' }}>
      <Toast msg={toast} show={!!toast} />
      <header className="sticky top-0 z-40 bg-stone-950/80 backdrop-blur-xl border-b border-stone-800/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><span className="font-black text-sm">GigTab</span></div>
          <div className="flex items-center gap-3"><span className="text-stone-500 text-xs">{worker.name}</span><button onClick={signOut} className="text-stone-500 hover:text-red-400 text-xs cursor-pointer">Sign Out</button></div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        {/* Share link */}
        <div className="bg-emerald-950/30 border border-emerald-700/30 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Your GigTab Link</p>
            {methods.length === 0 && <Badge color="yellow">Set up payment methods first ↓</Badge>}
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-stone-900 rounded-lg px-3 py-2 text-sm text-emerald-300 font-mono truncate">{profileUrl}</div>
            <button onClick={() => { navigator.clipboard?.writeText(profileUrl); showToast('Link copied!'); }} className="bg-emerald-500 text-black text-xs font-bold px-4 rounded-lg cursor-pointer hover:bg-emerald-400">Copy</button>
          </div>
          <p className="text-stone-600 text-xs mt-2">Share this with anyone who needs to <strong className="text-stone-500">pay you</strong> or <strong className="text-stone-500">assign you work</strong>. They don't need an account.</p>
        </div>

        {/* Quick guidance if no methods */}
        {methods.length === 0 && tab !== 'profile' && (
          <div className="bg-amber-950/20 border border-amber-800/20 rounded-xl p-4 mb-4">
            <p className="text-amber-400 text-sm font-semibold">First step: add a payment method</p>
            <p className="text-stone-500 text-xs mt-1">Your link won't work for payments until you add at least one way to receive money.</p>
            <button onClick={() => setTab('profile')} className="text-emerald-400 text-sm font-semibold mt-2 cursor-pointer">Go to Payment Methods →</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-stone-900 rounded-lg p-1 mb-5">
          {[{ k: 'jobs', l: 'My Jobs' }, { k: 'profile', l: 'Payment Methods' }, { k: 'earnings', l: 'Earnings' }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} className={`flex-1 text-xs font-semibold py-2 rounded-md cursor-pointer transition-colors ${tab === t.k ? 'bg-stone-800 text-emerald-400' : 'text-stone-500 hover:text-stone-300'}`}>{t.l}</button>
          ))}
        </div>

        {/* JOBS */}
        {tab === 'jobs' && (
          <div className="space-y-5">
            {jobs.length === 0 && <Card className="text-center py-8"><p className="text-3xl mb-3">📋</p><p className="text-stone-300 font-semibold mb-1">No jobs yet</p><p className="text-stone-500 text-xs max-w-xs mx-auto mb-2">Jobs show up here when someone uses your GigTab link to assign you work or pay you.</p><p className="text-stone-600 text-xs max-w-xs mx-auto mb-4">Share your link with your employer, clients, or anyone who owes you money.</p><button onClick={() => { navigator.clipboard?.writeText(profileUrl); showToast('Link copied!'); }} className="bg-emerald-500 text-black font-semibold text-sm px-6 py-2.5 rounded-lg cursor-pointer">Copy My Link</button></Card>}

            {pending.length > 0 && <div><p className="text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-2">New Invitations ({pending.length})</p>{pending.map(j => (
              <Card key={j.id} className="mb-3"><p className="text-stone-200 font-semibold">{j.title}</p><p className="text-stone-500 text-xs">From {j.payer_name}{j.job_date ? ` · ${fmtDate(j.job_date)}` : ''}</p>{j.start_time && j.end_time && <p className="text-stone-600 text-xs">{j.start_time}–{j.end_time}{j.hourly_rate ? ` · ${fmt(j.hourly_rate)}/hr` : ''}</p>}{j.hourly_rate && j.start_time && j.end_time && (() => { const h = calcHours(j.start_time, j.end_time); return h > 0 ? <p className="text-emerald-400 text-sm font-bold mt-1">Est. {fmt(h * j.hourly_rate)}</p> : null; })()}{j.notes && <p className="text-stone-600 text-xs mt-1 italic">"{j.notes}"</p>}<div className="flex gap-2 mt-3"><Btn onClick={() => updateJob(j.id, { status: 'accepted' })}>Accept</Btn><Btn onClick={() => updateJob(j.id, { status: 'declined' })} v="ghost">Decline</Btn></div></Card>
            ))}</div>}

            {active.length > 0 && <div><p className="text-sky-400 text-[10px] font-bold uppercase tracking-wider mb-2">Active — Log hours when done</p>{active.map(j => (
              <Card key={j.id} className="mb-3"><p className="text-stone-200 font-semibold">{j.title}</p><p className="text-stone-500 text-xs">{j.payer_name}{j.job_date ? ` · ${fmtDate(j.job_date)}` : ''}{j.hourly_rate ? ` · ${fmt(j.hourly_rate)}/hr` : ''}</p>
              {loggingJob === j.id ? (
                <div className="mt-3 space-y-3"><Input label="Hours worked" type="number" min="0.25" step="0.25" value={hrs} onChange={e => setHrs(e.target.value)} placeholder="3.5" />{hrs && j.hourly_rate && parseFloat(hrs) > 0 && <p className="text-emerald-400 text-sm font-bold">{hrs} hrs × {fmt(j.hourly_rate)} = {fmt(parseFloat(hrs) * j.hourly_rate)}</p>}<div className="flex gap-2"><Btn onClick={() => submitHours(j.id)} disabled={!hrs || parseFloat(hrs) <= 0}>Submit Hours</Btn><Btn onClick={() => setLoggingJob(null)} v="ghost">Cancel</Btn></div></div>
              ) : <div className="mt-3"><Btn onClick={() => setLoggingJob(j.id)} v="secondary">Log Hours</Btn></div>}
              </Card>
            ))}</div>}

            {waiting.length > 0 && <div><p className="text-violet-400 text-[10px] font-bold uppercase tracking-wider mb-2">Waiting for payer to approve</p>{waiting.map(j => (
              <Card key={j.id} className="mb-3"><div className="flex justify-between items-center"><div><p className="text-stone-200 font-semibold">{j.title}</p><p className="text-stone-500 text-xs">{j.payer_name} · {j.hours_logged}h submitted</p></div>{j.hourly_rate && <p className="text-stone-300 font-bold">{fmt(j.hours_logged * j.hourly_rate)}</p>}</div></Card>
            ))}</div>}

            {done.length > 0 && <div><p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-2">Completed</p>{done.map(j => {
              const pay = payments.find(p => p.job_id === j.id);
              return <Card key={j.id} className="mb-3"><div className="flex justify-between items-center"><div><p className="text-stone-200 font-semibold">{j.title}</p><p className="text-stone-500 text-xs">{j.payer_name}{j.hours_logged ? ` · ${j.hours_logged}h` : ''}</p></div><div className="text-right">{pay ? <><p className="text-emerald-400 font-bold">{fmt(pay.amount)}</p><Badge color="green">Paid</Badge></> : <Badge color="yellow">Approved</Badge>}</div></div></Card>;
            })}</div>}
          </div>
        )}

        {/* PAYMENT METHODS */}
        {tab === 'profile' && (
          <div className="space-y-5">
            <div><h3 className="text-stone-200 font-bold text-sm mb-1">Payment Methods</h3><p className="text-stone-500 text-xs">These show on your GigTab link. Anyone you share it with can use them to pay you.</p></div>

            {methods.length === 0 && !adding && (
              <Card className="text-center py-6 border-amber-800/30"><p className="text-amber-400 font-semibold text-sm mb-2">Add your first payment method</p><p className="text-stone-500 text-xs mb-4">Your GigTab link won't work for payments until you add at least one.</p><Btn onClick={() => { setAdding(true); setEditing(null); setNm({ type: 'venmo', handle: '' }); }}>Add Payment Method</Btn></Card>
            )}

            {methods.map(m => (
              <Card key={m.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLATFORM_INFO[m.type]?.color }} />
                    <div><p className="text-stone-200 text-sm font-semibold">{PLATFORM_INFO[m.type]?.label}</p><p className="text-stone-500 text-xs font-mono">{m.handle}</p></div>
                    {pref === m.type && <Badge color="green">Preferred</Badge>}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => startEdit(m)} className="text-[10px] text-stone-500 hover:text-emerald-400 cursor-pointer">Edit</button>
                    {pref !== m.type && <button onClick={() => { setPref(m.type); save({ preferred_method: m.type }); showToast('Preferred updated'); }} className="text-[10px] text-stone-500 hover:text-emerald-400 cursor-pointer">Set preferred</button>}
                    <button onClick={() => removeMethod(m.id)} className="text-[10px] text-stone-600 hover:text-red-400 cursor-pointer">Remove</button>
                  </div>
                </div>
              </Card>
            ))}

            {adding ? (
              <Card className="space-y-4">
                <p className="text-stone-300 text-sm font-semibold">{editing ? 'Edit payment method' : 'Add payment method'}</p>
                <Select label="Platform" value={nm.type} onChange={e => { setNm({ type: e.target.value, handle: '' }); setShowHelp(false); }}>
                  {(editing ? Object.keys(PLATFORM_INFO) : availableTypes).map(t => <option key={t} value={t}>{PLATFORM_INFO[t].label}</option>)}
                </Select>
                <div>
                  <span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">{pi?.inputLabel}</span>
                  <input value={nm.handle} onChange={e => setNm({ ...nm, handle: e.target.value })} placeholder={pi?.placeholder}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50" />
                </div>
                <button onClick={() => setShowHelp(!showHelp)} className="text-emerald-400 text-xs font-medium cursor-pointer">{showHelp ? 'Hide help' : `Where do I find my ${pi?.label} info?`}</button>
                {showHelp && <div className="bg-emerald-950/20 border border-emerald-800/20 rounded-lg px-3.5 py-3"><p className="text-stone-300 text-xs leading-relaxed">{pi?.help}</p></div>}
                <div className="flex gap-2"><Btn onClick={addOrUpdateMethod} disabled={!nm.handle}>{editing ? 'Update' : 'Save'}</Btn><Btn onClick={() => { setAdding(false); setEditing(null); setShowHelp(false); setNm({ type: 'venmo', handle: '' }); }} v="ghost">Cancel</Btn></div>
              </Card>
            ) : methods.length > 0 && availableTypes.length > 0 && (
              <button onClick={() => { setAdding(true); setEditing(null); setNm({ type: availableTypes[0], handle: '' }); }} className="text-emerald-400 text-sm font-semibold cursor-pointer hover:text-emerald-300">+ Add Another Payment Method</button>
            )}

            <Card>
              <div className="flex items-end gap-3">
                <div className="flex-1"><Input label="Phone number (optional)" value={phone} onChange={e => { setPhone(e.target.value); setPhoneSaved(false); }} placeholder="(713) 555-0123" /></div>
                <button onClick={savePhone} className={`text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-colors ${phoneSaved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}>{phoneSaved ? 'Saved!' : 'Save'}</button>
              </div>
            </Card>
          </div>
        )}

        {/* EARNINGS */}
        {tab === 'earnings' && (
          <div className="space-y-5">
            <div><h3 className="text-stone-200 font-bold text-sm mb-1">Earnings ({yr})</h3><p className="text-stone-500 text-xs">Tracked per payer. A 1099 is required if a single payer pays you $2,000+ in a year.</p></div>
            {Object.keys(byPayer).length === 0 && <Card className="text-center py-6"><p className="text-stone-500 text-sm">No payments recorded yet. Earnings appear here as you get paid through GigTab.</p></Card>}
            {Object.entries(byPayer).sort((a, b) => b[1] - a[1]).map(([p, t]) => (
              <Card key={p}><div className="flex justify-between items-center mb-2"><span className="text-stone-200 text-sm font-bold">{p}</span><div className="flex items-center gap-2"><span className={`font-bold text-sm ${t >= 2000 ? 'text-red-400' : 'text-stone-300'}`}>{fmt(t)}</span>{t >= 2000 && <Badge color="red">1099</Badge>}</div></div><div className="h-1.5 bg-stone-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${t >= 2000 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (t / 2000) * 100)}%` }}/></div><p className="text-stone-700 text-[10px] mt-1 text-right">{t >= 2000 ? `$${(t-2000).toFixed(2)} over threshold` : `$${(2000-t).toFixed(2)} to $2,000`}</p></Card>
            ))}
            <div className="bg-sky-950/20 border border-sky-800/20 rounded-xl px-3.5 py-2.5"><p className="text-sky-400 text-xs font-bold">$2,000 threshold per payer (2026)</p><p className="text-stone-500 text-[10px]">Income is taxable even below this. This tracks when a 1099 form is required.</p></div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================
// MAIN
// ============================================================
export default function GigTabApp() {
  const sbRef = useRef(null); if (!sbRef.current) sbRef.current = getSb(); const supabase = sbRef.current;
  const [user, setUser] = useState(null); const [worker, setWorker] = useState(null); const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session?.user) { setUser(session.user); loadW(session.user); } else setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => { if (session?.user) { setUser(session.user); loadW(session.user); } else { setUser(null); setWorker(null); setLoading(false); } });
    return () => subscription.unsubscribe();
  }, []);

  const loadW = async u => {
    const { data: w } = await supabase.from('workers').select('*').eq('user_id', u.id).limit(1).maybeSingle();
    if (w) { setWorker(w); setLoading(false); return; }
    if (u.email) { const { data: w2 } = await supabase.from('workers').select('*').eq('email', u.email).is('user_id', null).limit(1).maybeSingle(); if (w2) { await supabase.from('workers').update({ user_id: u.id }).eq('id', w2.id); setWorker({ ...w2, user_id: u.id }); setLoading(false); return; } }
    setWorker(false); setLoading(false);
  };
  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setWorker(null); };

  if (loading) return <div className="min-h-screen bg-stone-950 flex items-center justify-center"><div className="animate-pulse text-stone-500 text-sm">Loading...</div></div>;
  if (!user) return <Landing supabase={supabase} />;
  if (worker === false) return <Setup user={user} supabase={supabase} onDone={() => loadW(user)} />;
  if (worker) return <Dashboard worker={worker} supabase={supabase} onUpdate={() => loadW(user)} signOut={signOut} />;
  return null;
}
