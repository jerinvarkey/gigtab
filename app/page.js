'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

function getSb() { return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { flowType: 'implicit' } }); }

const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtDate = d => { try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); } catch { return d || ''; } };
function makeSlug(name) { return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) + Math.random().toString(36).slice(2, 6); }
function payLink(method, handle, amount, note) { const n = encodeURIComponent(note || 'GigTab'); if (method === 'venmo') return `https://venmo.com/${handle}?txn=pay&amount=${amount}&note=${n}`; if (method === 'paypal') return `https://paypal.me/${handle}/${amount}`; if (method === 'cashapp') return `https://cash.app/$${handle}/${amount}`; return null; }
function calcHours(s, e) { if (!s || !e) return 0; return Math.round(((new Date(`2000-01-01T${e}`) - new Date(`2000-01-01T${s}`)) / 3600000) * 4) / 4; }

const M = { venmo: { label: 'Venmo', color: '#008CFF' }, paypal: { label: 'PayPal', color: '#0070BA' }, cashapp: { label: 'Cash App', color: '#00D632' }, zelle: { label: 'Zelle', color: '#6D1ED4' } };
const Badge = ({ children, color = 'gray' }) => { const c = { gray: 'bg-stone-800 text-stone-400', green: 'bg-emerald-900/60 text-emerald-300', yellow: 'bg-amber-900/50 text-amber-300', red: 'bg-red-900/50 text-red-300', blue: 'bg-sky-900/50 text-sky-300', purple: 'bg-violet-900/50 text-violet-300' }; return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c[color]}`}>{children}</span>; };
const Card = ({ children, className = '' }) => <div className={`bg-stone-900/80 border border-stone-800 rounded-xl p-4 ${className}`}>{children}</div>;
const Btn = ({ children, onClick, v = 'primary', disabled, className = '' }) => { const vs = { primary: 'bg-emerald-500 hover:bg-emerald-400 text-black', secondary: 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700', ghost: 'text-stone-400 hover:bg-stone-800', danger: 'bg-red-500/20 text-red-400' }; return <button onClick={onClick} disabled={disabled} className={`font-semibold text-sm px-4 py-2.5 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center gap-2 ${vs[v]} ${disabled ? 'opacity-40' : ''} ${className}`}>{children}</button>; };
const Input = ({ label, ...p }) => <label className="block">{label && <span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">{label}</span>}<input {...p} className={`w-full bg-stone-900 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 ${p.className || ''}`} /></label>;
const Select = ({ label, children, ...p }) => <label className="block">{label && <span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">{label}</span>}<select {...p} className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none">{children}</select></label>;
function Modal({ open, onClose, title, children }) { if (!open) return null; return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}><div className="absolute inset-0 bg-black/70 backdrop-blur-sm"/><div className="relative bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between p-4 border-b border-stone-800"><h3 className="text-base font-bold text-stone-100">{title}</h3><button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-xl cursor-pointer">✕</button></div><div className="p-4">{children}</div></div></div>; }

// ============================================================
// LANDING — not signed in
// ============================================================
function Landing({ supabase }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const google = async () => { setLoading(true); await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }); };
  const magic = async () => { if (!email) return; setLoading(true); const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } }); setLoading(false); if (!error) setSent(true); };

  if (sent) return <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)' }}><div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div><h2 className="text-stone-100 font-bold text-lg mb-2">Check your email</h2><p className="text-stone-500 text-sm">We sent a sign-in link to <span className="text-stone-300">{email}</span></p></div>;

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)' }}>
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
          <h1 className="text-3xl font-black text-stone-100">GigTab</h1>
        </div>
        <p className="text-stone-400 text-base font-semibold mb-1">Stop texting people their Venmo amounts.</p>
        <p className="text-stone-600 text-sm max-w-xs mx-auto">One link for your payment info. Anyone can pay you or assign you work. Everything tracked for taxes.</p>
      </div>

      <Card className="w-full max-w-sm space-y-4">
        <h2 className="text-base font-bold text-stone-200 text-center">Get your GigTab link</h2>
        <button onClick={google} disabled={loading} className="w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold text-sm px-4 py-3 rounded-lg border border-gray-300 inline-flex items-center justify-center gap-2 cursor-pointer transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>
        <div className="flex items-center gap-3"><div className="flex-1 h-px bg-stone-800"/><span className="text-stone-600 text-xs">or email</span><div className="flex-1 h-px bg-stone-800"/></div>
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
        <Btn onClick={magic} disabled={loading || !email} className="w-full">{loading ? 'Sending...' : 'Send Sign-In Link'}</Btn>
      </Card>

      <div className="mt-10 max-w-sm mx-auto space-y-4 text-center">
        <p className="text-stone-600 text-xs uppercase tracking-wider font-bold">How it works</p>
        <div className="grid grid-cols-3 gap-4">
          <div><p className="text-2xl mb-1">🔗</p><p className="text-stone-400 text-xs font-semibold">Create your link</p><p className="text-stone-600 text-[10px]">Add your Venmo, PayPal, Zelle</p></div>
          <div><p className="text-2xl mb-1">📱</p><p className="text-stone-400 text-xs font-semibold">Share it</p><p className="text-stone-600 text-[10px]">Text it to anyone who pays you</p></div>
          <div><p className="text-2xl mb-1">💸</p><p className="text-stone-400 text-xs font-semibold">Get paid</p><p className="text-stone-600 text-[10px]">One tap, exact amount, tracked</p></div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SETUP — first time user, create worker profile
// ============================================================
function Setup({ user, supabase, onDone }) {
  const [name, setName] = useState(user.user_metadata?.full_name || '');
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const slug = makeSlug(name);
    await supabase.from('workers').insert({
      user_id: user.id, name: name.trim(), slug, email: user.email,
      payment_methods: [], preferred_method: null,
    });
    setLoading(false);
    onDone();
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)' }}>
      <Card className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center mx-auto mb-3"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
          <h2 className="text-xl font-bold text-stone-100">Let's set up your GigTab</h2>
          <p className="text-stone-500 text-sm mt-1">Takes 10 seconds. You'll get a shareable payment link.</p>
        </div>
        <Input label="What's your name?" value={name} onChange={e => setName(e.target.value)} placeholder="Yalda Rivera" />
        <Btn onClick={create} disabled={loading || !name.trim()} className="w-full">{loading ? 'Creating...' : 'Create My GigTab'}</Btn>
      </Card>
    </div>
  );
}

// ============================================================
// WORKER DASHBOARD
// ============================================================
function WorkerDash({ worker, supabase, onUpdate, signOut }) {
  const [tab, setTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [editing, setEditing] = useState(false);
  const [methods, setMethods] = useState(worker.payment_methods || []);
  const [pref, setPref] = useState(worker.preferred_method || null);
  const [adding, setAdding] = useState(false);
  const [nm, setNm] = useState({ type: 'venmo', handle: '' });
  const [phone, setPhone] = useState(worker.phone || '');
  const [hrs, setHrs] = useState('');
  const [loggingJob, setLoggingJob] = useState(null);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const profileUrl = `${baseUrl}/w/${worker.slug}`;

  useEffect(() => {
    supabase.from('jobs').select('*').eq('worker_id', worker.id).order('created_at', { ascending: false }).then(({ data }) => setJobs(data || []));
    supabase.from('payments').select('*').eq('worker_id', worker.id).order('paid_at', { ascending: false }).then(({ data }) => setPayments(data || []));
  }, [worker.id]);

  const save = async (u) => { await supabase.from('workers').update(u).eq('id', worker.id); onUpdate(); };
  const addMethod = () => { if (!nm.handle) return; const u = [...methods, { ...nm, id: Math.random().toString(36).substr(2, 9) }]; setMethods(u); if (!pref) setPref(nm.type); setAdding(false); setNm({ type: 'venmo', handle: '' }); save({ payment_methods: u, preferred_method: pref || nm.type }); };
  const updateJob = async (id, u) => { await supabase.from('jobs').update(u).eq('id', id); setJobs(prev => prev.map(j => j.id === id ? { ...j, ...u } : j)); };

  const submitHours = (jobId) => {
    if (!hrs) return;
    updateJob(jobId, { hours_logged: parseFloat(hrs), status: 'completed' });
    setLoggingJob(null); setHrs('');
  };

  const copied = useRef(false);
  const [showCopied, setShowCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(profileUrl); setShowCopied(true); setTimeout(() => setShowCopied(false), 2000); };

  const pending = jobs.filter(j => j.status === 'pending');
  const active = jobs.filter(j => ['accepted'].includes(j.status));
  const waitingApproval = jobs.filter(j => j.status === 'completed');
  const ready = jobs.filter(j => j.status === 'approved');
  const done = jobs.filter(j => j.status === 'paid');

  // Tax: per payer
  const yr = new Date().getFullYear();
  const byPayer = {};
  payments.filter(p => new Date(p.paid_at).getFullYear() === yr).forEach(p => {
    const k = p.payer_name || 'Unknown';
    if (!byPayer[k]) byPayer[k] = 0;
    byPayer[k] += p.amount;
  });

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.03) 0%, transparent 50%)' }}>
      <header className="sticky top-0 z-40 bg-stone-950/80 backdrop-blur-xl border-b border-stone-800/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><span className="font-black text-sm">GigTab</span></div>
          <div className="flex items-center gap-3"><span className="text-stone-500 text-xs">{worker.name}</span><button onClick={signOut} className="text-stone-500 hover:text-red-400 text-xs cursor-pointer">Sign Out</button></div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        {/* Share link — always prominent */}
        <div className="bg-emerald-950/30 border border-emerald-700/30 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Your GigTab Link</p>
            {methods.length === 0 && <Badge color="yellow">Add payment method</Badge>}
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-stone-900 rounded-lg px-3 py-2 text-sm text-emerald-300 font-mono truncate">{profileUrl}</div>
            <button onClick={copy} className="bg-emerald-500 text-black text-xs font-bold px-4 rounded-lg cursor-pointer hover:bg-emerald-400">{showCopied ? 'Copied!' : 'Copy'}</button>
          </div>
          <p className="text-stone-600 text-xs mt-2">Text this to anyone who needs to pay you or assign you work.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-stone-900 rounded-lg p-1 mb-5">
          {[{ k: 'jobs', l: 'My Jobs' }, { k: 'profile', l: 'Payment Methods' }, { k: 'earnings', l: 'Earnings' }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} className={`flex-1 text-xs font-semibold py-2 rounded-md cursor-pointer transition-colors ${tab === t.k ? 'bg-stone-800 text-emerald-400' : 'text-stone-500 hover:text-stone-300'}`}>{t.l}</button>
          ))}
        </div>

        {/* JOBS TAB */}
        {tab === 'jobs' && (
          <div className="space-y-5">
            {jobs.length === 0 && (
              <Card className="text-center py-8">
                <p className="text-3xl mb-3">📋</p>
                <p className="text-stone-300 font-semibold mb-1">No jobs yet</p>
                <p className="text-stone-500 text-xs max-w-xs mx-auto mb-4">When someone uses your GigTab link to assign you work, it'll show up here. Share your link to get started.</p>
                <Btn onClick={copy}>{showCopied ? 'Copied!' : 'Copy My Link'}</Btn>
              </Card>
            )}

            {pending.length > 0 && <div><p className="text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-2">New Job Invitations</p>{pending.map(j => (
              <Card key={j.id} className="mb-3">
                <p className="text-stone-200 font-semibold">{j.title}</p>
                <p className="text-stone-500 text-xs">From {j.payer_name} {j.job_date ? `· ${fmtDate(j.job_date)}` : ''}</p>
                {j.start_time && j.end_time && <p className="text-stone-600 text-xs">{j.start_time}–{j.end_time} · {j.hourly_rate ? `${fmt(j.hourly_rate)}/hr` : ''}</p>}
                {j.hourly_rate && j.start_time && j.end_time && <p className="text-emerald-400 text-sm font-bold mt-1">Est. {fmt(calcHours(j.start_time, j.end_time) * j.hourly_rate)}</p>}
                {j.notes && <p className="text-stone-600 text-xs mt-1 italic">"{j.notes}"</p>}
                <div className="flex gap-2 mt-3">
                  <Btn onClick={() => updateJob(j.id, { status: 'accepted' })}>Accept</Btn>
                  <Btn onClick={() => updateJob(j.id, { status: 'declined' })} v="ghost">Decline</Btn>
                </div>
              </Card>
            ))}</div>}

            {active.length > 0 && <div><p className="text-sky-400 text-[10px] font-bold uppercase tracking-wider mb-2">Active Jobs</p>{active.map(j => (
              <Card key={j.id} className="mb-3">
                <p className="text-stone-200 font-semibold">{j.title}</p>
                <p className="text-stone-500 text-xs">From {j.payer_name} {j.job_date ? `· ${fmtDate(j.job_date)}` : ''} {j.hourly_rate ? `· ${fmt(j.hourly_rate)}/hr` : ''}</p>
                {loggingJob === j.id ? (
                  <div className="mt-3 space-y-3">
                    <Input label="Hours worked" type="number" step="0.25" value={hrs} onChange={e => setHrs(e.target.value)} placeholder="3.5" />
                    {hrs && j.hourly_rate && <p className="text-emerald-400 text-sm font-bold">{hrs} hrs × {fmt(j.hourly_rate)} = {fmt(parseFloat(hrs) * j.hourly_rate)}</p>}
                    <div className="flex gap-2"><Btn onClick={() => submitHours(j.id)}>Submit Hours</Btn><Btn onClick={() => setLoggingJob(null)} v="ghost">Cancel</Btn></div>
                  </div>
                ) : (
                  <div className="mt-3"><Btn onClick={() => setLoggingJob(j.id)} v="secondary">Log Hours</Btn></div>
                )}
              </Card>
            ))}</div>}

            {waitingApproval.length > 0 && <div><p className="text-violet-400 text-[10px] font-bold uppercase tracking-wider mb-2">Awaiting Approval</p>{waitingApproval.map(j => (
              <Card key={j.id} className="mb-3">
                <div className="flex justify-between items-center"><div><p className="text-stone-200 font-semibold">{j.title}</p><p className="text-stone-500 text-xs">{j.payer_name} · {j.hours_logged}h submitted</p></div><p className="text-stone-300 font-bold">{j.hourly_rate ? fmt(j.hours_logged * j.hourly_rate) : ''}</p></div>
              </Card>
            ))}</div>}

            {(ready.length > 0 || done.length > 0) && <div><p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-2">Completed</p>{[...ready, ...done].map(j => {
              const pay = payments.find(p => p.job_id === j.id);
              return <Card key={j.id} className="mb-3"><div className="flex justify-between items-center"><div><p className="text-stone-200 font-semibold">{j.title}</p><p className="text-stone-500 text-xs">{j.payer_name} {j.hours_logged ? `· ${j.hours_logged}h` : ''}</p></div><div className="text-right">{pay ? <><p className="text-emerald-400 font-bold">{fmt(pay.amount)}</p><Badge color="green">Paid</Badge></> : <Badge color="yellow">Approved</Badge>}</div></div></Card>;
            })}</div>}
          </div>
        )}

        {/* PROFILE TAB */}
        {tab === 'profile' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-stone-200 font-bold text-sm mb-1">Payment Methods</h3>
              <p className="text-stone-500 text-xs">These show on your public profile. Anyone with your link can use them to pay you.</p>
            </div>

            {methods.length === 0 && !adding && (
              <Card className="text-center py-6 border-amber-800/30">
                <p className="text-amber-400 font-semibold text-sm mb-2">Add a payment method to get paid</p>
                <p className="text-stone-500 text-xs mb-4">Your GigTab link won't work until you add at least one way to receive money.</p>
                <Btn onClick={() => setAdding(true)}>Add Payment Method</Btn>
              </Card>
            )}

            {methods.map(m => (
              <Card key={m.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: M[m.type]?.color }} />
                    <div>
                      <p className="text-stone-200 text-sm font-semibold capitalize">{M[m.type]?.label || m.type}</p>
                      <p className="text-stone-500 text-xs">{m.handle}</p>
                    </div>
                    {pref === m.type && <Badge color="green">Preferred</Badge>}
                  </div>
                  <div className="flex gap-3">
                    {pref !== m.type && <button onClick={() => { setPref(m.type); save({ preferred_method: m.type }); }} className="text-[10px] text-stone-500 hover:text-emerald-400 cursor-pointer">Set preferred</button>}
                    <button onClick={() => { const u = methods.filter(x => x.id !== m.id); setMethods(u); save({ payment_methods: u }); }} className="text-[10px] text-stone-600 hover:text-red-400 cursor-pointer">Remove</button>
                  </div>
                </div>
              </Card>
            ))}

            {adding ? (
              <Card className="space-y-3">
                <Select label="Platform" value={nm.type} onChange={e => setNm({ ...nm, type: e.target.value })}>
                  <option value="venmo">Venmo</option><option value="paypal">PayPal</option><option value="cashapp">Cash App</option><option value="zelle">Zelle</option>
                </Select>
                <Input label={nm.type === 'zelle' ? 'Your Zelle phone or email' : nm.type === 'venmo' ? 'Venmo username (no @)' : nm.type === 'cashapp' ? 'Cash tag (no $)' : 'PayPal.me username'}
                  value={nm.handle} onChange={e => setNm({ ...nm, handle: e.target.value })}
                  placeholder={nm.type === 'venmo' ? 'yalda123' : nm.type === 'zelle' ? '(713) 555-0123' : nm.type === 'cashapp' ? 'yalda' : 'yalda'} />
                <div className="flex gap-2"><Btn onClick={addMethod}>Save</Btn><Btn onClick={() => setAdding(false)} v="ghost">Cancel</Btn></div>
              </Card>
            ) : methods.length > 0 && (
              <button onClick={() => setAdding(true)} className="text-emerald-400 text-sm font-semibold cursor-pointer hover:text-emerald-300">+ Add Another Method</button>
            )}

            <Card>
              <Input label="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} onBlur={() => save({ phone })} placeholder="(713) 555-0123" />
            </Card>
          </div>
        )}

        {/* EARNINGS TAB */}
        {tab === 'earnings' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-stone-200 font-bold text-sm mb-1">Earnings ({yr})</h3>
              <p className="text-stone-500 text-xs">Tracked per payer for tax purposes. 1099 required if a single payer pays you $2,000+ in a year.</p>
            </div>

            {Object.keys(byPayer).length === 0 && <Card className="text-center py-6"><p className="text-stone-500 text-sm">No payments recorded yet. Earnings will appear here as you get paid.</p></Card>}

            {Object.entries(byPayer).sort((a, b) => b[1] - a[1]).map(([payer, total]) => (
              <Card key={payer}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-stone-200 text-sm font-bold">{payer}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${total >= 2000 ? 'text-red-400' : 'text-stone-300'}`}>{fmt(total)}</span>
                    {total >= 2000 && <Badge color="red">1099</Badge>}
                  </div>
                </div>
                <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${total >= 2000 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (total / 2000) * 100)}%` }} />
                </div>
                <p className="text-stone-700 text-[10px] mt-1 text-right">{total >= 2000 ? `$${(total - 2000).toFixed(2)} over $2,000 threshold` : `$${(2000 - total).toFixed(2)} to $2,000 threshold`}</p>
              </Card>
            ))}

            <div className="bg-sky-950/20 border border-sky-800/20 rounded-xl px-3.5 py-2.5">
              <p className="text-sky-400 text-xs font-bold">$2,000 threshold is per payer (updated 2026)</p>
              <p className="text-stone-500 text-[10px]">The income is still taxable even under the threshold. This just tracks when a 1099 form is required.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function GigTabApp() {
  const sbRef = useRef(null); if (!sbRef.current) sbRef.current = getSb(); const supabase = sbRef.current;
  const [user, setUser] = useState(null);
  const [worker, setWorker] = useState(null); // null = not loaded, false = no profile
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); loadWorker(session.user); }
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUser(session.user); loadWorker(session.user); }
      else { setUser(null); setWorker(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadWorker = async (u) => {
    // Check by user_id
    const { data: w } = await supabase.from('workers').select('*').eq('user_id', u.id).limit(1).maybeSingle();
    if (w) { setWorker(w); setLoading(false); return; }
    // Check by email (business may have added them)
    if (u.email) {
      const { data: w2 } = await supabase.from('workers').select('*').eq('email', u.email).is('user_id', null).limit(1).maybeSingle();
      if (w2) {
        // Link this auth user to the existing worker record
        await supabase.from('workers').update({ user_id: u.id }).eq('id', w2.id);
        setWorker({ ...w2, user_id: u.id });
        setLoading(false);
        return;
      }
    }
    setWorker(false); // needs setup
    setLoading(false);
  };

  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setWorker(null); };

  if (loading) return <div className="min-h-screen bg-stone-950 flex items-center justify-center"><div className="animate-pulse text-stone-500 text-sm">Loading...</div></div>;
  if (!user) return <Landing supabase={supabase} />;
  if (worker === false) return <Setup user={user} supabase={supabase} onDone={() => loadWorker(user)} />;
  if (worker) return <WorkerDash worker={worker} supabase={supabase} onUpdate={() => loadWorker(user)} signOut={signOut} />;
  return null;
}
