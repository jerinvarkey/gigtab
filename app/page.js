'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// ============================================================
// SUPABASE CLIENT — implicit flow (no PKCE)
// ============================================================
function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { flowType: 'implicit' } }
  );
}

// ============================================================
// CONSTANTS
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

// ============================================================
// HELPERS
// ============================================================
const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const fmtTime = d => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function getPayLink(method, handle, amount, note) {
  const n = encodeURIComponent(note || 'GigTab Payment');
  if (method === 'venmo') return `https://venmo.com/${handle}?txn=pay&amount=${amount}&note=${n}`;
  if (method === 'paypal') return `https://paypal.me/${handle}/${amount}`;
  if (method === 'cashapp') return `https://cash.app/$${handle}/${amount}`;
  return null;
}

function calcHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0;
  const diff = (new Date(clockOut) - new Date(clockIn)) / (1000 * 60 * 60);
  return Math.round(diff * 4) / 4;
}

// ============================================================
// UI PRIMITIVES
// ============================================================
const Badge = ({ children, color = 'gray' }) => {
  const c = { gray: 'bg-stone-800 text-stone-400', green: 'bg-emerald-900/60 text-emerald-300', yellow: 'bg-amber-900/50 text-amber-300', red: 'bg-red-900/50 text-red-300', blue: 'bg-sky-900/50 text-sky-300', purple: 'bg-violet-900/50 text-violet-300', orange: 'bg-orange-900/50 text-orange-300' };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c[color]}`}>{children}</span>;
};

const Btn = ({ children, onClick, v = 'primary', s = 'md', disabled, className = '', href }) => {
  const variants = {
    primary: 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20',
    secondary: 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700',
    ghost: 'hover:bg-stone-800 text-stone-400',
    venmo: 'bg-[#008CFF] hover:bg-[#0070CC] text-white',
    paypal: 'bg-[#0070BA] hover:bg-[#005A96] text-white',
    cashapp: 'bg-[#00D632] hover:bg-[#00B82A] text-black',
    marketplace: 'bg-orange-500 hover:bg-orange-400 text-black shadow-lg shadow-orange-500/20',
    google: 'bg-white hover:bg-gray-100 text-gray-800 border border-gray-300',
  };
  const sizes = { sm: 'text-xs px-3 py-1.5', md: 'text-sm px-4 py-2.5', lg: 'text-base px-6 py-3' };
  const cls = `font-semibold rounded-lg transition-all inline-flex items-center justify-center gap-2 cursor-pointer ${variants[v]} ${sizes[s]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>;
  return <button onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
};

const Input = ({ label, ...p }) => (
  <label className="block">
    {label && <span className="text-[10px] font-bold text-stone-500 mb-1.5 block tracking-wider uppercase">{label}</span>}
    <input {...p} className={`w-full bg-stone-900 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors ${p.className || ''}`} />
  </label>
);

const Select = ({ label, children, ...p }) => (
  <label className="block">
    {label && <span className="text-[10px] font-bold text-stone-500 mb-1.5 block tracking-wider uppercase">{label}</span>}
    <select {...p} className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors">{children}</select>
  </label>
);

