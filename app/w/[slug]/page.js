'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

function getSb() { return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { flowType: 'implicit' } }); }

const PLATFORMS = {
  venmo: { label: 'Venmo', color: '#008CFF', txtClass: 'text-white',
    getLink: (h, a, n) => { const enc = encodeURIComponent(n || 'GigTab'); return h.includes('@') || /^\d/.test(h.replace(/\D/g,'')) ? `https://venmo.com/?txn=pay&recipients=${encodeURIComponent(h)}&amount=${a}&note=${enc}` : `https://venmo.com/${h.replace('@','')}?txn=pay&amount=${a}&note=${enc}`; }, canLink: true },
  paypal: { label: 'PayPal', color: '#0070BA', txtClass: 'text-white',
    getLink: (h, a) => (h.includes('@') || /^\d/.test(h)) ? null : `https://paypal.me/${h}/${a}`,
    canLink: h => !h.includes('@') && !/^\d/.test(h) },
  cashapp: { label: 'Cash App', color: '#00D632', txtClass: 'text-black',
    getLink: (h, a) => `https://cash.app/$${h.replace('$','')}/${a}`, canLink: true },
  zelle: { label: 'Zelle', color: '#6D1ED4', txtClass: 'text-white', getLink: () => null, canLink: false },
};

