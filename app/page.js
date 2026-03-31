'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

function getSupabase() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { flowType: 'implicit' } });
}

// ============================================================
// CONSTANTS + HELPERS
// ============================================================
const CATEGORIES = [
  { key: 'presale', label: 'Presale / Promo', emoji: '📣' },
  { key: 'event', label: 'Event Staff', emoji: '🎪' },
  { key: 'food', label: 'Food Service', emoji: '🍕' },
  { key: 'childcare', label: 'Childcare', emoji: '👶' },
  { key: 'retail', label: 'Retail', emoji: '🛍' },
  { key: 'labor', label: 'General Labor', emoji: '🔧' },
  { key: 'admin', label: 'Admin / Setup', emoji: '📋' },
];
const RADIUS_OPTIONS = [5, 10, 25, 50];
const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtDate = d => { try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); } catch { return d; } };
const fmtTime = d => { try { return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };
function getPayLink(method, handle, amount, note) { const n = encodeURIComponent(note || 'GigTab'); if (method === 'venmo') return `https://venmo.com/${handle}?txn=pay&amount=${amount}&note=${n}`; if (method === 'paypal') return `https://paypal.me/${handle}/${amount}`; if (method === 'cashapp') return `https://cash.app/$${handle}/${amount}`; return null; }
function calcHours(a, b) { if (!a || !b) return 0; return Math.round(((new Date(b) - new Date(a)) / 3600000) * 4) / 4; }
function makeSlug(name) { return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) + Math.random().toString(36).slice(2, 6); }
function copyText(text) { navigator.clipboard?.writeText(text); }

// ============================================================
// UI PRIMITIVES
// ============================================================
const Badge = ({ children, color = 'gray' }) => {
  const c = { gray: 'bg-stone-800 text-stone-400', green: 'bg-emerald-900/60 text-emerald-300', yellow: 'bg-amber-900/50 text-amber-300', red: 'bg-red-900/50 text-red-300', blue: 'bg-sky-900/50 text-sky-300', purple: 'bg-violet-900/50 text-violet-300', orange: 'bg-orange-900/50 text-orange-300' };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c[color]}`}>{children}</span>;
};

function Btn({ children, onClick, v = 'primary', s = 'md', disabled, className = '', href }) {
  const vs = { primary: 'bg-emerald-500 hover:bg-emerald-400 text-black', secondary: 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700', ghost: 'hover:bg-stone-800 text-stone-400', danger: 'bg-red-500/20 text-red-400 border border-red-500/30', venmo: 'bg-[#008CFF] text-white', paypal: 'bg-[#0070BA] text-white', cashapp: 'bg-[#00D632] text-black', marketplace: 'bg-orange-500 hover:bg-orange-400 text-black', google: 'bg-white hover:bg-gray-100 text-gray-800 border border-gray-300' };
  const ss = { sm: 'text-xs px-3 py-1.5', md: 'text-sm px-4 py-2.5', lg: 'text-base px-6 py-3' };
  const cls = `font-semibold rounded-lg transition-all inline-flex items-center justify-center gap-2 cursor-pointer ${vs[v]} ${ss[s]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>;
  return <button onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
}