const Card = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-stone-900/80 border border-stone-800 rounded-xl p-4 ${onClick ? 'cursor-pointer hover:border-stone-700 transition-colors' : ''} ${className}`}>{children}</div>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <h3 className="text-base font-bold text-stone-100">{title}</h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-xl cursor-pointer">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

const Empty = ({ icon, title, desc, action }) => (
  <div className="text-center py-12 px-6">
    <div className="text-3xl mb-3 opacity-40">{icon}</div>
    <h3 className="text-stone-300 font-semibold text-sm mb-1">{title}</h3>
    <p className="text-stone-500 text-xs mb-5 max-w-xs mx-auto">{desc}</p>
    {action}
  </div>
);

const AdBanner = ({ context }) => (
  <div className="bg-stone-900/50 border border-dashed border-stone-700 rounded-xl px-4 py-3 my-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-stone-600 text-[10px] uppercase tracking-wider font-bold">Sponsored</p>
        <p className="text-stone-400 text-xs mt-0.5">
          {context === 'tax' ? 'Need help filing 1099s? TurboTax Self-Employed' :
           context === 'pay' ? 'Switch to Gusto payroll when you\'re ready' :
           context === 'shift' ? 'Insure your gig workers — Thimble from $5/mo' :
           'Track mileage for gig work — Everlance'}
        </p>
      </div>
    </div>
  </div>
);

const GigTabLogo = ({ size = 7 }) => (
  <div className={`w-${size} h-${size} rounded-lg bg-emerald-500 flex items-center justify-center`}>
    <svg width={size * 2.2} height={size * 2.2} viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
  </div>
);

// ============================================================
// AUTH SCREEN
// ============================================================
function AuthScreen({ supabase }) {
  const [mode, setMode] = useState('choose'); // choose | biz | worker
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const signInGoogle = async () => {
    setLoading(true);
    // Store intended role before redirect
    if (typeof window !== 'undefined') {
      localStorage.setItem('gigtab_pending_role', mode === 'biz' ? 'admin' : 'worker');
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const signInMagicLink = async () => {
    if (!email) return;
    setLoading(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gigtab_pending_role', mode === 'biz' ? 'admin' : 'worker');
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    setLoading(false);
    if (!error) setSent(true);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)' }}>
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 className="text-stone-100 font-bold text-lg mb-2">Check your email</h2>
        <p className="text-stone-500 text-sm text-center max-w-sm">We sent a sign-in link to <span className="text-stone-300">{email}</span>. Click the link to continue.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)' }}>
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <h1 className="text-3xl font-black text-stone-100 tracking-tight">GigTab</h1>
        </div>
        <p className="text-stone-500 text-sm max-w-sm">Track shifts. Log hours. Get paid instantly.</p>
      </div>

      {mode === 'choose' && (
        <div className="w-full max-w-sm space-y-3">
          <Btn onClick={() => setMode('biz')} v="primary" s="lg" className="w-full">I'm a Business Owner</Btn>
          <Btn onClick={() => setMode('worker')} v="secondary" s="lg" className="w-full">I'm a Gig Worker</Btn>
        </div>
      )}

      {(mode === 'biz' || mode === 'worker') && (
        <Card className="w-full max-w-sm space-y-4">
          <h2 className="text-base font-bold text-stone-200">
            {mode === 'biz' ? 'Sign in as a business' : 'Sign in as a worker'}
          </h2>
          <p className="text-stone-500 text-xs">
            {mode === 'biz' ? 'Manage shifts, workers, and payments.' : 'Set up once, use with any business.'}
          </p>

          <Btn onClick={signInGoogle} v="google" s="lg" className="w-full" disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </Btn>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-stone-800" />
            <span className="text-stone-600 text-xs">or</span>
            <div className="flex-1 h-px bg-stone-800" />
          </div>

          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={mode === 'biz' ? 'jerin@degreewellness.com' : 'jessica@email.com'} />
          <Btn onClick={signInMagicLink} v="primary" s="lg" className="w-full" disabled={loading || !email}>
            {loading ? 'Sending...' : 'Send Sign-In Link'}
          </Btn>

          <button onClick={() => setMode('choose')} className="text-stone-500 text-sm w-full text-center cursor-pointer hover:text-stone-300">Back</button>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// ONBOARDING — runs once after first sign-in
// ============================================================
function OnboardingScreen({ user, supabase, onComplete }) {
  const pendingRole = useRef(null);
  if (typeof window !== 'undefined') {
    pendingRole.current = localStorage.getItem('gigtab_pending_role') || 'worker';
  }
  const [role, setRole] = useState(pendingRole.current);
  const [name, setName] = useState(user.user_metadata?.full_name || '');
  const [bizName, setBizName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name) return;
    setLoading(true);

    if (role === 'admin') {
      if (!bizName || !pin) { setLoading(false); return; }
      // Create business
      const { data: biz } = await supabase.from('businesses').insert({ name: bizName, pin }).select().single();
      if (biz) {
        // Add self as admin member
        await supabase.from('business_members').insert({ business_id: biz.id, user_id: user.id, role: 'admin', name, email: user.email, can_pay: true });
      }
    } else {
      // Create worker profile
      await supabase.from('workers').insert({
        user_id: user.id, name, email: user.email, hourly_rate: 15,
        payment_methods: [], preferred_method: null,
        marketplace: { enabled: false, radius: 10, categories: [], bio: '', minRate: 12, zip: '' }
      });
    }

    if (typeof window !== 'undefined') localStorage.removeItem('gigtab_pending_role');
    setLoading(false);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)' }}>
      <Card className="w-full max-w-sm space-y-4">
        <h2 className="text-lg font-bold text-stone-100">Welcome to GigTab</h2>
        <p className="text-stone-500 text-xs">Let's get you set up.</p>

        <div className="flex gap-2">
          <button onClick={() => setRole('admin')} className={`flex-1 text-sm font-semibold py-2.5 rounded-lg cursor-pointer transition-colors ${role === 'admin' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-stone-800 text-stone-500 border border-stone-700'}`}>Business</button>
          <button onClick={() => setRole('worker')} className={`flex-1 text-sm font-semibold py-2.5 rounded-lg cursor-pointer transition-colors ${role === 'worker' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-stone-800 text-stone-500 border border-stone-700'}`}>Gig Worker</button>
        </div>

        <Input label="Your Name" value={name} onChange={e => setName(e.target.value)} placeholder={role === 'admin' ? 'Jerin' : 'Jessica'} />

        {role === 'admin' && (
          <>
            <Input label="Business Name" value={bizName} onChange={e => setBizName(e.target.value)} placeholder="Degree Wellness" />
            <Input label="Team PIN (managers join with this)" value={pin} onChange={e => setPin(e.target.value)} placeholder="4-6 digits" type="password" />
          </>
        )}

        <Btn onClick={submit} v="primary" s="lg" className="w-full" disabled={loading}>
          {loading ? 'Setting up...' : 'Get Started'}
        </Btn>
      </Card>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function GigTabApp() {
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) supabaseRef.current = getSupabase();
  const supabase = supabaseRef.current;

  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // { role, businessId?, workerId? }
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Data state
  const [businesses, setBusinesses] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [allMarketplaceWorkers, setAllMarketplaceWorkers] = useState([]);

  // UI state
  const [bizTab, setBizTab] = useState('shifts');
  const [workerTab, setWorkerTab] = useState('shifts');

  // ---- AUTH ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        detectRole(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        detectRole(session.user);
      } else {
        setUser(null);
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const detectRole = async (u) => {
    // Check if business member
    const { data: member } = await supabase.from('business_members').select('*').eq('user_id', u.id).limit(1).single();
    if (member) {
      setUserRole({ role: member.role, businessId: member.business_id, memberId: member.id, name: member.name });
      setLoading(false);
      return;
    }
    // Check if worker
    const { data: worker } = await supabase.from('workers').select('*').eq('user_id', u.id).limit(1).single();
    if (worker) {
      setUserRole({ role: 'worker', workerId: worker.id, name: worker.name });
      setLoading(false);
      return;
    }
    // Needs onboarding
    setNeedsOnboarding(true);
    setLoading(false);
  };

  // ---- DATA LOADING ----
  const loadData = useCallback(async () => {
    if (!userRole) return;

    if (userRole.role === 'admin' || userRole.role === 'manager') {
      const bizId = userRole.businessId;
      const [bizRes, workersRes, shiftsRes, assignRes, payRes, mpRes] = await Promise.all([
        supabase.from('businesses').select('*').eq('id', bizId).single(),
        supabase.from('workers').select('*').or(`id.in.(${
          // Get workers connected to this business
          (await supabase.from('worker_businesses').select('worker_id').eq('business_id', bizId)).data?.map(wb => wb.worker_id).join(',') || 'null'
        })`),
        supabase.from('shifts').select('*').eq('business_id', bizId).order('date', { ascending: false }),
        supabase.from('shift_assignments').select('*').in('shift_id',
          (await supabase.from('shifts').select('id').eq('business_id', bizId)).data?.map(s => s.id) || []
        ),
        supabase.from('payments').select('*').eq('business_id', bizId).order('paid_at', { ascending: false }),
        supabase.from('workers').select('*').filter('marketplace->>enabled', 'eq', 'true'),
      ]);

      if (bizRes.data) setBusinesses([bizRes.data]);
      if (workersRes.data) setWorkers(workersRes.data);
      if (shiftsRes.data) setShifts(shiftsRes.data);
      if (assignRes.data) setAssignments(assignRes.data);
      if (payRes.data) setPayments(payRes.data);
      if (mpRes.data) setAllMarketplaceWorkers(mpRes.data);
    } else {
      // Worker
      const wId = userRole.workerId;
      const [workerRes, assignRes, payRes, shiftsRes] = await Promise.all([
        supabase.from('workers').select('*').eq('id', wId).single(),
        supabase.from('shift_assignments').select('*').eq('worker_id', wId),
        supabase.from('payments').select('*').eq('worker_id', wId),
        supabase.from('shifts').select('*'), // RLS filters to assigned shifts
      ]);

      if (workerRes.data) setWorkers([workerRes.data]);
      if (assignRes.data) setAssignments(assignRes.data);
      if (payRes.data) setPayments(payRes.data);
      if (shiftsRes.data) setShifts(shiftsRes.data);

      // Load connected businesses
      const { data: connections } = await supabase.from('worker_businesses').select('business_id').eq('worker_id', wId);
      if (connections?.length) {
        const { data: bizData } = await supabase.from('businesses').select('*').in('id', connections.map(c => c.business_id));
        if (bizData) setBusinesses(bizData);
      }
    }
  }, [userRole]);

  useEffect(() => { if (userRole) loadData(); }, [userRole, loadData]);

  // ---- SIGN OUT ----
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    setNeedsOnboarding(false);
  };

  // ---- LOADING ----
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="animate-pulse text-stone-500 text-sm">Loading...</div>
      </div>
    );
  }

  // ---- NOT SIGNED IN ----
  if (!user) return <AuthScreen supabase={supabase} />;

  // ---- NEEDS ONBOARDING ----
  if (needsOnboarding) {
    return <OnboardingScreen user={user} supabase={supabase} onComplete={() => { setNeedsOnboarding(false); detectRole(user); }} />;
  }

  // ---- SIGNED IN BUT NO ROLE (edge case) ----
  if (!userRole) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6">
        <Card className="max-w-sm text-center space-y-4">
          <p className="text-stone-300">Something went wrong loading your account.</p>
          <Btn onClick={signOut} v="secondary">Sign Out</Btn>
        </Card>
      </div>
    );
  }

  const isBiz = userRole.role === 'admin' || userRole.role === 'manager';
  const isWorker = userRole.role === 'worker';
  const biz = businesses[0];

  // ============================================================
  // BUSINESS FUNCTIONS
  // ============================================================
  const createShift = async (data) => {
    const { data: shift } = await supabase.from('shifts').insert({ ...data, business_id: userRole.businessId }).select().single();
    if (shift) { setShifts(prev => [shift, ...prev]); }
    return shift;
  };

  const deleteShift = async (id) => {
    await supabase.from('shifts').delete().eq('id', id);
    setShifts(prev => prev.filter(s => s.id !== id));
    setAssignments(prev => prev.filter(a => a.shift_id !== id));
  };

  const inviteWorker = async (shiftId, workerId, source = 'direct') => {
    if (assignments.find(a => a.shift_id === shiftId && a.worker_id === workerId)) return;
    const { data: a } = await supabase.from('shift_assignments').insert({ shift_id: shiftId, worker_id: workerId, source }).select().single();
    if (a) setAssignments(prev => [...prev, a]);
    // Ensure worker-business connection
    const shift = shifts.find(s => s.id === shiftId);
    if (shift) {
      await supabase.from('worker_businesses').upsert({ worker_id: workerId, business_id: shift.business_id }, { onConflict: 'worker_id,business_id' });
    }
  };

  const updateAssignment = async (id, updates) => {
    const { data: a } = await supabase.from('shift_assignments').update(updates).eq('id', id).select().single();
    if (a) setAssignments(prev => prev.map(x => x.id === id ? a : x));
  };

  const addWorker = async (data) => {
    const { data: w } = await supabase.from('workers').insert({ ...data, marketplace: { enabled: false, radius: 10, categories: [], bio: '', minRate: 12, zip: '' } }).select().single();
    if (w) {
      setWorkers(prev => [...prev, w]);
      // Connect to business
      await supabase.from('worker_businesses').upsert({ worker_id: w.id, business_id: userRole.businessId }, { onConflict: 'worker_id,business_id' });
    }
    return w;
  };

  const markPaid = async (assignment) => {
    const shift = shifts.find(s => s.id === assignment.shift_id);
    const worker = workers.find(w => w.id === assignment.worker_id);
    const amount = assignment.hours_logged * (shift?.hourly_rate || 15);
    const method = worker?.preferred_method || 'venmo';

    const { data: p } = await supabase.from('payments').insert({
      assignment_id: assignment.id, worker_id: assignment.worker_id,
      shift_id: assignment.shift_id, business_id: userRole.businessId,
      amount, method
    }).select().single();

    if (p) setPayments(prev => [p, ...prev]);
    await updateAssignment(assignment.id, { status: 'paid' });
  };

  const logHoursForWorker = async (shiftId, workerId, clockIn, clockOut) => {
    const hrs = calcHours(clockIn, clockOut);
    let existing = assignments.find(a => a.shift_id === shiftId && a.worker_id === workerId);
    if (existing) {
      await updateAssignment(existing.id, { clock_in: clockIn, clock_out: clockOut, hours_logged: hrs, status: 'approved', approved_at: new Date().toISOString() });
    } else {
      const { data: a } = await supabase.from('shift_assignments').insert({
        shift_id: shiftId, worker_id: workerId, source: 'direct',
        clock_in: clockIn, clock_out: clockOut, hours_logged: hrs,
        status: 'approved', approved_at: new Date().toISOString()
      }).select().single();
      if (a) setAssignments(prev => [...prev, a]);
      // Ensure connection
      const shift = shifts.find(s => s.id === shiftId);
      if (shift) await supabase.from('worker_businesses').upsert({ worker_id: workerId, business_id: shift.business_id }, { onConflict: 'worker_id,business_id' });
    }
  };

  // ============================================================
  // WORKER FUNCTIONS
  // ============================================================
  const updateWorkerProfile = async (updates) => {
    const wId = userRole.workerId;
    const { data: w } = await supabase.from('workers').update(updates).eq('id', wId).select().single();
    if (w) setWorkers(prev => prev.map(x => x.id === wId ? w : x));
  };

  const workerClockIn = async (assignmentId) => {
    await updateAssignment(assignmentId, { clock_in: new Date().toISOString(), status: 'clocked-in' });
  };

  const workerClockOut = async (assignmentId) => {
    const a = assignments.find(x => x.id === assignmentId);
    const co = new Date().toISOString();
    const hrs = calcHours(a.clock_in, co);
    await updateAssignment(assignmentId, { clock_out: co, hours_logged: hrs, status: 'submitted' });
  };

  const workerSubmitHours = async (assignmentId, hours) => {
    await updateAssignment(assignmentId, { hours_logged: hours, status: 'submitted' });
  };

  // ============================================================
  // RENDER — BUSINESS SHIFTS TAB
  // ============================================================
  const renderBizShifts = () => {
    const [creating, setCreating] = useState(false);
    const [f, setF] = useState({ title: '', date: '', start_time: '', end_time: '', hourly_rate: '15', location: '', category: 'presale' });
    const [assigning, setAssigning] = useState(null);
    const [logModal, setLogModal] = useState(null);
    const [logTimes, setLogTimes] = useState({ start: '', end: '', workerId: '' });

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-stone-400 text-xs">{shifts.length} shifts</span>
          <Btn onClick={() => setCreating(true)} s="sm">+ New Shift</Btn>
        </div>

        <Modal open={creating} onClose={() => setCreating(false)} title="Create Shift">
          <div className="space-y-3">
            <Input label="Shift Name" value={f.title} onChange={e => setF({...f, title: e.target.value})} placeholder="Presale at YogaSix" />
            <Input label="Location" value={f.location} onChange={e => setF({...f, location: e.target.value})} placeholder="8520 Hwy 6" />
            <Select label="Category" value={f.category} onChange={e => setF({...f, category: e.target.value})}>
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
            </Select>
            <Input label="Date" type="date" value={f.date} onChange={e => setF({...f, date: e.target.value})} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start" type="time" value={f.start_time} onChange={e => setF({...f, start_time: e.target.value})} />
              <Input label="End" type="time" value={f.end_time} onChange={e => setF({...f, end_time: e.target.value})} />
            </div>
            <Input label="Rate ($)" type="number" value={f.hourly_rate} onChange={e => setF({...f, hourly_rate: e.target.value})} />
            <Btn onClick={async () => {
              await createShift({ ...f, hourly_rate: parseFloat(f.hourly_rate) });
              setF({ title: '', date: '', start_time: '', end_time: '', hourly_rate: '15', location: '', category: 'presale' });
              setCreating(false);
            }} s="lg" className="w-full">Create Shift</Btn>
          </div>
        </Modal>

        <Modal open={!!assigning} onClose={() => setAssigning(null)} title="Invite Worker">
          {assigning && workers.map(w => {
            const assigned = assignments.find(a => a.shift_id === assigning && a.worker_id === w.id);
            return (
              <div key={w.id} className="flex items-center justify-between py-2.5 border-b border-stone-800/50 last:border-0">
                <div><p className="text-stone-200 text-sm font-medium">{w.name}</p><p className="text-stone-500 text-[10px]">{w.email || 'No contact'}</p></div>
                {assigned ? <Badge color="green">Assigned</Badge> : <Btn onClick={() => inviteWorker(assigning, w.id)} v="secondary" s="sm">Invite</Btn>}
              </div>
            );
          })}
          {assigning && workers.length === 0 && <p className="text-stone-500 text-sm">No workers yet. Add them in Workers tab or use Find.</p>}
        </Modal>

        <Modal open={!!logModal} onClose={() => setLogModal(null)} title="Log Hours">
          {logModal && (
            <div className="space-y-3">
              <Select label="Worker" value={logTimes.workerId} onChange={e => setLogTimes({...logTimes, workerId: e.target.value})}>
                <option value="">Select...</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Start" type="time" value={logTimes.start} onChange={e => setLogTimes({...logTimes, start: e.target.value})} />
                <Input label="End" type="time" value={logTimes.end} onChange={e => setLogTimes({...logTimes, end: e.target.value})} />
              </div>
              {logTimes.start && logTimes.end && (() => {
                const shift = shifts.find(s => s.id === logModal);
                const today = new Date().toISOString().split('T')[0];
                const hrs = calcHours(new Date(`${today}T${logTimes.start}`), new Date(`${today}T${logTimes.end}`));
                return (
                  <div className="bg-sky-950/30 border border-sky-800/30 rounded-lg p-3">
                    <div className="flex justify-between"><span className="text-stone-400 text-sm">{hrs} hrs</span><span className="text-sky-300 font-bold">{fmt(hrs * (shift?.hourly_rate || 15))}</span></div>
                  </div>
                );
              })()}
              <Btn onClick={async () => {
                const today = new Date().toISOString().split('T')[0];
                await logHoursForWorker(logModal, logTimes.workerId, new Date(`${today}T${logTimes.start}`).toISOString(), new Date(`${today}T${logTimes.end}`).toISOString());
                setLogModal(null); setLogTimes({ start: '', end: '', workerId: '' });
              }} s="lg" className="w-full">Log & Approve</Btn>
            </div>
          )}
        </Modal>

        {shifts.map(shift => {
          const shiftAssignments = assignments.filter(a => a.shift_id === shift.id);
          const cat = CATEGORIES.find(c => c.key === shift.category);
          return (
            <Card key={shift.id}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-stone-200 font-semibold text-sm">{shift.title}</p>
                    {cat && <Badge color="gray">{cat.emoji} {cat.label}</Badge>}
                  </div>
                  <p className="text-stone-500 text-xs mt-0.5">{fmtDate(shift.date)} · {shift.start_time}–{shift.end_time} · {fmt(shift.hourly_rate)}/hr</p>
                  {shift.location && <p className="text-stone-600 text-[10px]">{shift.location}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Btn onClick={() => setAssigning(shift.id)} v="secondary" s="sm">Invite</Btn>
                <Btn onClick={() => setLogModal(shift.id)} v="secondary" s="sm">Log Hours</Btn>
                <Btn onClick={() => deleteShift(shift.id)} v="ghost" s="sm">Delete</Btn>
              </div>
              {shiftAssignments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-stone-800 space-y-1.5">
                  {shiftAssignments.map(a => {
                    const w = workers.find(x => x.id === a.worker_id) || allMarketplaceWorkers.find(x => x.id === a.worker_id);
                    return (
                      <div key={a.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-stone-300">{w?.name || 'Unknown'}</span>
                          <Badge color={a.status === 'paid' ? 'green' : a.status === 'approved' ? 'green' : a.status === 'submitted' ? 'purple' : a.status === 'clocked-in' ? 'green' : a.status === 'accepted' ? 'blue' : a.status === 'declined' ? 'red' : 'yellow'}>
                            {a.status}{a.hours_logged ? ` · ${a.hours_logged}h` : ''}
                          </Badge>
                          {a.source === 'marketplace' && <Badge color="orange">Mkt</Badge>}
                        </div>
                        {a.status === 'submitted' && (
                          <Btn onClick={() => updateAssignment(a.id, { status: 'approved', approved_at: new Date().toISOString() })} s="sm">Approve</Btn>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
        {shifts.length === 0 && <Empty icon="📅" title="No shifts" desc="Create your first shift." action={<Btn onClick={() => setCreating(true)} s="sm">Create Shift</Btn>} />}
        <AdBanner context="shift" />
      </div>
    );
  };

  // ============================================================
  // RENDER — BUSINESS MARKETPLACE TAB
  // ============================================================
  const renderBizMarketplace = () => {
    const [selectedShift, setSelectedShift] = useState(null);
    const [invited, setInvited] = useState(new Set());

    const getMatching = (shift) => {
      if (!shift) return [];
      const existingIds = new Set(assignments.filter(a => a.shift_id === shift.id).map(a => a.worker_id));
      const rosterIds = new Set(workers.map(w => w.id));
      return allMarketplaceWorkers.filter(w => {
        if (existingIds.has(w.id) || rosterIds.has(w.id)) return false;
        if (w.marketplace?.minRate > shift.hourly_rate) return false;
        if (shift.category && w.marketplace?.categories?.length > 0 && !w.marketplace.categories.includes(shift.category)) return false;
        return true;
      });
    };

    const shift = shifts.find(s => s.id === selectedShift);
    const matching = shift ? getMatching(shift) : [];

    return (
      <div className="space-y-4">
        <div><h3 className="text-stone-200 font-bold text-sm mb-1">Find Available Workers</h3><p className="text-stone-500 text-xs">$4 per accepted marketplace fill.</p></div>
        <Select label="Select shift to fill" value={selectedShift || ''} onChange={e => { setSelectedShift(e.target.value || null); setInvited(new Set()); }}>
          <option value="">Choose...</option>
          {shifts.map(s => <option key={s.id} value={s.id}>{s.title} — {fmtDate(s.date)}</option>)}
        </Select>
        {selectedShift && shift && (
          <>
            <div className="bg-stone-800/30 rounded-lg px-3.5 py-2.5">
              <p className="text-stone-400 text-xs">Showing workers for <span className="text-stone-200 font-medium">{CATEGORIES.find(c => c.key === shift.category)?.label || 'any role'}</span> at {fmt(shift.hourly_rate)}/hr+</p>
            </div>
            {matching.length > 0 ? matching.map(w => {
              const totalShifts = assignments.filter(a => a.worker_id === w.id && ['approved', 'paid'].includes(a.status)).length;
              const cats = (w.marketplace?.categories || []).map(c => CATEGORIES.find(x => x.key === c)).filter(Boolean);
              const done = invited.has(w.id);
              return (
                <Card key={w.id}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-xs font-bold text-orange-400">{w.name.charAt(0)}</div>
                        <div>
                          <p className="text-stone-200 font-semibold text-sm">{w.name.split(' ')[0]} {w.name.split(' ')[1]?.[0] || ''}.</p>
                          <p className="text-stone-600 text-[10px]">{w.marketplace?.zip ? `${w.marketplace.zip} area` : 'Houston'} · {totalShifts} shifts</p>
                        </div>
                      </div>
                      {w.marketplace?.bio && <p className="text-stone-400 text-xs mt-1">{w.marketplace.bio}</p>}
                      <div className="flex flex-wrap gap-1 mt-2">{cats.map(c => <span key={c.key} className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400">{c.emoji} {c.label}</span>)}</div>
                    </div>
                    <div className="ml-3">
                      {done ? <Badge color="green">Invited</Badge> : <Btn onClick={async () => { await inviteWorker(selectedShift, w.id, 'marketplace'); setInvited(prev => new Set([...prev, w.id])); }} v="marketplace" s="sm">Invite</Btn>}
                    </div>
                  </div>
                </Card>
              );
            }) : <Empty icon="🔍" title="No matches" desc="No marketplace workers match this shift." />}
            <div className="bg-orange-950/20 border border-orange-800/20 rounded-xl px-3.5 py-2.5">
              <p className="text-orange-400 text-xs font-bold">Fill Fee: $4/accepted</p>
              <p className="text-stone-500 text-[10px]">Direct roster invites are free.</p>
            </div>
          </>
        )}
        {!selectedShift && <Empty icon="🔍" title="Select a shift" desc="Pick a shift to see available workers." />}
      </div>
    );
  };

  // ============================================================
  // RENDER — BUSINESS PAYMENTS TAB
  // ============================================================
  const renderBizPayments = () => {
    const approved = assignments.filter(a => a.status === 'approved');
    return (
      <div className="space-y-5">
        <h3 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Ready to Pay ({approved.length})</h3>
        {approved.map(a => {
          const shift = shifts.find(s => s.id === a.shift_id);
          const w = workers.find(x => x.id === a.worker_id) || allMarketplaceWorkers.find(x => x.id === a.worker_id);
          const amount = a.hours_logged * (shift?.hourly_rate || 15);
          const pm = w?.payment_methods?.find(m => m.type === w.preferred_method) || w?.payment_methods?.[0];
          const link = pm ? getPayLink(pm.type, pm.handle, amount, `GigTab - ${w?.name}`) : null;
          return (
            <Card key={a.id} className="mb-3">
              <div className="flex justify-between items-start mb-3">
                <div><p className="text-stone-200 font-semibold">{w?.name}</p><p className="text-stone-500 text-xs">{shift?.title} · {a.hours_logged}h</p></div>
                <p className="text-stone-100 font-bold text-lg">{fmt(amount)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {link ? <Btn v={pm.type} s="sm" href={link}>Pay {fmt(amount)} via {pm.type}</Btn> : <p className="text-stone-500 text-xs">No payment method</p>}
                <Btn onClick={() => markPaid(a)} v="secondary" s="sm">Mark Paid</Btn>
              </div>
            </Card>
          );
        })}
        {approved.length === 0 && <p className="text-stone-600 text-sm">No pending payments.</p>}

        <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">History</h3>
        {payments.map(p => {
          const w = workers.find(x => x.id === p.worker_id) || allMarketplaceWorkers.find(x => x.id === p.worker_id);
          return (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-stone-800/50 last:border-0">
              <div><p className="text-stone-300 text-sm">{w?.name}</p><p className="text-stone-600 text-[10px]">{fmtTime(p.paid_at)} · {p.method}</p></div>
              <p className="text-emerald-400 font-semibold text-sm">{fmt(p.amount)}</p>
            </div>
          );
        })}
        <AdBanner context="pay" />
      </div>
    );
  };

  // ============================================================
  // RENDER — BUSINESS TAX TAB
  // ============================================================
  const renderBizTax = () => {
    const year = new Date().getFullYear();
    const byWorker = {};
    payments.forEach(p => {
      if (new Date(p.paid_at).getFullYear() !== year) return;
      if (!byWorker[p.worker_id]) byWorker[p.worker_id] = { total: 0, count: 0 };
      byWorker[p.worker_id].total += p.amount;
      byWorker[p.worker_id].count += 1;
    });
    const list = Object.entries(byWorker).map(([wId, d]) => ({ ...d, worker: workers.find(w => w.id === wId) || allMarketplaceWorkers.find(w => w.id === wId), wId, over: d.total >= 600 })).sort((a, b) => b.total - a.total);
    const total = list.reduce((s, w) => s + w.total, 0);

    const exportCSV = () => {
      const rows = ['Name,Email,Phone,Total,Payments,1099', ...list.map(w => `"${w.worker?.name}","${w.worker?.email || ''}","${w.worker?.phone || ''}",${w.total.toFixed(2)},${w.count},${w.over ? 'YES' : 'NO'}`)].join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows], { type: 'text/csv' })); a.download = `gigtab-tax-${year}.csv`; a.click();
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div><h3 className="text-stone-200 font-bold text-sm">{year}</h3><p className="text-stone-500 text-xs">{biz?.name} · {list.length} contractors · {fmt(total)}</p></div>
          <Btn onClick={exportCSV} v="secondary" s="sm">CSV</Btn>
        </div>
        <div className="bg-sky-950/20 border border-sky-800/20 rounded-xl px-3.5 py-2.5">
          <p className="text-sky-400 text-xs font-bold">$600 threshold is per company</p>
        </div>
        {list.map(w => (
          <Card key={w.wId}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2"><span className="text-stone-200 text-sm font-bold">{w.worker?.name}</span>{w.over && <Badge color="red">1099</Badge>}</div>
              <span className={`font-bold text-sm ${w.over ? 'text-red-400' : 'text-stone-300'}`}>{fmt(w.total)}</span>
            </div>
            <div className="h-1 bg-stone-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${w.over ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (w.total / 600) * 100)}%` }} /></div>
            <p className="text-stone-700 text-[10px] mt-1 text-right">{w.over ? `$${(w.total - 600).toFixed(2)} over` : `$${(600 - w.total).toFixed(2)} to $600`}</p>
          </Card>
        ))}
        {list.length === 0 && <Empty icon="📊" title="No payments" desc="Data shows up as you pay." />}
        <AdBanner context="tax" />
      </div>
    );
  };

  // ============================================================
  // RENDER — WORKER SHIFTS
  // ============================================================
  const renderWorkerShifts = () => {
    const [logging, setLogging] = useState(null);
    const [hrs, setHrs] = useState('');
    const w = workers[0];

    return (
      <div className="space-y-5">
        <h2 className="text-lg font-bold text-stone-100">My Shifts</h2>
        {['pending', 'accepted', 'clocked-in', 'submitted', 'approved', 'paid'].map(status => {
          const group = assignments.filter(a => a.status === status);
          if (!group.length) return null;
          const labels = { pending: 'Invitations', accepted: 'Active', 'clocked-in': 'Clocked In', submitted: 'Awaiting Approval', approved: 'Approved', paid: 'Paid' };
          const colors = { pending: 'text-amber-400', accepted: 'text-sky-400', 'clocked-in': 'text-emerald-400', submitted: 'text-violet-400', approved: 'text-emerald-400', paid: 'text-emerald-400' };
          return (
            <div key={status}>
              <h3 className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${colors[status]}`}>{labels[status]}</h3>
              {group.map(a => {
                const shift = shifts.find(s => s.id === a.shift_id);
                if (!shift) return null;
                const payment = payments.find(p => p.assignment_id === a.id);
                const rate = shift.hourly_rate || 15;
                return (
                  <Card key={a.id} className="mb-3">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <p className="text-stone-200 font-semibold text-sm">{shift.title}</p>
                        <p className="text-stone-500 text-xs">{businesses.find(b => b.id === shift.business_id)?.name} · {fmtDate(shift.date)}</p>
                        <p className="text-stone-600 text-[10px]">{shift.start_time}–{shift.end_time} · {fmt(rate)}/hr</p>
                      </div>
                    </div>
                    {a.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <Btn onClick={() => updateAssignment(a.id, { status: 'accepted' })} s="sm">Accept</Btn>
                        <Btn onClick={() => updateAssignment(a.id, { status: 'declined' })} v="ghost" s="sm">Decline</Btn>
                      </div>
                    )}
                    {a.status === 'accepted' && (
                      <div className="flex gap-2 mt-3">
                        <Btn onClick={() => workerClockIn(a.id)} s="sm">Clock In</Btn>
                        <Btn onClick={() => setLogging(a.id)} v="secondary" s="sm">Enter Manually</Btn>
                      </div>
                    )}
                    {a.status === 'clocked-in' && (
                      <div className="mt-3">
                        <p className="text-emerald-400 text-xs mb-2">In since {new Date(a.clock_in).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                        <Btn onClick={() => workerClockOut(a.id)} s="sm">Clock Out</Btn>
                      </div>
                    )}
                    {logging === a.id && (
                      <div className="flex gap-2 items-end mt-3">
                        <Input label="Hours" type="number" step="0.25" value={hrs} onChange={e => setHrs(e.target.value)} className="w-24" />
                        <Btn onClick={() => { workerSubmitHours(a.id, parseFloat(hrs)); setLogging(null); setHrs(''); }} s="sm">Submit</Btn>
                        <Btn onClick={() => setLogging(null)} v="ghost" s="sm">Cancel</Btn>
                      </div>
                    )}
                    {a.hours_logged && ['submitted', 'approved'].includes(a.status) && (
                      <div className="mt-3 bg-stone-800/30 rounded-lg px-3 py-2">
                        <div className="flex justify-between text-sm"><span className="text-stone-400">{a.hours_logged}h × {fmt(rate)}</span><span className="text-stone-200 font-bold">{fmt(a.hours_logged * rate)}</span></div>
                      </div>
                    )}
                    {a.status === 'paid' && payment && (
                      <div className="mt-3 bg-emerald-900/20 border border-emerald-800/30 rounded-lg px-3 py-2">
                        <div className="flex justify-between text-sm"><span className="text-emerald-400">Paid via {payment.method}</span><span className="text-emerald-300 font-bold">{fmt(payment.amount)}</span></div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          );
        })}
        {assignments.length === 0 && <Empty icon="📋" title="No shifts yet" desc="Shifts show up when a business invites you." />}
        <AdBanner context="worker" />
      </div>
    );
  };

  // ============================================================
  // RENDER — WORKER PROFILE
  // ============================================================
  const renderWorkerProfile = () => {
    const w = workers[0];
    if (!w) return <Empty icon="⏳" title="Loading..." desc="" />;
    const [methods, setMethods] = useState(w.payment_methods || []);
    const [preferred, setPreferred] = useState(w.preferred_method || null);
    const [adding, setAdding] = useState(false);
    const [nm, setNm] = useState({ type: 'venmo', handle: '' });
    const [phone, setPhone] = useState(w.phone || '');
    const [mp, setMp] = useState(w.marketplace || { enabled: false, radius: 10, categories: [], bio: '', minRate: 12, zip: '' });

    const save = (updates) => updateWorkerProfile(updates);

    const addMethod = () => {
      if (!nm.handle) return;
      const updated = [...methods, { ...nm, id: Math.random().toString(36).substr(2, 9) }];
      setMethods(updated);
      if (!preferred) setPreferred(nm.type);
      setAdding(false); setNm({ type: 'venmo', handle: '' });
      save({ payment_methods: updated, preferred_method: preferred || nm.type });
    };

    const toggleCat = (key) => {
      const cats = mp.categories.includes(key) ? mp.categories.filter(c => c !== key) : [...mp.categories, key];
      const updated = { ...mp, categories: cats };
      setMp(updated);
      save({ marketplace: updated });
    };

    const methodColors = { venmo: '#008CFF', paypal: '#0070BA', cashapp: '#00D632', zelle: '#6D1ED4' };

    // Per-company earnings
    const earningsByBiz = {};
    payments.forEach(p => {
      const b = businesses.find(x => x.id === p.business_id);
      const name = b?.name || 'Unknown';
      if (!earningsByBiz[name]) earningsByBiz[name] = 0;
      earningsByBiz[name] += p.amount;
    });

    return (
      <div className="space-y-5">
        <div><h2 className="text-lg font-bold text-stone-100 mb-0.5">My Profile</h2><p className="text-stone-500 text-xs">gigtab.app/w/{w.name?.toLowerCase().replace(/\s/g, '')}</p></div>

        <div className="bg-emerald-950/30 border border-emerald-700/30 rounded-xl p-3.5">
          <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-2">Your GigTab Link</p>
          <div className="flex gap-2">
            <div className="flex-1 bg-stone-900 rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono truncate">gigtab.app/w/{w.name?.toLowerCase().replace(/\s/g, '')}</div>
            <Btn v="primary" s="sm" onClick={() => navigator.clipboard?.writeText(`gigtab.app/w/${w.name?.toLowerCase().replace(/\s/g, '')}`)}>Copy</Btn>
          </div>
        </div>

        <Card>
          <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} onBlur={() => save({ phone })} placeholder="(713) 555-0123" />
        </Card>

        <Card>
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-3">Payment Methods</span>
          {methods.map(m => (
            <div key={m.id} className="flex items-center justify-between py-2 border-b border-stone-800/50 last:border-0">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: methodColors[m.type] }} /><span className="text-stone-200 text-sm capitalize">{m.type}</span><span className="text-stone-500 text-xs">{m.handle}</span>{preferred === m.type && <Badge color="green">Preferred</Badge>}</div>
              <div className="flex gap-2">
                {preferred !== m.type && <button onClick={() => { setPreferred(m.type); save({ preferred_method: m.type }); }} className="text-[10px] text-stone-500 hover:text-emerald-400 cursor-pointer">Prefer</button>}
                <button onClick={() => { const u = methods.filter(x => x.id !== m.id); setMethods(u); save({ payment_methods: u }); }} className="text-[10px] text-stone-600 hover:text-red-400 cursor-pointer">Remove</button>
              </div>
            </div>
          ))}
          {adding ? (
            <div className="mt-3 bg-stone-800/30 rounded-lg p-3 space-y-3">
              <Select value={nm.type} onChange={e => setNm({...nm, type: e.target.value})}><option value="venmo">Venmo</option><option value="paypal">PayPal</option><option value="cashapp">Cash App</option><option value="zelle">Zelle</option></Select>
              <Input value={nm.handle} onChange={e => setNm({...nm, handle: e.target.value})} placeholder={nm.type === 'zelle' ? 'Phone or email' : 'Username'} />
              <div className="flex gap-2"><Btn onClick={addMethod} s="sm">Add</Btn><Btn onClick={() => setAdding(false)} v="ghost" s="sm">Cancel</Btn></div>
            </div>
          ) : <button onClick={() => setAdding(true)} className="mt-3 text-xs text-emerald-400 font-medium cursor-pointer">+ Add method</button>}
        </Card>

        <Card className={mp.enabled ? 'border-orange-800/30' : ''}>
          <div className="flex items-center justify-between mb-3">
            <div><span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Marketplace</span><p className="text-stone-500 text-[10px]">Get gig invites from new businesses</p></div>
            <button onClick={() => { const u = { ...mp, enabled: !mp.enabled }; setMp(u); save({ marketplace: u }); }}
              className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative ${mp.enabled ? 'bg-orange-500' : 'bg-stone-700'}`}>
              <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform" style={{ left: '2px', transform: mp.enabled ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
          </div>
          {mp.enabled && (
            <div className="space-y-4 pt-3 border-t border-stone-800">
              <Input label="Zip Code" value={mp.zip} onChange={e => setMp({...mp, zip: e.target.value})} onBlur={() => save({ marketplace: mp })} placeholder="77479" />
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-2">Radius</span>
                <div className="flex gap-2">{RADIUS_OPTIONS.map(r => (
                  <button key={r} onClick={() => { const u = {...mp, radius: r}; setMp(u); save({ marketplace: u }); }}
                    className={`flex-1 text-xs font-bold py-2 rounded-lg cursor-pointer ${mp.radius === r ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-stone-800 text-stone-500 border border-stone-700'}`}>{r} mi</button>
                ))}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-2">Open to</span>
                <div className="flex flex-wrap gap-1.5">{CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => toggleCat(c.key)}
                    className={`text-xs px-3 py-1.5 rounded-full cursor-pointer ${mp.categories.includes(c.key) ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-stone-800 text-stone-500 border border-stone-700'}`}>{c.emoji} {c.label}</button>
                ))}</div>
              </div>
              <Input label="Min Rate ($/hr)" type="number" value={mp.minRate} onChange={e => setMp({...mp, minRate: parseFloat(e.target.value) || 0})} onBlur={() => save({ marketplace: mp })} />
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1.5">Bio</span>
                <textarea value={mp.bio} onChange={e => setMp({...mp, bio: e.target.value})} onBlur={() => save({ marketplace: mp })}
                  placeholder="Experienced in retail presales. Reliable and friendly."
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-orange-500/50 h-20 resize-none" />
              </div>
            </div>
          )}
        </Card>

        {Object.keys(earningsByBiz).length > 0 && (
          <Card>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-3">Earnings by Business ({new Date().getFullYear()})</span>
            {Object.entries(earningsByBiz).map(([biz, total]) => (
              <div key={biz} className="mb-2.5 last:mb-0">
                <div className="flex justify-between items-center mb-1"><span className="text-stone-300 text-sm">{biz}</span><span className="text-stone-200 text-sm font-bold">{fmt(total)}</span></div>
                <div className="h-1 bg-stone-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${total >= 600 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (total / 600) * 100)}%` }} /></div>
                <p className="text-stone-700 text-[9px] mt-0.5 text-right">{total >= 600 ? `Over $600 with ${biz}` : `$${(600 - total).toFixed(2)} to $600 with ${biz}`}</p>
              </div>
            ))}
          </Card>
        )}
      </div>
    );
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.03) 0%, transparent 50%)' }}>
      <header className="sticky top-0 z-40 bg-stone-950/80 backdrop-blur-xl border-b border-stone-800/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <span className="font-black text-sm">GigTab</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-stone-500 text-xs">{userRole.name}</span>
            <Badge color={isBiz ? 'blue' : 'green'}>{userRole.role}</Badge>
            <button onClick={signOut} className="text-stone-600 hover:text-stone-300 text-xs cursor-pointer">Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        {isBiz && (
          <>
            <div className="flex gap-1 bg-stone-900 rounded-lg p-1 mb-5">
              {[{ k: 'shifts', l: 'Shifts' }, { k: 'workers', l: 'Workers' }, { k: 'marketplace', l: 'Find' }, { k: 'payments', l: 'Pay' }, { k: 'tax', l: 'Tax' }].map(t => (
                <button key={t.k} onClick={() => setBizTab(t.k)}
                  className={`flex-1 text-xs font-semibold px-2 py-2 rounded-md cursor-pointer transition-colors ${bizTab === t.k ? 'bg-stone-800 text-emerald-400' : 'text-stone-500 hover:text-stone-300'}`}>{t.l}</button>
              ))}
            </div>
            {bizTab === 'shifts' && renderBizShifts()}
            {bizTab === 'workers' && <BizWorkersTab workers={workers} assignments={assignments} payments={payments} biz={biz} addWorker={addWorker} />}
            {bizTab === 'marketplace' && renderBizMarketplace()}
            {bizTab === 'payments' && renderBizPayments()}
            {bizTab === 'tax' && renderBizTax()}
          </>
        )}

        {isWorker && (
          <>
            <div className="flex gap-1 bg-stone-900 rounded-lg p-1 mb-5">
              {[{ k: 'shifts', l: 'Shifts' }, { k: 'profile', l: 'Profile' }].map(t => (
                <button key={t.k} onClick={() => setWorkerTab(t.k)}
                  className={`flex-1 text-xs font-semibold px-3 py-2 rounded-md cursor-pointer transition-colors ${workerTab === t.k ? 'bg-stone-800 text-emerald-400' : 'text-stone-500'}`}>{t.l}</button>
              ))}
            </div>
            {workerTab === 'shifts' && renderWorkerShifts()}
            {workerTab === 'profile' && renderWorkerProfile()}
          </>
        )}
      </main>
    </div>
  );
}

// ============================================================
// BIZ WORKERS TAB (extracted to avoid hook issues)
// ============================================================
function BizWorkersTab({ workers, assignments, payments, biz, addWorker }) {
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: '', email: '', phone: '', hourly_rate: '15' });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-stone-400 text-xs">{workers.length} workers</span>
        <Btn onClick={() => setAdding(true)} s="sm">+ Add</Btn>
      </div>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add Worker">
        <div className="space-y-3">
          <Input label="Name" value={f.name} onChange={e => setF({...f, name: e.target.value})} placeholder="Jessica Rivera" />
          <Input label="Email" value={f.email} onChange={e => setF({...f, email: e.target.value})} placeholder="jessica@email.com" />
          <Input label="Phone" value={f.phone} onChange={e => setF({...f, phone: e.target.value})} placeholder="(555) 123-4567" />
          <Input label="Rate ($)" type="number" value={f.hourly_rate} onChange={e => setF({...f, hourly_rate: e.target.value})} />
          <Btn onClick={async () => { await addWorker({ name: f.name, email: f.email, phone: f.phone, hourly_rate: parseFloat(f.hourly_rate) }); setF({ name: '', email: '', phone: '', hourly_rate: '15' }); setAdding(false); }} s="lg" className="w-full">Add</Btn>
        </div>
      </Modal>
      {workers.map(w => {
        const paid = payments.filter(p => p.worker_id === w.id).reduce((s, p) => s + p.amount, 0);
        return (
          <Card key={w.id}>
            <div className="flex justify-between items-center">
              <div><p className="text-stone-200 font-semibold text-sm">{w.name}</p><p className="text-stone-500 text-xs">{w.email || w.phone || 'No contact'} · {fmt(w.hourly_rate || 15)}/hr</p></div>
              <div className="text-right"><p className={`text-sm font-bold ${paid >= 600 ? 'text-red-400' : 'text-stone-400'}`}>{fmt(paid)}</p>{paid >= 600 && <p className="text-red-400 text-[10px]">1099</p>}</div>
            </div>
          </Card>
        );
      })}
      {workers.length === 0 && <Empty icon="👤" title="No workers" desc="Add workers or find them in the marketplace." action={<Btn onClick={() => setAdding(true)} s="sm">Add Worker</Btn>} />}
    </div>
  );
}