function Toast({ msg, show }) {
  if (!show) return null;
  return <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-sm font-bold px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">{msg}</div>;
}

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
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2000); };

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
      const p = localStorage.getItem('gt_pending_job');
      if (p) { const j = JSON.parse(p); localStorage.removeItem('gt_pending_job');
        if (j.slug === slug) { getSb().from('jobs').insert({ worker_id: j.worker_id, payer_user_id: user.id, payer_name: user.user_metadata?.full_name || user.email, payer_email: user.email, title: j.title, job_date: j.job_date || null, start_time: j.start_time || null, end_time: j.end_time || null, hourly_rate: j.hourly_rate ? parseFloat(j.hourly_rate) : null, notes: j.notes || null, status: 'pending' }).then(() => setMode('job-sent')); }
      }
    }
  }, [user]);

  if (loading) return <div className="min-h-screen bg-stone-950 flex items-center justify-center"><div className="animate-pulse text-stone-500">Loading...</div></div>;
  if (!worker) return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6 text-center">
      <p className="text-4xl mb-4 opacity-40">🔍</p><h1 className="text-stone-200 font-bold text-xl mb-2">Profile not found</h1>
      <p className="text-stone-500 text-sm mb-6">This GigTab link doesn't exist yet.</p>
      <a href="/" className="bg-emerald-500 text-black font-bold text-sm px-6 py-3 rounded-lg">Create your own GigTab →</a>
    </div>
  );

  const methods = worker.payment_methods || [];
  const prefMethod = methods.find(m => m.type === worker.preferred_method) || methods[0];
  const initials = worker.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  const firstName = worker.name?.split(' ')[0] || worker.name;
  const parsedAmount = parseFloat(amount);
  const validAmount = !isNaN(parsedAmount) && parsedAmount > 0;
  const displayAmt = validAmount ? parsedAmount.toFixed(2) : null;

  const renderPayBtn = (m, primary) => {
    const p = PLATFORMS[m.type]; if (!p) return null;
    const link = displayAmt ? p.getLink(m.handle, displayAmt, note || `Payment to ${worker.name}`) : null;
    const canLink = typeof p.canLink === 'function' ? p.canLink(m.handle) : p.canLink;

    if (link && canLink) {
      return <a key={m.type} href={link} target="_blank" rel="noopener noreferrer"
        className={`block w-full font-bold ${primary ? 'text-base py-4' : 'text-sm py-3.5'} rounded-xl text-center transition-transform hover:scale-[1.01] active:scale-[0.99] ${p.txtClass}`}
        style={{ backgroundColor: primary ? p.color : 'transparent', border: primary ? 'none' : '1px solid #292524' }}>
        <div className="flex items-center justify-center gap-2">
          {!primary && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}/>}
          <span>{displayAmt ? `Pay $${displayAmt} with ${p.label}` : `Open ${p.label}`}</span><span className="opacity-60">→</span>
        </div>
      </a>;
    }
    // Manual — show handle with copy
    return <div key={m.type} className={`rounded-xl px-5 ${primary ? 'py-4' : 'py-3 bg-stone-900 border border-stone-800'}`} style={primary ? { backgroundColor: p.color } : {}}>
      <div className="flex items-center justify-between">
        <span className={`font-bold ${primary ? 'text-base' : 'text-sm'} ${primary ? p.txtClass : 'text-stone-300'}`}>{p.label}</span>
        <button onClick={() => { navigator.clipboard?.writeText(m.handle); showToast('Copied!'); }} className={`text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer ${primary ? 'bg-white/20 ' + p.txtClass : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}>Copy</button>
      </div>
      <p className={`text-sm mt-1 font-mono ${primary ? p.txtClass + ' opacity-90' : 'text-stone-400'}`}>{m.handle}</p>
      <p className={`text-xs mt-1 ${primary ? p.txtClass + ' opacity-60' : 'text-stone-600'}`}>
        {m.type === 'zelle' ? 'Open your banking app and send to the above' : 'Send via the app using the info above'}
        {displayAmt ? ` — $${displayAmt}` : ''}
      </p>
    </div>;
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,900&display=swap" rel="stylesheet" />
      <Toast msg={toast} show={!!toast} />

      <div className="max-w-md mx-auto px-5 py-8">
        {/* Header — always visible, clickable back to home */}
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
            <p className="text-stone-500 text-xs text-center mb-2">What would you like to do?</p>
            <button onClick={() => setMode('pay')} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base py-4 rounded-xl transition-all cursor-pointer">Pay {firstName}</button>
            <button onClick={() => setMode('job')} className="w-full bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-base py-4 rounded-xl border border-stone-700 transition-all cursor-pointer">Assign {firstName} a Job</button>
            <p className="text-stone-600 text-xs text-center mt-3 max-w-xs mx-auto">
              <strong className="text-stone-500">Pay</strong> = send money now for something already done.
              <br/><strong className="text-stone-500">Assign</strong> = schedule work, then pay after it's completed.
            </p>
            {methods.length > 0 && <div className="mt-5"><p className="text-stone-600 text-[10px] uppercase tracking-wider font-bold mb-2">Accepts</p><div className="flex flex-wrap gap-2">{methods.map(m => <div key={m.type} className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: PLATFORMS[m.type]?.color }}/><span className="text-stone-400 text-xs">{PLATFORMS[m.type]?.label}</span></div>)}</div></div>}
            {methods.length === 0 && <div className="bg-amber-950/20 border border-amber-800/20 rounded-xl p-4 mt-4"><p className="text-amber-400 text-sm font-semibold">{firstName} hasn't set up payment methods yet</p><p className="text-stone-500 text-xs mt-1">Let them know they need to finish their GigTab profile.</p></div>}
          </div>
        )}

        {/* PAY */}
        {mode === 'pay' && (
          <div className="space-y-4">
            <button onClick={() => setMode('home')} className="text-stone-500 text-sm cursor-pointer hover:text-stone-300 flex items-center gap-1">← Back to {firstName}'s profile</button>
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
              <p className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-3">How much do you owe {firstName}?</p>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-stone-500 text-3xl font-bold">$</span>
                <input type="number" min="0.01" step="0.01" value={amount} onChange={e => { const v = e.target.value; if (v === '' || parseFloat(v) >= 0) setAmount(v); }} placeholder="0.00"
                  className="flex-1 bg-transparent text-4xl font-black text-stone-100 placeholder:text-stone-700 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              </div>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="What's this for? (optional)"
                className="w-full bg-stone-800/50 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-300 text-sm placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50" />
            </div>
            {!validAmount && amount !== '' && <p className="text-red-400 text-xs">Enter an amount greater than $0</p>}
            {methods.length > 0 ? (
              <div className="space-y-2.5">
                <p className="text-stone-600 text-[10px] uppercase tracking-wider font-bold">Choose how to pay</p>
                {prefMethod && renderPayBtn(prefMethod, true)}
                {methods.filter(m => m !== prefMethod).map(m => renderPayBtn(m, false))}
              </div>
            ) : <div className="bg-amber-950/20 border border-amber-800/20 rounded-xl p-4"><p className="text-amber-400 text-sm">{firstName} hasn't added payment methods yet.</p></div>}
          </div>
        )}

        {/* JOB */}
        {mode === 'job' && (
          <div className="space-y-4">
            <button onClick={() => setMode('home')} className="text-stone-500 text-sm cursor-pointer hover:text-stone-300 flex items-center gap-1">← Back to {firstName}'s profile</button>
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
              <div><p className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-1">Assign {firstName} a Job</p><p className="text-stone-600 text-xs">Fill in the details. {firstName} will see this and can accept or decline.</p></div>
              <div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">What's the job? *</span><input value={job.title} onChange={e => setJob({...job, title: e.target.value})} placeholder="e.g. Presale event at YogaSix" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50" /></div>
              <div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">When?</span><input type="date" value={job.job_date} onChange={e => setJob({...job, job_date: e.target.value})} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">Start</span><input type="time" value={job.start_time} onChange={e => setJob({...job, start_time: e.target.value})} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none" /></div>
                <div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">End</span><input type="time" value={job.end_time} onChange={e => setJob({...job, end_time: e.target.value})} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none" /></div>
              </div>
              <div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">Rate ($/hr)</span><input type="number" min="0" value={job.hourly_rate} onChange={e => setJob({...job, hourly_rate: e.target.value})} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none" /></div>
              <div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">Notes for {firstName} (optional)</span><input value={job.notes} onChange={e => setJob({...job, notes: e.target.value})} placeholder="Any instructions or details" className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none" /></div>
              {job.start_time && job.end_time && job.hourly_rate && parseFloat(job.hourly_rate) > 0 && (() => {
                const h = Math.round(((new Date(`2000-01-01T${job.end_time}`) - new Date(`2000-01-01T${job.start_time}`)) / 3600000) * 4) / 4;
                if (h <= 0) return null;
                return <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-lg p-3"><div className="flex justify-between text-sm"><span className="text-stone-400">{h} hrs × ${job.hourly_rate}/hr</span><span className="text-emerald-400 font-bold text-lg">${(h * parseFloat(job.hourly_rate)).toFixed(2)}</span></div></div>;
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
            <h2 className="text-stone-100 font-bold text-xl mb-2">Job sent!</h2>
            <p className="text-stone-500 text-sm mb-6">{firstName} will see this in their GigTab. Once the work is done and hours are confirmed, you can pay them with one tap.</p>
            <div className="space-y-3">
              <button onClick={() => { setMode('home'); setJob({ title: '', job_date: '', start_time: '', end_time: '', hourly_rate: '15', notes: '' }); }} className="text-emerald-400 font-semibold text-sm cursor-pointer block mx-auto">{firstName}'s profile</button>
              <a href="/" className="text-stone-600 text-xs cursor-pointer block">Go to my GigTab dashboard</a>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-stone-900 text-center space-y-3">
          <a href="/" className="inline-flex items-center gap-2 text-stone-500 hover:text-emerald-400 text-sm font-semibold transition-colors">
            <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
            Get your own GigTab — it's free
          </a>
          <p className="text-stone-700 text-xs">One link for all your payment methods. Share with anyone who pays you.</p>
        </div>
      </div>
    </div>
  );
}
