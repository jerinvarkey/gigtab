'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

function getSb() { return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { flowType: 'implicit' } }); }

// Each method: what works as a deep link, what's manual
const PLATFORMS = {
  venmo: {
    label: 'Venmo',
    color: '#008CFF',
    txtClass: 'text-white',
    // Venmo supports username OR phone/email in the recipients param
    getLink: (handle, amount, note) => {
      const n = encodeURIComponent(note || 'GigTab');
      // If handle looks like a phone or email, use recipients param
      if (handle.includes('@') || /^\d/.test(handle.replace(/[^0-9]/g, '').length > 6 ? handle : '')) {
        return `https://venmo.com/?txn=pay&recipients=${encodeURIComponent(handle)}&amount=${amount}&note=${n}`;
      }
      return `https://venmo.com/${handle.replace('@', '')}?txn=pay&amount=${amount}&note=${n}`;
    },
    canDeepLink: true,
  },
  paypal: {
    label: 'PayPal',
    color: '#0070BA',
    txtClass: 'text-white',
    getLink: (handle, amount) => {
      // Only works if they have a paypal.me username
      if (handle.includes('@') || /^\d/.test(handle)) return null; // email/phone = no deep link
      return `https://paypal.me/${handle}/${amount}`;
    },
    canDeepLink: (handle) => !handle.includes('@') && !/^\d/.test(handle),
  },
  cashapp: {
    label: 'Cash App',
    color: '#00D632',
    txtClass: 'text-black',
    getLink: (handle, amount) => `https://cash.app/$${handle.replace('$', '')}/${amount}`,
    canDeepLink: true,
  },
  zelle: {
    label: 'Zelle',
    color: '#6D1ED4',
    txtClass: 'text-white',
    getLink: () => null, // No deep link possible
    canDeepLink: false,
  },
  applepay: {
    label: 'Apple Pay',
    color: '#000000',
    txtClass: 'text-white',
    getLink: () => null, // No payment deep link
    canDeepLink: false,
  },
};