const Input = ({ label, ...p }) => (<label className="block">{label && <span className="text-[10px] font-bold text-stone-500 mb-1.5 block tracking-wider uppercase">{label}</span>}<input {...p} className={`w-full bg-stone-900 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 ${p.className || ''}`} /></label>);
const Select = ({ label, children, ...p }) => (<label className="block">{label && <span className="text-[10px] font-bold text-stone-500 mb-1.5 block tracking-wider uppercase">{label}</span>}<select {...p} className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none focus:border-emerald-500/50">{children}</select></label>);
const Card = ({ children, className = '' }) => (<div className={`bg-stone-900/80 border border-stone-800 rounded-xl p-4 ${className}`}>{children}</div>);
function Modal({ open, onClose, title, children }) { if (!open) return null; return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}><div className="absolute inset-0 bg-black/70 backdrop-blur-sm" /><div className="relative bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between p-4 border-b border-stone-800"><h3 className="text-base font-bold text-stone-100">{title}</h3><button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-xl cursor-pointer">✕</button></div><div className="p-4">{children}</div></div></div>); }

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  return <button onClick={() => { copyText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="bg-emerald-500 text-black text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer hover:bg-emerald-400 transition-colors">{copied ? 'Copied!' : (label || 'Copy')}</button>;
}

function InviteLinkBox({ url, label }) {
  return (
    <div className="bg-emerald-950/30 border border-emerald-700/30 rounded-xl p-3.5 mb-4">
      <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-2">{label || 'Share Link'}</p>
      <div className="flex gap-2">
        <div className="flex-1 bg-stone-900 rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono truncate">{url}</div>
        <CopyButton text={url} />
      </div>
    </div>
  );
}

const AdBanner = ({ context }) => (<div className="bg-stone-900/50 border border-dashed border-stone-700 rounded-xl px-4 py-3 my-4"><p className="text-stone-600 text-[10px] uppercase tracking-wider font-bold">Sponsored</p><p className="text-stone-400 text-xs mt-0.5">{context === 'tax' ? 'Need help filing 1099s? TurboTax Self-Employed' : context === 'pay' ? 'Ready for real payroll? Try Gusto' : 'Insure your gig workers — Thimble from $5/mo'}</p></div>);

// ============================================================
// AUTH SCREEN
// ============================================================
function AuthScreen({ supabase }) {
  const [mode, setMode] = useState('choose');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const go = async (provider) => { setLoading(true); if (typeof window !== 'undefined') localStorage.setItem('gt_role', mode === 'biz' ? 'admin' : 'worker'); if (provider === 'google') { await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }); } else { const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } }); setLoading(false); if (!error) setSent(true); } };

  if (sent) return (<div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)' }}><div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div><h2 className="text-stone-100 font-bold text-lg mb-2">Check your email</h2><p className="text-stone-500 text-sm text-center">We sent a sign-in link to <span className="text-stone-300">{email}</span></p><button onClick={() => setSent(false)} className="mt-4 text-stone-600 text-sm cursor-pointer hover:text-stone-400">Try again</button></div>);

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)' }}>
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
          <h1 className="text-3xl font-black text-stone-100 tracking-tight">GigTab</h1>
        </div>
        <p className="text-stone-500 text-sm max-w-xs mx-auto">Track shifts, log hours, and get paid instantly. No payroll needed.</p>
      </div>
      {mode === 'choose' ? (
        <div className="w-full max-w-sm space-y-3">
          <Btn onClick={() => setMode('biz')} v="primary" s="lg" className="w-full">I Hire Gig Workers</Btn>
          <Btn onClick={() => setMode('worker')} v="secondary" s="lg" className="w-full">I Am a Gig Worker</Btn>
          <p className="text-stone-600 text-xs text-center mt-4 max-w-xs mx-auto">Businesses: create shifts and pay workers instantly. Workers: set up your payment profile once, use it everywhere.</p>
        </div>
      ) : (
        <Card className="w-full max-w-sm space-y-4">
          <h2 className="text-base font-bold text-stone-200">{mode === 'biz' ? 'Sign in to manage your team' : 'Sign in to get paid'}</h2>
          <p className="text-stone-500 text-xs">{mode === 'biz' ? 'Create shifts, invite workers, track payments and taxes.' : 'Set up your payment profile once. Share one link with any business.'}</p>
          <Btn onClick={() => go('google')} v="google" s="lg" className="w-full" disabled={loading}><svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Continue with Google</Btn>
          <div className="flex items-center gap-3"><div className="flex-1 h-px bg-stone-800"/><span className="text-stone-600 text-xs">or email</span><div className="flex-1 h-px bg-stone-800"/></div>
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={mode === 'biz' ? 'you@company.com' : 'you@email.com'} />
          <Btn onClick={() => go('email')} v="primary" s="lg" className="w-full" disabled={loading || !email}>{loading ? 'Sending...' : 'Send Sign-In Link'}</Btn>
          <button onClick={() => setMode('choose')} className="text-stone-500 text-sm w-full text-center cursor-pointer hover:text-stone-300">Back</button>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// ONBOARDING
// ============================================================
function OnboardingScreen({ user, supabase, onComplete }) {
  const pr = typeof window !== 'undefined' ? localStorage.getItem('gt_role') || 'worker' : 'worker';
  const [role, setRole] = useState(pr);
  const [name, setName] = useState(user.user_metadata?.full_name || '');
  const [bizName, setBizName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!name) return; setLoading(true);
    try {
      if (role === 'admin') {
        if (!bizName || !pin) { setLoading(false); return; }
        const { data: biz } = await supabase.from('businesses').insert({ name: bizName, pin }).select().maybeSingle();
        if (biz) await supabase.from('business_members').insert({ business_id: biz.id, user_id: user.id, role: 'admin', name, email: user.email, can_pay: true });
      } else {
        const slug = makeSlug(name);
        await supabase.from('workers').insert({ user_id: user.id, name, email: user.email, slug, hourly_rate: 15, payment_methods: [], preferred_method: null, marketplace: { enabled: false, radius: 10, categories: [], bio: '', minRate: 12, zip: '' } });
      }
      if (typeof window !== 'undefined') localStorage.removeItem('gt_role');
    } catch (e) { console.error(e); }
    setLoading(false); onComplete();
  };
  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)' }}>
      <Card className="w-full max-w-sm space-y-4">
        <h2 className="text-lg font-bold text-stone-100">Let's set you up</h2>
        <p className="text-stone-500 text-xs">This takes 30 seconds. You only do it once.</p>
        <div className="flex gap-2">
          <button onClick={() => setRole('admin')} className={`flex-1 text-sm font-semibold py-2.5 rounded-lg cursor-pointer ${role === 'admin' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-stone-800 text-stone-500 border border-stone-700'}`}>I Hire People</button>
          <button onClick={() => setRole('worker')} className={`flex-1 text-sm font-semibold py-2.5 rounded-lg cursor-pointer ${role === 'worker' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-stone-800 text-stone-500 border border-stone-700'}`}>I Do Gig Work</button>
        </div>
        <Input label="Your Name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
        {role === 'admin' && (
          <>
            <Input label="Business Name" value={bizName} onChange={e => setBizName(e.target.value)} placeholder="Degree Wellness" />
            <Input label="Team PIN (so your managers can join)" value={pin} onChange={e => setPin(e.target.value)} placeholder="Pick 4-6 digits" type="password" />
          </>
        )}
        {role === 'worker' && (
          <div className="bg-emerald-950/20 border border-emerald-800/20 rounded-lg px-3 py-2.5">
            <p className="text-emerald-400 text-xs font-medium">After setup, you'll get a shareable payment link. Any business can use it to pay you instantly.</p>
          </div>
        )}
        <Btn onClick={submit} v="primary" s="lg" className="w-full" disabled={loading}>{loading ? 'Creating...' : role === 'admin' ? 'Create My Business' : 'Create My Profile'}</Btn>
      </Card>
    </div>
  );
}

