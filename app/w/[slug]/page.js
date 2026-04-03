'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

function getSb() { return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { flowType: 'implicit' } }); }

const PL = {
  venmo: { label: 'Venmo', color: '#008CFF', tc: 'text-white',
    link: (h, a, n) => { const e = encodeURIComponent(n||'GigTab'); return (h.includes('@')||/^\d{7}/.test(h.replace(/\D/g,''))) ? `https://venmo.com/?txn=pay&recipients=${encodeURIComponent(h)}&amount=${a}&note=${e}` : `https://venmo.com/${h.replace('@','')}?txn=pay&amount=${a}&note=${e}`; }, canLink: true },
  paypal: { label: 'PayPal', color: '#0070BA', tc: 'text-white',
    link: (h, a) => (h.includes('@')||/^\d/.test(h)) ? null : `https://paypal.me/${h}/${a}`,
    canLink: h => !h.includes('@')&&!/^\d/.test(h) },
  cashapp: { label: 'Cash App', color: '#00D632', tc: 'text-black',
    link: (h, a) => `https://cash.app/$${h.replace('$','')}/${a}`, canLink: true },
  zelle: { label: 'Zelle', color: '#6D1ED4', tc: 'text-white', link: () => null, canLink: false },
};

function Toast({ msg }) { if (!msg) return null; return <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-sm font-bold px-4 py-2 rounded-lg shadow-lg z-50">{msg}</div>; }

export default function ProfilePage({ params }) {
  const { slug } = params;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('home'); // home|pay|job|sent
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [job, setJob] = useState({ title: '', job_date: '', start_time: '', end_time: '', hourly_rate: '15', notes: '', payer_name: '' });
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState(null); // auth user
  const [gtUser, setGtUser] = useState(null); // gigtab user record
  const [toast, setToast] = useState('');
  const show = m => { setToast(m); setTimeout(() => setToast(''), 2000); };

  useEffect(() => {
    const sb = getSb();
    sb.from('users').select('*').eq('slug', slug).maybeSingle().then(({ data }) => { setProfile(data); setLoading(false); });
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        sb.from('users').select('*').eq('auth_id', session.user.id).maybeSingle().then(({ data }) => setGtUser(data));
      }
    });
  }, [slug]);

  const createJob = async () => {
    if (!job.title || !job.payer_name) return;
    setSending(true);
    const sb = getSb();
    if (!user) {
      localStorage.setItem('gt_pjob', JSON.stringify({ ...job, profile_id: profile.id, slug }));
      await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
      return;
    }
    // Ensure payer has a gigtab user record
    let payerId = gtUser?.id;
    if (!payerId) {
      const { data: nu } = await sb.from('users').insert({ auth_id: user.id, name: user.user_metadata?.full_name || user.email, email: user.email, slug: user.email?.split('@')[0]?.replace(/[^a-z0-9]/gi,'').slice(0,16) + Math.random().toString(36).slice(2,5), payment_methods: [], payer_names: [job.payer_name] }).select().maybeSingle();
      if (nu) { payerId = nu.id; setGtUser(nu); }
    } else {
      // Save payer_name if new
      if (gtUser && !gtUser.payer_names?.includes(job.payer_name)) {
        const names = [...(gtUser.payer_names || []), job.payer_name];
        await sb.from('users').update({ payer_names: names }).eq('id', gtUser.id);
      }
    }
    if (!payerId) { setSending(false); return; }
    // Create job
    const { data: j } = await sb.from('jobs').insert({ created_by: payerId, payer_name: job.payer_name, title: job.title, location: job.location || null, job_date: job.job_date || null, start_time: job.start_time || null, end_time: job.end_time || null, hourly_rate: job.hourly_rate ? parseFloat(job.hourly_rate) : null, notes: job.notes || null }).select().maybeSingle();
    if (j) {
      // Add this profile user as a worker on the job
      await sb.from('job_workers').insert({ job_id: j.id, worker_id: profile.id });
    }
    setSending(false);
    setMode('sent');
  };

  // Handle pending job after OAuth redirect
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      const p = localStorage.getItem('gt_pjob');
      if (p) { const j = JSON.parse(p); localStorage.removeItem('gt_pjob');
        if (j.slug === slug) {
          const sb = getSb();
          (async () => {
            let pid = gtUser?.id;
            if (!pid) {
              const { data: nu } = await sb.from('users').insert({ auth_id: user.id, name: user.user_metadata?.full_name || user.email, email: user.email, slug: user.email?.split('@')[0]?.replace(/[^a-z0-9]/gi,'').slice(0,16) + Math.random().toString(36).slice(2,5), payment_methods: [], payer_names: [j.payer_name] }).select().maybeSingle();
              if (nu) pid = nu.id;
            }
            if (pid) {
              const { data: jb } = await sb.from('jobs').insert({ created_by: pid, payer_name: j.payer_name, title: j.title, job_date: j.job_date || null, start_time: j.start_time || null, end_time: j.end_time || null, hourly_rate: j.hourly_rate ? parseFloat(j.hourly_rate) : null, notes: j.notes || null }).select().maybeSingle();
              if (jb) await sb.from('job_workers').insert({ job_id: jb.id, worker_id: j.profile_id });
            }
            setMode('sent');
          })();
        }
      }
    }
  }, [user, gtUser]);

  if (loading) return <div className="min-h-screen bg-stone-950 flex items-center justify-center"><div className="animate-pulse text-stone-500">Loading...</div></div>;
  if (!profile) return <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6 text-center"><p className="text-4xl mb-4 opacity-40">🔍</p><h1 className="text-stone-200 font-bold text-xl mb-2">Not found</h1><p className="text-stone-500 text-sm mb-6">This GigTab doesn't exist.</p><a href="/" className="bg-emerald-500 text-black font-bold text-sm px-6 py-3 rounded-lg">Create yours free →</a></div>;

  const methods = profile.payment_methods || [];
  const prefM = methods.find(m => m.type === profile.preferred_method) || methods[0];
  const initials = profile.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  const fn = profile.name?.split(' ')[0] || profile.name;
  const pa = parseFloat(amount); const ok = !isNaN(pa) && pa > 0; const da = ok ? pa.toFixed(2) : null;

  const payBtn = (m, big) => {
    const p = PL[m.type]; if (!p) return null;
    const lk = da ? p.link(m.handle, da, note || `To ${profile.name}`) : null;
    const cl = typeof p.canLink === 'function' ? p.canLink(m.handle) : p.canLink;
    if (lk && cl) return <a key={m.type} href={lk} target="_blank" rel="noopener noreferrer" className={`block w-full font-bold ${big ? 'text-base py-4' : 'text-sm py-3'} rounded-xl text-center ${p.tc}`} style={{ backgroundColor: big ? p.color : 'transparent', border: big ? 'none' : '1px solid #292524' }}>{da ? `Pay $${da} with ${p.label} →` : `Open ${p.label}`}</a>;
    return <div key={m.type} className={`rounded-xl px-5 ${big?'py-4':'py-3'}`} style={big ? { backgroundColor: p.color } : { border: '1px solid #292524' }}><div className="flex items-center justify-between"><span className={`font-bold ${big?'text-base':'text-sm'} ${big?p.tc:'text-stone-300'}`}>{p.label}</span><button onClick={() => { navigator.clipboard?.writeText(m.handle); show('Copied!'); }} className={`text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer ${big?'bg-white/20 '+p.tc:'bg-stone-800 text-stone-400'}`}>Copy</button></div><p className={`text-sm mt-1 font-mono ${big?p.tc+' opacity-90':'text-stone-400'}`}>{m.handle}</p><p className={`text-xs mt-1 ${big?p.tc+' opacity-60':'text-stone-600'}`}>{m.type==='zelle'?'Send via your banking app':'Send using the info above'}{da?` — $${da}`:''}</p></div>;
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,900&display=swap" rel="stylesheet" />
      <Toast msg={toast} />

      {/* Top nav */}
      <div className="max-w-md mx-auto px-5 pt-4 flex justify-between items-center">
        {mode !== 'home' && <button onClick={() => setMode('home')} className="text-stone-500 text-sm cursor-pointer hover:text-stone-300">← Back</button>}
        {mode === 'home' && <div/>}
        <a href="/" className="text-stone-600 text-xs hover:text-emerald-400 flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
          {user ? 'My GigTab' : 'Get GigTab'}
        </a>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">
        {/* Profile header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mx-auto mb-3 text-2xl font-black text-black">{initials}</div>
          <h1 className="text-2xl font-black">{profile.name}</h1>
        </div>

        {/* HOME */}
        {mode === 'home' && <div className="space-y-3">
          <button onClick={() => setMode('pay')} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base py-4 rounded-xl cursor-pointer">Pay {fn}</button>
          <button onClick={() => setMode('job')} className="w-full bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-base py-4 rounded-xl border border-stone-700 cursor-pointer">Assign {fn} a Job</button>
          <p className="text-stone-600 text-xs text-center mt-3"><strong className="text-stone-500">Pay</strong> = send money now. <strong className="text-stone-500">Assign</strong> = schedule work, approve hours, then pay.</p>
          {methods.length > 0 && <div className="mt-4"><p className="text-stone-600 text-[10px] uppercase tracking-wider font-bold mb-2">Accepts</p><div className="flex flex-wrap gap-2">{methods.map(m => <div key={m.type} className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: PL[m.type]?.color }}/><span className="text-stone-400 text-xs">{PL[m.type]?.label}</span></div>)}</div></div>}
          {methods.length === 0 && <div className="bg-amber-950/20 border border-amber-800/20 rounded-xl p-4 mt-4"><p className="text-amber-400 text-sm font-semibold">{fn} hasn't set up payment methods yet</p></div>}
        </div>}

        {/* PAY */}
        {mode === 'pay' && <div className="space-y-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
            <p className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-3">How much?</p>
            <div className="flex items-center gap-3 mb-4"><span className="text-stone-500 text-3xl font-bold">$</span><input type="number" min="0.01" step="0.01" value={amount} onChange={e => { const v = e.target.value; if (v === '' || parseFloat(v) >= 0) setAmount(v); }} placeholder="0.00" className="flex-1 bg-transparent text-4xl font-black text-stone-100 placeholder:text-stone-700 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></div>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="What's this for? (optional)" className="w-full bg-stone-800/50 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-300 text-sm placeholder:text-stone-600 focus:outline-none" />
          </div>
          {!ok && amount !== '' && <p className="text-red-400 text-xs">Enter a positive amount</p>}
          {methods.length > 0 ? <div className="space-y-2.5"><p className="text-stone-600 text-[10px] uppercase tracking-wider font-bold">Choose how to pay</p>{prefM && payBtn(prefM, true)}{methods.filter(m => m !== prefM).map(m => payBtn(m, false))}</div> : <div className="bg-amber-950/20 border border-amber-800/20 rounded-xl p-4"><p className="text-amber-400 text-sm">{fn} hasn't added payment methods.</p></div>}
        </div>}

        {/* ASSIGN JOB */}
        {mode === 'job' && <div className="space-y-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
            <div><p className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-1">Assign {fn} a Job</p><p className="text-stone-600 text-xs">{fn} will see this and can accept or decline.</p></div>
            <div>
              <span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">Who's paying? *</span>
              {gtUser?.payer_names?.length > 0 && <div className="flex flex-wrap gap-2 mb-2">{gtUser.payer_names.map(n => <button key={n} onClick={() => setJob({...job, payer_name: n})} className={`text-xs px-3 py-1.5 rounded-lg cursor-pointer ${job.payer_name === n ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-stone-800 text-stone-400 border border-stone-700'}`}>{n}</button>)}</div>}
              <input value={job.payer_name} onChange={e => setJob({...job, payer_name: e.target.value})} placeholder="e.g. Degree Wellness or your name" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50" />
              <p className="text-stone-700 text-[10px] mt-1">This is what {fn} sees as the payer. Use your company name for business, your name for personal.</p>
            </div>
            <div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">What's the job? *</span><input value={job.title} onChange={e => setJob({...job, title: e.target.value})} placeholder="e.g. Presale event at YogaSix" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none" /></div>
            <div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">When?</span><input type="date" value={job.job_date} onChange={e => setJob({...job, job_date: e.target.value})} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">Start</span><input type="time" value={job.start_time} onChange={e => setJob({...job, start_time: e.target.value})} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none" /></div>
              <div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">End</span><input type="time" value={job.end_time} onChange={e => setJob({...job, end_time: e.target.value})} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none" /></div>
            </div>
            <div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">Rate ($/hr)</span><input type="number" min="0" value={job.hourly_rate} onChange={e => setJob({...job, hourly_rate: e.target.value})} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none" /></div>
            <div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">Notes (optional)</span><input value={job.notes} onChange={e => setJob({...job, notes: e.target.value})} placeholder="Instructions, dress code, etc." className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none" /></div>
            {job.start_time && job.end_time && job.hourly_rate && parseFloat(job.hourly_rate) > 0 && (() => { const h = Math.round(((new Date(`2000-01-01T${job.end_time}`) - new Date(`2000-01-01T${job.start_time}`)) / 3600000) * 4) / 4; return h > 0 ? <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-lg p-3"><div className="flex justify-between text-sm"><span className="text-stone-400">{h} hrs × ${job.hourly_rate}/hr</span><span className="text-emerald-400 font-bold text-lg">${(h * parseFloat(job.hourly_rate)).toFixed(2)}</span></div></div> : null; })()}
          </div>
          <button onClick={createJob} disabled={sending || !job.title || !job.payer_name} className={`w-full font-bold text-base py-4 rounded-xl cursor-pointer ${!job.title || !job.payer_name ? 'bg-stone-800 text-stone-600' : 'bg-emerald-500 hover:bg-emerald-400 text-black'}`}>{sending ? 'Sending...' : user ? `Send Job to ${fn}` : `Sign in & Send Job`}</button>
          {!user && <p className="text-stone-600 text-xs text-center">You'll sign in with Google so {fn} knows who you are.</p>}
        </div>}

        {/* SENT */}
        {mode === 'sent' && <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>
          <h2 className="text-stone-100 font-bold text-xl mb-2">Job sent to {fn}!</h2>
          <p className="text-stone-500 text-sm mb-6">When they accept and log hours, you'll see it in your GigTab dashboard where you can approve and pay.</p>
          <div className="space-y-3">
            <a href="/" className="block text-emerald-400 font-semibold text-sm">Go to my dashboard →</a>
            <button onClick={() => { setMode('home'); setJob({ title: '', job_date: '', start_time: '', end_time: '', hourly_rate: '15', notes: '', payer_name: job.payer_name }); }} className="text-stone-600 text-sm cursor-pointer">Back to {fn}'s profile</button>
          </div>
        </div>}
      </div>
    </div>
  );
}