export default function WorkerProfilePage({ params }) {
  const { slug } = params;
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('home');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [job, setJob] = useState({ title: '', job_date: '', start_time: '', end_time: '', hourly_rate: '15', notes: '' });
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const sb = getSb();
    sb.from('workers').select('*').eq('slug', slug).maybeSingle().then(({ data }) => { setWorker(data); setLoading(false); });
    sb.auth.getSession().then(({ data: { session } }) => { if (session?.user) setUser(session.user); });
  }, [slug]);

  const createJob = async () => {
    if (!job.title) return;
    setSending(true);
    const sb = getSb();
    if (!user) {
      localStorage.setItem('gt_pending_job', JSON.stringify({ ...job, worker_id: worker.id, slug }));
      await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
      return;
    }
    await sb.from('jobs').insert({
      worker_id: worker.id, payer_user_id: user.id,
      payer_name: user.user_metadata?.full_name || user.email, payer_email: user.email,
      title: job.title, job_date: job.job_date || null, start_time: job.start_time || null,
      end_time: job.end_time || null, hourly_rate: job.hourly_rate ? parseFloat(job.hourly_rate) : null,
      notes: job.notes || null, status: 'pending',
    });
    setSending(false);
    setMode('job-sent');
  };

  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      const pending = localStorage.getItem('gt_pending_job');
      if (pending) {
        const j = JSON.parse(pending);
        localStorage.removeItem('gt_pending_job');
        if (j.slug === slug) {
          getSb().from('jobs').insert({
            worker_id: j.worker_id, payer_user_id: user.id,
            payer_name: user.user_metadata?.full_name || user.email, payer_email: user.email,
            title: j.title, job_date: j.job_date || null, start_time: j.start_time || null,
            end_time: j.end_time || null, hourly_rate: j.hourly_rate ? parseFloat(j.hourly_rate) : null,
            notes: j.notes || null, status: 'pending',
          }).then(() => setMode('job-sent'));
        }
      }
    }
  }, [user]);

  if (loading) return <div className="min-h-screen bg-stone-950 flex items-center justify-center"><div className="animate-pulse text-stone-500">Loading...</div></div>;

  if (!worker) return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6 text-center">
      <p className="text-4xl mb-4 opacity-40">🔍</p>
      <h1 className="text-stone-200 font-bold text-xl mb-2">Profile not found</h1>
      <p className="text-stone-500 text-sm mb-6">This GigTab link doesn't exist yet.</p>
      <a href="/" className="text-emerald-400 text-sm font-semibold">Create your own GigTab →</a>
    </div>
  );

  const methods = worker.payment_methods || [];
  const prefMethod = methods.find(m => m.type === worker.preferred_method) || methods[0];
  const initials = worker.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  const firstName = worker.name?.split(' ')[0] || worker.name;

  const renderPayButton = (m, isPrimary) => {
    const platform = PLATFORMS[m.type];
    if (!platform) return null;

    const amt = amount ? parseFloat(amount).toFixed(2) : '0';
    const link = platform.getLink(m.handle, amt, note || `Payment to ${worker.name}`);
    const canLink = typeof platform.canDeepLink === 'function' ? platform.canDeepLink(m.handle) : platform.canDeepLink;

    // If deep link works, show a clickable button
    if (link && canLink) {
      return (
        <a key={m.type} href={link} target="_blank" rel="noopener noreferrer"
          className={`block w-full font-bold ${isPrimary ? 'text-base py-4' : 'text-sm py-3.5'} rounded-xl text-center transition-transform hover:scale-[1.01] active:scale-[0.99] ${platform.txtClass} ${!isPrimary ? 'border border-stone-800' : ''}`}
          style={{ backgroundColor: isPrimary ? platform.color : 'transparent' }}>
          <div className="flex items-center justify-center gap-2">
            {!isPrimary && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: platform.color }} />}
            <span>{amount ? `Pay $${amt} with ${platform.label}` : `Open ${platform.label}`}</span>
            <span className="opacity-60">→</span>
          </div>
        </a>
      );
    }

    // No deep link — show instructions
    return (
      <div key={m.type} className={`rounded-xl px-5 ${isPrimary ? 'py-4' : 'py-3'} ${isPrimary ? '' : 'bg-stone-900 border border-stone-800'}`}
        style={isPrimary ? { backgroundColor: platform.color } : {}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {!isPrimary && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: platform.color }} />}
            <span className={`font-bold ${isPrimary ? 'text-base' : 'text-sm'} ${isPrimary ? platform.txtClass : 'text-stone-300'}`}>{platform.label}</span>
          </div>
          <button onClick={() => { navigator.clipboard?.writeText(m.handle); }}
            className={`text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer ${isPrimary ? 'bg-white/20 ' + platform.txtClass : 'bg-stone-800 text-stone-400'}`}>
            Copy
          </button>
        </div>
        <p className={`text-sm mt-1 font-mono ${isPrimary ? platform.txtClass + ' opacity-90' : 'text-stone-400'}`}>{m.handle}</p>
        <p className={`text-xs mt-1 ${isPrimary ? platform.txtClass + ' opacity-60' : 'text-stone-600'}`}>
          {m.type === 'zelle' ? 'Open your banking app and send to the above' :
           m.type === 'paypal' ? 'Send via PayPal to the email/phone above' :
           m.type === 'applepay' ? 'Send via Messages or Wallet using the above' :
           'Send using the info above'}
          {amount ? ` — $${amt}` : ''}
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,900&display=swap" rel="stylesheet" />

      <div className="max-w-md mx-auto px-5 py-8">
        {/* Profile header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mx-auto mb-3 text-2xl font-black text-black">{initials}</div>
          <h1 className="text-2xl font-black">{worker.name}</h1>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
            <span className="text-stone-500 text-sm">GigTab</span>
          </div>
        </div>

        {/* HOME */}
        {mode === 'home' && (
          <div className="space-y-3">
            <button onClick={() => setMode('pay')} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base py-4 rounded-xl transition-all cursor-pointer">
              Pay {firstName}
            </button>
            <button onClick={() => setMode('job')} className="w-full bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-base py-4 rounded-xl border border-stone-700 transition-all cursor-pointer">
              Assign {firstName} a Job
            </button>
            {methods.length > 0 && (
              <div className="mt-5">
                <p className="text-stone-600 text-[10px] uppercase tracking-wider font-bold mb-2">Accepts payment via</p>
                <div className="flex flex-wrap gap-2">
                  {methods.map(m => (
                    <div key={m.type} className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PLATFORMS[m.type]?.color }} />
                      <span className="text-stone-400 text-xs">{PLATFORMS[m.type]?.label || m.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {methods.length === 0 && (
              <div className="bg-amber-950/20 border border-amber-800/20 rounded-xl p-4 mt-4">
                <p className="text-amber-400 text-sm font-semibold">{firstName} hasn't set up payment methods yet</p>
                <p className="text-stone-500 text-xs mt-1">Ask them to finish setting up their GigTab profile.</p>
              </div>
            )}
          </div>
        )}

        {/* PAY */}
        {mode === 'pay' && (
          <div className="space-y-4">
            <button onClick={() => setMode('home')} className="text-stone-500 text-sm cursor-pointer hover:text-stone-300">← Back</button>
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
              <p className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-3">Pay {firstName}</p>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-stone-500 text-3xl font-bold">$</span>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                  className="flex-1 bg-transparent text-4xl font-black text-stone-100 placeholder:text-stone-700 focus:outline-none" />
              </div>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="What's this for? (optional)"
                className="w-full bg-stone-800/50 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-300 text-sm placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50" />
            </div>
            {methods.length > 0 ? (
              <div className="space-y-2.5">
                {prefMethod && renderPayButton(prefMethod, true)}
                {methods.filter(m => m !== prefMethod).map(m => renderPayButton(m, false))}
              </div>
            ) : (
              <div className="bg-amber-950/20 border border-amber-800/20 rounded-xl p-4">
                <p className="text-amber-400 text-sm">{firstName} hasn't added payment methods yet.</p>
              </div>
            )}
          </div>
        )}

        {/* CREATE JOB */}
        {mode === 'job' && (
          <div className="space-y-4">
            <button onClick={() => setMode('home')} className="text-stone-500 text-sm cursor-pointer hover:text-stone-300">← Back</button>
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
              <p className="text-stone-400 text-xs font-bold uppercase tracking-wider">Assign {firstName} a Job</p>
              <div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">What's the job?</span><input value={job.title} onChange={e => setJob({...job, title: e.target.value})} placeholder="e.g. Presale event at YogaSix" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50" /></div>
              <div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">When?</span><input type="date" value={job.job_date} onChange={e => setJob({...job, job_date: e.target.value})} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">Start</span><input type="time" value={job.start_time} onChange={e => setJob({...job, start_time: e.target.value})} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none" /></div>
                <div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">End</span><input type="time" value={job.end_time} onChange={e => setJob({...job, end_time: e.target.value})} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none" /></div>
              </div>
              <div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">Rate ($/hr)</span><input type="number" value={job.hourly_rate} onChange={e => setJob({...job, hourly_rate: e.target.value})} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none" /></div>
              <div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">Notes (optional)</span><input value={job.notes} onChange={e => setJob({...job, notes: e.target.value})} placeholder="Any instructions for the worker" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none" /></div>
              {job.start_time && job.end_time && job.hourly_rate && (() => {
                const hrs = Math.round(((new Date(`2000-01-01T${job.end_time}`) - new Date(`2000-01-01T${job.start_time}`)) / 3600000) * 4) / 4;
                return <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-lg p-3"><div className="flex justify-between text-sm"><span className="text-stone-400">{hrs} hrs × ${job.hourly_rate}/hr</span><span className="text-emerald-400 font-bold text-lg">${(hrs * parseFloat(job.hourly_rate)).toFixed(2)}</span></div></div>;
              })()}
            </div>
            <button onClick={createJob} disabled={sending || !job.title}
              className={`w-full font-bold text-base py-4 rounded-xl transition-all cursor-pointer ${!job.title ? 'bg-stone-800 text-stone-600' : 'bg-emerald-500 hover:bg-emerald-400 text-black'}`}>
              {sending ? 'Sending...' : user ? `Send Job to ${firstName}` : `Sign in & Send Job`}
            </button>
            {!user && <p className="text-stone-600 text-xs text-center">You'll sign in with Google so {firstName} knows who assigned the job.</p>}
          </div>
        )}

        {/* JOB SENT */}
        {mode === 'job-sent' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>
            <h2 className="text-stone-100 font-bold text-xl mb-2">Job sent to {firstName}!</h2>
            <p className="text-stone-500 text-sm mb-6">They'll see it in their GigTab. After the work is done, you'll be able to pay with one tap.</p>
            <button onClick={() => setMode('home')} className="text-emerald-400 font-semibold text-sm cursor-pointer">Back to {firstName}'s profile</button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <a href="/" className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-400 text-xs transition-colors">
            <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
            Get your own GigTab — free
          </a>
        </div>
      </div>
    </div>
  );
}