// ============================================================
// BIZ SHIFTS TAB
// ============================================================
function BizShiftsTab({ shifts, assignments, workers, allMpWorkers, createShift, deleteShift, inviteWorker, updateAssignment, logHoursForWorker }) {
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ title: '', date: '', start_time: '', end_time: '', hourly_rate: '15', location: '', category: 'presale' });
  const [assigning, setAssigning] = useState(null);
  const [logModal, setLogModal] = useState(null);
  const [lt, setLt] = useState({ start: '', end: '', workerId: '' });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-stone-300 font-semibold text-sm">{shifts.length === 0 ? 'No shifts yet' : `${shifts.length} shift${shifts.length !== 1 ? 's' : ''}`}</h3>
        <Btn onClick={() => setCreating(true)} s="sm">+ New Shift</Btn>
      </div>

      {shifts.length === 0 && (
        <Card className="text-center py-8">
          <p className="text-3xl mb-3">📅</p>
          <p className="text-stone-300 font-semibold mb-1">Create your first shift</p>
          <p className="text-stone-500 text-xs mb-4 max-w-xs mx-auto">A shift is a specific job on a specific day. Create one, then invite workers to it.</p>
          <Btn onClick={() => setCreating(true)} s="md">Create a Shift</Btn>
        </Card>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Create a Shift">
        <div className="space-y-3">
          <Input label="What's the job?" value={f.title} onChange={e => setF({...f, title: e.target.value})} placeholder="Presale at YogaSix Sienna" />
          <Input label="Where?" value={f.location} onChange={e => setF({...f, location: e.target.value})} placeholder="8520 Hwy 6, Sugar Land" />
          <Select label="Category" value={f.category} onChange={e => setF({...f, category: e.target.value})}>{CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}</Select>
          <Input label="Date" type="date" value={f.date} onChange={e => setF({...f, date: e.target.value})} />
          <div className="grid grid-cols-2 gap-3"><Input label="Start" type="time" value={f.start_time} onChange={e => setF({...f, start_time: e.target.value})} /><Input label="End" type="time" value={f.end_time} onChange={e => setF({...f, end_time: e.target.value})} /></div>
          <Input label="Hourly Rate ($)" type="number" value={f.hourly_rate} onChange={e => setF({...f, hourly_rate: e.target.value})} />
          <Btn onClick={async () => { if (!f.title || !f.date) return; await createShift({...f, hourly_rate: parseFloat(f.hourly_rate)}); setF({ title: '', date: '', start_time: '', end_time: '', hourly_rate: '15', location: '', category: 'presale' }); setCreating(false); }} s="lg" className="w-full">Create Shift</Btn>
        </div>
      </Modal>

      <Modal open={!!assigning} onClose={() => setAssigning(null)} title="Invite Workers to This Shift">
        {assigning && <>
          {workers.length > 0 ? workers.map(w => {
            const done = assignments.find(a => a.shift_id === assigning && a.worker_id === w.id);
            return <div key={w.id} className="flex items-center justify-between py-2.5 border-b border-stone-800/50 last:border-0"><div><p className="text-stone-200 text-sm font-medium">{w.name}</p><p className="text-stone-600 text-[10px]">{w.email || ''}</p></div>{done ? <Badge color="green">Invited</Badge> : <Btn onClick={() => inviteWorker(assigning, w.id)} v="secondary" s="sm">Invite</Btn>}</div>;
          }) : <div className="text-center py-4"><p className="text-stone-500 text-sm mb-3">No workers on your roster yet.</p><p className="text-stone-600 text-xs">Add workers in the Workers tab first, then come back to invite them.</p></div>}
        </>}
      </Modal>

      <Modal open={!!logModal} onClose={() => setLogModal(null)} title="Log Hours for a Worker">
        {logModal && <div className="space-y-3">
          <p className="text-stone-500 text-xs">Enter the start and end time. We'll calculate hours and pay automatically.</p>
          <Select label="Worker" value={lt.workerId} onChange={e => setLt({...lt, workerId: e.target.value})}><option value="">Pick a worker...</option>{workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>
          <div className="grid grid-cols-2 gap-3"><Input label="Started at" type="time" value={lt.start} onChange={e => setLt({...lt, start: e.target.value})} /><Input label="Ended at" type="time" value={lt.end} onChange={e => setLt({...lt, end: e.target.value})} /></div>
          {lt.start && lt.end && (() => { const s = shifts.find(x => x.id === logModal); const d = new Date().toISOString().split('T')[0]; const h = calcHours(new Date(`${d}T${lt.start}`), new Date(`${d}T${lt.end}`)); return <div className="bg-sky-950/30 border border-sky-800/30 rounded-lg p-3"><div className="flex justify-between"><span className="text-stone-400 text-sm">{h} hours</span><span className="text-sky-300 font-bold text-lg">{fmt(h * (s?.hourly_rate || 15))}</span></div></div>; })()}
          <Btn onClick={async () => { if (!lt.workerId || !lt.start || !lt.end) return; const d = new Date().toISOString().split('T')[0]; await logHoursForWorker(logModal, lt.workerId, new Date(`${d}T${lt.start}`).toISOString(), new Date(`${d}T${lt.end}`).toISOString()); setLogModal(null); setLt({ start: '', end: '', workerId: '' }); }} s="lg" className="w-full" disabled={!lt.workerId || !lt.start || !lt.end}>Log & Approve</Btn>
        </div>}
      </Modal>

      {shifts.map(shift => {
        const sa = assignments.filter(a => a.shift_id === shift.id);
        const cat = CATEGORIES.find(c => c.key === shift.category);
        return (
          <Card key={shift.id}>
            <div className="mb-2">
              <div className="flex items-center gap-2 flex-wrap"><p className="text-stone-200 font-semibold text-sm">{shift.title}</p>{cat && <Badge color="gray">{cat.emoji} {cat.label}</Badge>}</div>
              <p className="text-stone-500 text-xs mt-0.5">{fmtDate(shift.date)} · {shift.start_time}–{shift.end_time} · {fmt(shift.hourly_rate)}/hr</p>
              {shift.location && <p className="text-stone-600 text-[10px]">{shift.location}</p>}
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <Btn onClick={() => setAssigning(shift.id)} v="primary" s="sm">Invite Workers</Btn>
              <Btn onClick={() => setLogModal(shift.id)} v="secondary" s="sm">Log Hours</Btn>
              <Btn onClick={() => deleteShift(shift.id)} v="ghost" s="sm">Delete</Btn>
            </div>

            {sa.length > 0 && (
              <div className="mt-3 pt-3 border-t border-stone-800 space-y-2">
                <p className="text-stone-600 text-[10px] uppercase tracking-wider font-bold">{sa.length} worker{sa.length !== 1 ? 's' : ''} assigned</p>
                {sa.map(a => {
                  const w = workers.find(x => x.id === a.worker_id) || allMpWorkers.find(x => x.id === a.worker_id);
                  return (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-stone-300">{w?.name || '?'}</span>
                        <Badge color={a.status === 'paid' || a.status === 'approved' ? 'green' : a.status === 'submitted' ? 'purple' : a.status === 'accepted' || a.status === 'clocked-in' ? 'blue' : a.status === 'declined' ? 'red' : 'yellow'}>
                          {a.status}{a.hours_logged ? ` · ${a.hours_logged}h` : ''}
                        </Badge>
                        {a.source === 'marketplace' && <Badge color="orange">Marketplace</Badge>}
                      </div>
                      {a.status === 'submitted' && <Btn onClick={() => updateAssignment(a.id, { status: 'approved', approved_at: new Date().toISOString() })} s="sm">Approve</Btn>}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
      <AdBanner context="shift" />
    </div>
  );
}

// ============================================================
// BIZ WORKERS TAB
// ============================================================
function BizWorkersTab({ workers, payments, addWorker }) {
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: '', email: '', phone: '', hourly_rate: '15' });
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h3 className="text-stone-300 font-semibold text-sm">{workers.length === 0 ? 'No workers yet' : `${workers.length} worker${workers.length !== 1 ? 's' : ''}`}</h3><Btn onClick={() => setAdding(true)} s="sm">+ Add Worker</Btn></div>
      {workers.length === 0 && <Card className="text-center py-8"><p className="text-3xl mb-3">👤</p><p className="text-stone-300 font-semibold mb-1">Add your gig workers</p><p className="text-stone-500 text-xs mb-4 max-w-xs mx-auto">Add the people who work for you. You'll be able to invite them to shifts and track their hours and payments.</p><Btn onClick={() => setAdding(true)}>Add First Worker</Btn></Card>}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add a Worker"><div className="space-y-3"><Input label="Name" value={f.name} onChange={e => setF({...f, name: e.target.value})} placeholder="Jessica Rivera" /><Input label="Email" value={f.email} onChange={e => setF({...f, email: e.target.value})} placeholder="jessica@email.com" /><Input label="Phone" value={f.phone} onChange={e => setF({...f, phone: e.target.value})} placeholder="(555) 123-4567" /><Input label="Hourly Rate ($)" type="number" value={f.hourly_rate} onChange={e => setF({...f, hourly_rate: e.target.value})} /><Btn onClick={async () => { if (!f.name) return; await addWorker({ name: f.name, email: f.email, phone: f.phone, hourly_rate: parseFloat(f.hourly_rate) }); setF({ name: '', email: '', phone: '', hourly_rate: '15' }); setAdding(false); }} s="lg" className="w-full">Add Worker</Btn></div></Modal>
      {workers.map(w => { const paid = payments.filter(p => p.worker_id === w.id).reduce((s, p) => s + p.amount, 0); return <Card key={w.id}><div className="flex justify-between items-center"><div><p className="text-stone-200 font-semibold text-sm">{w.name}</p><p className="text-stone-500 text-xs">{w.email || w.phone || 'No contact info'} · {fmt(w.hourly_rate || 15)}/hr</p>{w.payment_methods?.length > 0 && <p className="text-stone-600 text-[10px] mt-0.5">Payment: {w.payment_methods.map(m => m.type).join(', ')}</p>}</div><div className="text-right"><p className={`text-sm font-bold ${paid >= 600 ? 'text-red-400' : 'text-stone-400'}`}>{fmt(paid)} YTD</p>{paid >= 600 && <p className="text-red-400 text-[10px]">1099 required</p>}</div></div></Card>; })}
    </div>
  );
}

// ============================================================
// BIZ MARKETPLACE TAB
// ============================================================
function BizMarketplaceTab({ shifts, assignments, workers, allMpWorkers, inviteWorker }) {
  const [sel, setSel] = useState(null);
  const [invited, setInvited] = useState(new Set());
  const shift = shifts.find(s => s.id === sel);
  const matching = shift ? allMpWorkers.filter(w => { const eIds = new Set(assignments.filter(a => a.shift_id === shift.id).map(a => a.worker_id)); const rIds = new Set(workers.map(x => x.id)); if (eIds.has(w.id) || rIds.has(w.id)) return false; if (w.marketplace?.minRate > shift.hourly_rate) return false; if (shift.category && w.marketplace?.categories?.length > 0 && !w.marketplace.categories.includes(shift.category)) return false; return true; }) : [];
  return (
    <div className="space-y-4">
      <div><h3 className="text-stone-200 font-bold text-sm mb-1">Find Available Workers</h3><p className="text-stone-500 text-xs">Workers who've opted into the marketplace. $4 per accepted fill.</p></div>
      <Select label="Which shift needs workers?" value={sel || ''} onChange={e => { setSel(e.target.value || null); setInvited(new Set()); }}><option value="">Pick a shift...</option>{shifts.map(s => <option key={s.id} value={s.id}>{s.title} — {fmtDate(s.date)}</option>)}</Select>
      {sel && matching.length > 0 && matching.map(w => { const done = invited.has(w.id); const cats = (w.marketplace?.categories || []).map(c => CATEGORIES.find(x => x.key === c)).filter(Boolean); return <Card key={w.id}><div className="flex justify-between items-start"><div className="flex-1"><div className="flex items-center gap-2 mb-1"><div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-xs font-bold text-orange-400">{w.name.charAt(0)}</div><div><p className="text-stone-200 font-semibold text-sm">{w.name.split(' ')[0]} {w.name.split(' ')[1]?.[0] || ''}.</p><p className="text-stone-600 text-[10px]">{w.marketplace?.zip || 'Houston'} area</p></div></div>{w.marketplace?.bio && <p className="text-stone-400 text-xs mt-1">{w.marketplace.bio}</p>}<div className="flex flex-wrap gap-1 mt-2">{cats.map(c => <span key={c.key} className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400">{c.emoji} {c.label}</span>)}</div></div>{done ? <Badge color="green">Invited</Badge> : <Btn onClick={async () => { await inviteWorker(sel, w.id, 'marketplace'); setInvited(p => new Set([...p, w.id])); }} v="marketplace" s="sm">Invite</Btn>}</div></Card>; })}
      {sel && matching.length === 0 && <Card className="text-center py-6"><p className="text-stone-500 text-sm">No marketplace workers match this shift yet.</p></Card>}
      {!sel && <Card className="text-center py-6"><p className="text-stone-500 text-sm">Select a shift above to see available workers.</p></Card>}
    </div>
  );
}

// ============================================================
// BIZ PAYMENTS TAB
// ============================================================
function BizPaymentsTab({ assignments, shifts, workers, allMpWorkers, payments, markPaid }) {
  const approved = assignments.filter(a => a.status === 'approved');
  return (
    <div className="space-y-5">
      <h3 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Ready to Pay ({approved.length})</h3>
      {approved.length === 0 && <Card className="text-center py-6"><p className="text-stone-500 text-sm">No payments pending. When you approve a worker's hours, they'll appear here with a one-tap pay button.</p></Card>}
      {approved.map(a => { const s = shifts.find(x => x.id === a.shift_id); const w = workers.find(x => x.id === a.worker_id) || allMpWorkers.find(x => x.id === a.worker_id); const amt = a.hours_logged * (s?.hourly_rate || 15); const pm = w?.payment_methods?.find(m => m.type === w.preferred_method) || w?.payment_methods?.[0]; const link = pm ? getPayLink(pm.type, pm.handle, amt, `GigTab - ${w?.name}`) : null;
        return <Card key={a.id} className="mb-3"><div className="flex justify-between items-start mb-3"><div><p className="text-stone-200 font-semibold">{w?.name}</p><p className="text-stone-500 text-xs">{s?.title} · {a.hours_logged} hours</p></div><p className="text-stone-100 font-bold text-lg">{fmt(amt)}</p></div>
        <div className="flex flex-wrap gap-2">{link ? <Btn v={pm.type} s="sm" href={link}>Pay {fmt(amt)} via {pm.type.charAt(0).toUpperCase() + pm.type.slice(1)} →</Btn> : <div className="bg-amber-950/20 border border-amber-800/20 rounded-lg px-3 py-2"><p className="text-amber-400 text-xs">No payment method on file. Ask {w?.name?.split(' ')[0]} to set up their GigTab profile.</p></div>}<Btn onClick={() => markPaid(a)} v="secondary" s="sm">Mark as Paid</Btn></div></Card>; })}
      <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-6">Payment History ({payments.length})</h3>
      {payments.length === 0 && <p className="text-stone-600 text-sm">No payments recorded yet.</p>}
      {payments.map(p => { const w = workers.find(x => x.id === p.worker_id) || allMpWorkers.find(x => x.id === p.worker_id); return <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-stone-800/50 last:border-0"><div><p className="text-stone-300 text-sm">{w?.name}</p><p className="text-stone-600 text-[10px]">{fmtTime(p.paid_at)} · {p.method}</p></div><p className="text-emerald-400 font-semibold text-sm">{fmt(p.amount)}</p></div>; })}
      <AdBanner context="pay" />
    </div>
  );
}

// ============================================================
// BIZ TAX TAB
// ============================================================
function BizTaxTab({ payments, workers, allMpWorkers, biz }) {
  const yr = new Date().getFullYear(); const bw = {}; payments.forEach(p => { if (new Date(p.paid_at).getFullYear() !== yr) return; if (!bw[p.worker_id]) bw[p.worker_id] = { total: 0, count: 0 }; bw[p.worker_id].total += p.amount; bw[p.worker_id].count += 1; });
  const list = Object.entries(bw).map(([id, d]) => ({ ...d, worker: workers.find(w => w.id === id) || allMpWorkers.find(w => w.id === id), id, over: d.total >= 600 })).sort((a, b) => b.total - a.total);
  const tot = list.reduce((s, w) => s + w.total, 0);
  const csv = () => { const r = ['Name,Email,Total,Count,1099 Required', ...list.map(w => `"${w.worker?.name}","${w.worker?.email || ''}",${w.total.toFixed(2)},${w.count},${w.over ? 'YES' : 'NO'}`)].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([r], { type: 'text/csv' })); a.download = `gigtab-tax-${yr}.csv`; a.click(); };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start"><div><h3 className="text-stone-200 font-bold text-sm">Tax Year {yr}</h3><p className="text-stone-500 text-xs">{biz?.name} · {list.length} contractors · {fmt(tot)} total</p></div><Btn onClick={csv} v="secondary" s="sm">Export CSV</Btn></div>
      <div className="bg-sky-950/20 border border-sky-800/20 rounded-xl px-3.5 py-2.5"><p className="text-sky-400 text-xs font-bold">The $600 / 1099 threshold is per company</p><p className="text-stone-500 text-[10px]">Only what your business paid each worker counts.</p></div>
      {list.length === 0 && <Card className="text-center py-6"><p className="text-stone-500 text-sm">No payments this year. Data will appear here as you pay workers.</p></Card>}
      {list.map(w => <Card key={w.id}><div className="flex justify-between items-center mb-2"><div className="flex items-center gap-2"><span className="text-stone-200 text-sm font-bold">{w.worker?.name}</span>{w.over && <Badge color="red">1099 Required</Badge>}</div><span className={`font-bold text-sm ${w.over ? 'text-red-400' : 'text-stone-300'}`}>{fmt(w.total)}</span></div><div className="h-1.5 bg-stone-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${w.over ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (w.total / 600) * 100)}%` }}/></div><div className="flex justify-between mt-1"><span className="text-stone-700 text-[10px]">{w.count} payments</span><span className="text-stone-700 text-[10px]">{w.over ? `$${(w.total-600).toFixed(2)} over threshold` : `$${(600-w.total).toFixed(2)} to $600`}</span></div></Card>)}
      <AdBanner context="tax" />
    </div>
  );
}

// ============================================================
// WORKER SHIFTS TAB
// ============================================================
function WorkerShiftsTab({ assignments, shifts, businesses, payments, updateAssignment, workerClockIn, workerClockOut, workerSubmitHours }) {
  const [logging, setLogging] = useState(null);
  const [hrs, setHrs] = useState('');
  return (
    <div className="space-y-5">
      {assignments.length === 0 && <Card className="text-center py-8"><p className="text-3xl mb-3">📋</p><p className="text-stone-300 font-semibold mb-1">No shifts yet</p><p className="text-stone-500 text-xs max-w-xs mx-auto">When a business invites you to a shift, it'll show up here. Share your GigTab profile link with businesses to get started.</p></Card>}
      {['pending','accepted','clocked-in','submitted','approved','paid'].map(st => {
        const g = assignments.filter(a => a.status === st); if (!g.length) return null;
        const lb = { pending: 'Shift Invitations', accepted: 'Upcoming', 'clocked-in': 'Currently Working', submitted: 'Awaiting Approval', approved: 'Approved', paid: 'Paid' };
        const cl = { pending: 'text-amber-400', accepted: 'text-sky-400', 'clocked-in': 'text-emerald-400', submitted: 'text-violet-400', approved: 'text-emerald-400', paid: 'text-emerald-400' };
        return <div key={st}><h3 className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${cl[st]}`}>{lb[st]}</h3>{g.map(a => {
          const s = shifts.find(x => x.id === a.shift_id); if (!s) return null; const pay = payments.find(p => p.assignment_id === a.id); const r = s.hourly_rate || 15;
          return <Card key={a.id} className="mb-3"><div className="mb-1"><p className="text-stone-200 font-semibold text-sm">{s.title}</p><p className="text-stone-500 text-xs">{businesses.find(b => b.id === s.business_id)?.name} · {fmtDate(s.date)}</p><p className="text-stone-600 text-[10px]">{s.start_time}–{s.end_time} · {fmt(r)}/hr{s.start_time && s.end_time ? ` · Est. ${fmt(calcHours(new Date(`2000-01-01T${s.start_time}`), new Date(`2000-01-01T${s.end_time}`)) * r)}` : ''}</p></div>
          {a.status === 'pending' && <div className="flex gap-2 mt-3"><Btn onClick={() => updateAssignment(a.id, { status: 'accepted' })} s="sm">Accept Shift</Btn><Btn onClick={() => updateAssignment(a.id, { status: 'declined' })} v="ghost" s="sm">Decline</Btn></div>}
          {a.status === 'accepted' && <div className="flex gap-2 mt-3"><Btn onClick={() => workerClockIn(a.id)} s="sm">Clock In</Btn><Btn onClick={() => setLogging(a.id)} v="secondary" s="sm">Enter Hours Manually</Btn></div>}
          {a.status === 'clocked-in' && <div className="mt-3"><p className="text-emerald-400 text-xs mb-2">Clocked in at {new Date(a.clock_in).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p><Btn onClick={() => workerClockOut(a.id)} s="sm">Clock Out</Btn></div>}
          {logging === a.id && <div className="flex gap-2 items-end mt-3"><Input label="Hours worked" type="number" step="0.25" value={hrs} onChange={e => setHrs(e.target.value)} placeholder="3.5" className="w-28" /><Btn onClick={() => { if (!hrs) return; workerSubmitHours(a.id, parseFloat(hrs)); setLogging(null); setHrs(''); }} s="sm">Submit</Btn><Btn onClick={() => setLogging(null)} v="ghost" s="sm">Cancel</Btn></div>}
          {a.hours_logged && ['submitted','approved'].includes(a.status) && <div className="mt-3 bg-stone-800/30 rounded-lg px-3 py-2"><div className="flex justify-between text-sm"><span className="text-stone-400">{a.hours_logged} hrs × {fmt(r)}</span><span className="text-stone-200 font-bold">{fmt(a.hours_logged * r)}</span></div></div>}
          {a.status === 'paid' && pay && <div className="mt-3 bg-emerald-900/20 border border-emerald-800/30 rounded-lg px-3 py-2.5"><div className="flex justify-between text-sm"><span className="text-emerald-400 font-medium">Paid via {pay.method}</span><span className="text-emerald-300 font-bold">{fmt(pay.amount)}</span></div></div>}
          </Card>;
        })}</div>;
      })}
    </div>
  );
}

// ============================================================
// WORKER PROFILE TAB
// ============================================================
function WorkerProfileTab({ worker, payments, businesses, updateWorkerProfile, baseUrl }) {
  const w = worker;
  const [methods, setMethods] = useState(w?.payment_methods || []);
  const [preferred, setPreferred] = useState(w?.preferred_method || null);
  const [adding, setAdding] = useState(false);
  const [nm, setNm] = useState({ type: 'venmo', handle: '' });
  const [phone, setPhone] = useState(w?.phone || '');
  const [mp, setMp] = useState(w?.marketplace || { enabled: false, radius: 10, categories: [], bio: '', minRate: 12, zip: '' });
  if (!w) return <Card className="text-center py-8"><p className="text-stone-500 text-sm">Loading your profile...</p></Card>;
  const save = u => updateWorkerProfile(u);
  const addM = () => { if (!nm.handle) return; const u = [...methods, { ...nm, id: Math.random().toString(36).substr(2,9) }]; setMethods(u); if (!preferred) setPreferred(nm.type); setAdding(false); setNm({ type: 'venmo', handle: '' }); save({ payment_methods: u, preferred_method: preferred || nm.type }); };
  const togCat = k => { const c = mp.categories.includes(k) ? mp.categories.filter(x => x !== k) : [...mp.categories, k]; const u = {...mp, categories: c}; setMp(u); save({ marketplace: u }); };
  const mc = { venmo: '#008CFF', paypal: '#0070BA', cashapp: '#00D632', zelle: '#6D1ED4' };
  const profileUrl = w.slug ? `${baseUrl}/w/${w.slug}` : null;
  const eb = {}; payments.forEach(p => { const b = businesses.find(x => x.id === p.business_id); if (!eb[b?.name || '?']) eb[b?.name || '?'] = 0; eb[b?.name || '?'] += p.amount; });

  return (
    <div className="space-y-5">
      <div><h2 className="text-lg font-bold text-stone-100 mb-0.5">My Payment Profile</h2><p className="text-stone-500 text-xs">Set up your payment methods. Share one link with any business to get paid.</p></div>

      {profileUrl ? (
        <InviteLinkBox url={profileUrl} label="Your GigTab Payment Link" />
      ) : (
        <div className="bg-amber-950/20 border border-amber-800/20 rounded-xl p-3.5"><p className="text-amber-400 text-xs">Your profile link is being set up. It'll appear here shortly.</p></div>
      )}

      <Card><Input label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} onBlur={() => save({ phone })} placeholder="(713) 555-0123" /></Card>

      <Card>
        <div className="flex justify-between items-center mb-3"><span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Payment Methods</span>{methods.length === 0 && <Badge color="yellow">Required</Badge>}</div>
        {methods.length === 0 && !adding && <div className="bg-amber-950/20 border border-amber-800/20 rounded-lg px-3 py-2.5 mb-3"><p className="text-amber-400 text-xs">Add at least one payment method so businesses can pay you.</p></div>}
        {methods.map(m => <div key={m.id} className="flex items-center justify-between py-2.5 border-b border-stone-800/50 last:border-0"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: mc[m.type] }}/><span className="text-stone-200 text-sm capitalize">{m.type}</span><span className="text-stone-500 text-xs">{m.handle}</span>{preferred === m.type && <Badge color="green">Preferred</Badge>}</div><div className="flex gap-2">{preferred !== m.type && <button onClick={() => { setPreferred(m.type); save({ preferred_method: m.type }); }} className="text-[10px] text-stone-500 hover:text-emerald-400 cursor-pointer">Set preferred</button>}<button onClick={() => { const u = methods.filter(x => x.id !== m.id); setMethods(u); save({ payment_methods: u }); }} className="text-[10px] text-stone-600 hover:text-red-400 cursor-pointer">Remove</button></div></div>)}
        {adding ? (
          <div className="mt-3 bg-stone-800/30 rounded-lg p-3 space-y-3">
            <Select label="Platform" value={nm.type} onChange={e => setNm({...nm, type: e.target.value})}><option value="venmo">Venmo</option><option value="paypal">PayPal</option><option value="cashapp">Cash App</option><option value="zelle">Zelle</option></Select>
            <Input label={nm.type === 'zelle' ? 'Your phone number or email for Zelle' : nm.type === 'venmo' ? 'Your Venmo username (without @)' : nm.type === 'cashapp' ? 'Your Cash App $cashtag (without $)' : 'Your PayPal.me username'} value={nm.handle} onChange={e => setNm({...nm, handle: e.target.value})} placeholder={nm.type === 'venmo' ? 'username' : nm.type === 'cashapp' ? 'cashtag' : nm.type === 'zelle' ? '(713) 555-0123' : 'username'} />
            <div className="flex gap-2"><Btn onClick={addM} s="sm">Save</Btn><Btn onClick={() => setAdding(false)} v="ghost" s="sm">Cancel</Btn></div>
          </div>
        ) : <button onClick={() => setAdding(true)} className="mt-3 text-sm text-emerald-400 font-semibold cursor-pointer hover:text-emerald-300">+ Add Payment Method</button>}
      </Card>

      <Card className={mp.enabled ? 'border-orange-800/30' : ''}>
        <div className="flex items-center justify-between mb-3">
          <div><span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Marketplace</span><p className="text-stone-500 text-[10px]">Let new businesses in your area find and hire you</p></div>
          <button onClick={() => { const u = {...mp, enabled: !mp.enabled}; setMp(u); save({ marketplace: u }); }} className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative ${mp.enabled ? 'bg-orange-500' : 'bg-stone-700'}`}><div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform" style={{ left: '2px', transform: mp.enabled ? 'translateX(20px)' : 'translateX(0)' }}/></button>
        </div>
        {mp.enabled && (
          <div className="space-y-4 pt-3 border-t border-stone-800">
            <Input label="Your Zip Code" value={mp.zip} onChange={e => setMp({...mp, zip: e.target.value})} onBlur={() => save({ marketplace: mp })} placeholder="77479" />
            <div><span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-2">How far will you travel?</span><div className="flex gap-2">{RADIUS_OPTIONS.map(r => <button key={r} onClick={() => { const u = {...mp, radius: r}; setMp(u); save({ marketplace: u }); }} className={`flex-1 text-xs font-bold py-2 rounded-lg cursor-pointer ${mp.radius === r ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-stone-800 text-stone-500 border border-stone-700'}`}>{r} mi</button>)}</div></div>
            <div><span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-2">What kind of work?</span><div className="flex flex-wrap gap-1.5">{CATEGORIES.map(c => <button key={c.key} onClick={() => togCat(c.key)} className={`text-xs px-3 py-1.5 rounded-full cursor-pointer ${mp.categories.includes(c.key) ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-stone-800 text-stone-500 border border-stone-700'}`}>{c.emoji} {c.label}</button>)}</div></div>
            <Input label="Minimum hourly rate ($)" type="number" value={mp.minRate} onChange={e => setMp({...mp, minRate: parseFloat(e.target.value) || 0})} onBlur={() => save({ marketplace: mp })} />
            <div><span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1.5">About you (one line)</span><textarea value={mp.bio} onChange={e => setMp({...mp, bio: e.target.value})} onBlur={() => save({ marketplace: mp })} placeholder="Experienced in retail presales and event promotion. Reliable and friendly." className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-orange-500/50 h-20 resize-none"/></div>
          </div>
        )}
      </Card>

      {Object.keys(eb).length > 0 && <Card><span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-3">Earnings by Business ({new Date().getFullYear()})</span>{Object.entries(eb).map(([b, t]) => <div key={b} className="mb-2.5 last:mb-0"><div className="flex justify-between items-center mb-1"><span className="text-stone-300 text-sm">{b}</span><span className="text-stone-200 text-sm font-bold">{fmt(t)}</span></div><div className="h-1 bg-stone-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${t >= 600 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (t/600)*100)}%` }}/></div><p className="text-stone-700 text-[9px] mt-0.5 text-right">{t >= 600 ? `Over $600 with ${b}` : `$${(600-t).toFixed(2)} to $600 with ${b}`}</p></div>)}</Card>}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function GigTabApp() {
  const sbRef = useRef(null); if (!sbRef.current) sbRef.current = getSupabase(); const supabase = sbRef.current;
  const [user, setUser] = useState(null); const [userRole, setUserRole] = useState(null); const [loading, setLoading] = useState(true); const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [businesses, setBusinesses] = useState([]); const [workers, setWorkers] = useState([]); const [shifts, setShifts] = useState([]); const [assignments, setAssignments] = useState([]); const [payments, setPayments] = useState([]); const [allMpWorkers, setAllMpWorkers] = useState([]);
  const [bizTab, setBizTab] = useState('shifts'); const [workerTab, setWorkerTab] = useState('shifts');
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => { supabase.auth.getSession().then(({ data: { session } }) => { if (session?.user) { setUser(session.user); detect(session.user); } else setLoading(false); }); const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => { if (session?.user) { setUser(session.user); detect(session.user); } else { setUser(null); setUserRole(null); setLoading(false); } }); return () => subscription.unsubscribe(); }, []);

  const detect = async u => { try { const { data: m } = await supabase.from('business_members').select('*').eq('user_id', u.id).limit(1).maybeSingle(); if (m) { setUserRole({ role: m.role, businessId: m.business_id, name: m.name }); setLoading(false); return; } const { data: w } = await supabase.from('workers').select('*').eq('user_id', u.id).limit(1).maybeSingle(); if (w) { setUserRole({ role: 'worker', workerId: w.id, name: w.name }); setLoading(false); return; } setNeedsOnboarding(true); setLoading(false); } catch(e) { console.error(e); setNeedsOnboarding(true); setLoading(false); } };

  const loadData = useCallback(async () => { if (!userRole) return; try { if (userRole.role === 'admin' || userRole.role === 'manager') { const bid = userRole.businessId; const { data: bd } = await supabase.from('businesses').select('*').eq('id', bid).maybeSingle(); if (bd) setBusinesses([bd]); const { data: wb } = await supabase.from('worker_businesses').select('worker_id').eq('business_id', bid); const wids = wb?.map(x => x.worker_id) || []; if (wids.length) { const { data: wd } = await supabase.from('workers').select('*').in('id', wids); if (wd) setWorkers(wd); } const { data: sd } = await supabase.from('shifts').select('*').eq('business_id', bid).order('date', { ascending: false }); if (sd) setShifts(sd); const sids = sd?.map(s => s.id) || []; if (sids.length) { const { data: ad } = await supabase.from('shift_assignments').select('*').in('shift_id', sids); if (ad) setAssignments(ad); } const { data: pd } = await supabase.from('payments').select('*').eq('business_id', bid).order('paid_at', { ascending: false }); if (pd) setPayments(pd); const { data: mp } = await supabase.from('workers').select('*'); if (mp) setAllMpWorkers(mp.filter(w => w.marketplace?.enabled)); } else { const wid = userRole.workerId; const { data: wd } = await supabase.from('workers').select('*').eq('id', wid).maybeSingle(); if (wd) setWorkers([wd]); const { data: ad } = await supabase.from('shift_assignments').select('*').eq('worker_id', wid); if (ad) setAssignments(ad); const { data: pd } = await supabase.from('payments').select('*').eq('worker_id', wid); if (pd) setPayments(pd); const { data: sd } = await supabase.from('shifts').select('*'); if (sd) setShifts(sd); const { data: cn } = await supabase.from('worker_businesses').select('business_id').eq('worker_id', wid); if (cn?.length) { const { data: bd } = await supabase.from('businesses').select('*').in('id', cn.map(c => c.business_id)); if (bd) setBusinesses(bd); } } } catch(e) { console.error(e); } }, [userRole]);
  useEffect(() => { if (userRole) loadData(); }, [userRole, loadData]);

  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setUserRole(null); setNeedsOnboarding(false); };
  const createShift = async d => { const { data: s } = await supabase.from('shifts').insert({...d, business_id: userRole.businessId}).select().maybeSingle(); if (s) setShifts(p => [s, ...p]); };
  const deleteShift = async id => { await supabase.from('shifts').delete().eq('id', id); setShifts(p => p.filter(s => s.id !== id)); setAssignments(p => p.filter(a => a.shift_id !== id)); };
  const inviteWorker = async (sid, wid, src = 'direct') => { if (assignments.find(a => a.shift_id === sid && a.worker_id === wid)) return; const { data: a } = await supabase.from('shift_assignments').insert({ shift_id: sid, worker_id: wid, source: src }).select().maybeSingle(); if (a) setAssignments(p => [...p, a]); const s = shifts.find(x => x.id === sid); if (s) await supabase.from('worker_businesses').upsert({ worker_id: wid, business_id: s.business_id }, { onConflict: 'worker_id,business_id' }); };
  const updateAssignment = async (id, u) => { const { data: a } = await supabase.from('shift_assignments').update(u).eq('id', id).select().maybeSingle(); if (a) setAssignments(p => p.map(x => x.id === id ? a : x)); };
  const addWorker = async d => { const { data: w } = await supabase.from('workers').insert({...d, marketplace: { enabled: false, radius: 10, categories: [], bio: '', minRate: 12, zip: '' }}).select().maybeSingle(); if (w) { setWorkers(p => [...p, w]); await supabase.from('worker_businesses').upsert({ worker_id: w.id, business_id: userRole.businessId }, { onConflict: 'worker_id,business_id' }); } };
  const markPaid = async a => { const s = shifts.find(x => x.id === a.shift_id); const w = workers.find(x => x.id === a.worker_id) || allMpWorkers.find(x => x.id === a.worker_id); const amt = a.hours_logged * (s?.hourly_rate || 15); const { data: p } = await supabase.from('payments').insert({ assignment_id: a.id, worker_id: a.worker_id, shift_id: a.shift_id, business_id: userRole.businessId, amount: amt, method: w?.preferred_method || 'venmo' }).select().maybeSingle(); if (p) setPayments(prev => [p, ...prev]); await updateAssignment(a.id, { status: 'paid' }); };
  const logHoursForWorker = async (sid, wid, ci, co) => { const h = calcHours(ci, co); let ex = assignments.find(a => a.shift_id === sid && a.worker_id === wid); if (ex) { await updateAssignment(ex.id, { clock_in: ci, clock_out: co, hours_logged: h, status: 'approved', approved_at: new Date().toISOString() }); } else { const { data: a } = await supabase.from('shift_assignments').insert({ shift_id: sid, worker_id: wid, source: 'direct', clock_in: ci, clock_out: co, hours_logged: h, status: 'approved', approved_at: new Date().toISOString() }).select().maybeSingle(); if (a) setAssignments(p => [...p, a]); const s = shifts.find(x => x.id === sid); if (s) await supabase.from('worker_businesses').upsert({ worker_id: wid, business_id: s.business_id }, { onConflict: 'worker_id,business_id' }); } };
  const updateWorkerProfile = async u => { const { data: w } = await supabase.from('workers').update(u).eq('id', userRole.workerId).select().maybeSingle(); if (w) setWorkers(p => p.map(x => x.id === userRole.workerId ? w : x)); };
  const workerClockIn = async id => { await updateAssignment(id, { clock_in: new Date().toISOString(), status: 'clocked-in' }); };
  const workerClockOut = async id => { const a = assignments.find(x => x.id === id); const co = new Date().toISOString(); await updateAssignment(id, { clock_out: co, hours_logged: calcHours(a.clock_in, co), status: 'submitted' }); };
  const workerSubmitHours = async (id, h) => { await updateAssignment(id, { hours_logged: h, status: 'submitted' }); };

  if (loading) return <div className="min-h-screen bg-stone-950 flex items-center justify-center"><div className="animate-pulse text-stone-500 text-sm">Loading...</div></div>;
  if (!user) return <AuthScreen supabase={supabase} />;
  if (needsOnboarding) return <OnboardingScreen user={user} supabase={supabase} onComplete={() => { setNeedsOnboarding(false); detect(user); }} />;
  if (!userRole) return <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6"><Card className="max-w-sm text-center space-y-4"><p className="text-stone-300">Something went wrong loading your account.</p><Btn onClick={signOut} v="secondary">Sign Out & Try Again</Btn></Card></div>;

  const isBiz = userRole.role === 'admin' || userRole.role === 'manager';

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.03) 0%, transparent 50%)' }}>
      <header className="sticky top-0 z-40 bg-stone-950/80 backdrop-blur-xl border-b border-stone-800/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><span className="font-black text-sm">GigTab</span></div>
          <div className="flex items-center gap-3">
            <span className="text-stone-500 text-xs">{userRole.name}</span>
            <Badge color={isBiz ? 'blue' : 'green'}>{isBiz ? 'Business' : 'Worker'}</Badge>
            <button onClick={signOut} className="text-stone-500 hover:text-red-400 text-xs cursor-pointer transition-colors">Sign Out</button>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-5">
        {isBiz && <>
          <div className="flex gap-1 bg-stone-900 rounded-lg p-1 mb-5">{[{k:'shifts',l:'Shifts'},{k:'workers',l:'Workers'},{k:'marketplace',l:'Find Workers'},{k:'payments',l:'Pay'},{k:'tax',l:'Taxes'}].map(t => <button key={t.k} onClick={() => setBizTab(t.k)} className={`flex-1 text-xs font-semibold px-2 py-2 rounded-md cursor-pointer transition-colors ${bizTab === t.k ? 'bg-stone-800 text-emerald-400' : 'text-stone-500 hover:text-stone-300'}`}>{t.l}</button>)}</div>
          {bizTab === 'shifts' && <BizShiftsTab shifts={shifts} assignments={assignments} workers={workers} allMpWorkers={allMpWorkers} createShift={createShift} deleteShift={deleteShift} inviteWorker={inviteWorker} updateAssignment={updateAssignment} logHoursForWorker={logHoursForWorker} />}
          {bizTab === 'workers' && <BizWorkersTab workers={workers} payments={payments} addWorker={addWorker} />}
          {bizTab === 'marketplace' && <BizMarketplaceTab shifts={shifts} assignments={assignments} workers={workers} allMpWorkers={allMpWorkers} inviteWorker={inviteWorker} />}
          {bizTab === 'payments' && <BizPaymentsTab assignments={assignments} shifts={shifts} workers={workers} allMpWorkers={allMpWorkers} payments={payments} markPaid={markPaid} />}
          {bizTab === 'tax' && <BizTaxTab payments={payments} workers={workers} allMpWorkers={allMpWorkers} biz={businesses[0]} />}
        </>}
        {!isBiz && <>
          <div className="flex gap-1 bg-stone-900 rounded-lg p-1 mb-5">{[{k:'shifts',l:'My Shifts'},{k:'profile',l:'My Profile'}].map(t => <button key={t.k} onClick={() => setWorkerTab(t.k)} className={`flex-1 text-xs font-semibold px-3 py-2 rounded-md cursor-pointer transition-colors ${workerTab === t.k ? 'bg-stone-800 text-emerald-400' : 'text-stone-500'}`}>{t.l}</button>)}</div>
          {workerTab === 'shifts' && <WorkerShiftsTab assignments={assignments} shifts={shifts} businesses={businesses} payments={payments} updateAssignment={updateAssignment} workerClockIn={workerClockIn} workerClockOut={workerClockOut} workerSubmitHours={workerSubmitHours} />}
          {workerTab === 'profile' && <WorkerProfileTab worker={workers[0]} payments={payments} businesses={businesses} updateWorkerProfile={updateWorkerProfile} baseUrl={baseUrl} />}
        </>}
      </main>
    </div>
  );
}
