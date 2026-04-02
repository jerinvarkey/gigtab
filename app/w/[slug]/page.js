'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

function getSb() { return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { flowType: 'implicit' } }); }

function payLink(method, handle, amount, note) {
  const n = encodeURIComponent(note || 'GigTab');
  if (method === 'venmo') return `https://venmo.com/${handle}?txn=pay&amount=${amount}&note=${n}`;
  if (method === 'paypal') return `https://paypal.me/${handle}/${amount}`;
  if (method === 'cashapp') return `https://cash.app/$${handle}/${amount}`;
  return null;
}

const M = { venmo: { label: 'Venmo', color: '#008CFF', txtClass: 'text-white' }, paypal: { label: 'PayPal', color: '#0070BA', txtClass: 'text-white' }, cashapp: { label: 'Cash App', color: '#00D632', txtClass: 'text-black' }, zelle: { label: 'Zelle', color: '#6D1ED4', txtClass: 'text-white' } };

export default function WorkerProfilePage({ params }) {
  const { slug } = params;
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('home'); // home | pay | job | job-sent
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
    // If no user, prompt sign in
    if (!user) {
      localStorage.setItem('gt_pending_job', JSON.stringify({ ...job, worker_id: worker.id, slug }));
      await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
      return;
    }
    await sb.from('jobs').insert({
      worker_id: worker.id,
      payer_user_id: user.id,
      payer_name: user.user_metadata?.full_name || user.email,
      payer_email: user.email,
      title: job.title,
      job_date: job.job_date || null,
      start_time: job.start_time || null,
      end_time: job.end_time || null,
      hourly_rate: job.hourly_rate ? parseFloat(job.hourly_rate) : null,
      notes: job.notes || null,
      status: 'pending',
    });
    setSending(false);
    setMode('job-sent');
  };

  // Check for pending job after OAuth redirect
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      const pending = localStorage.getItem('gt_pending_job');
      if (pending) {
        const j = JSON.parse(pending);
        localStorage.removeItem('gt_pending_job');
        if (j.slug === slug) {
          const sb = getSb();
          sb.from('jobs').insert({
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
      <a href="/" className="text-emerald-400 text-sm font-semibold hover:text-emerald-300">Create your own GigTab profile →</a>
    </div>
  );

  const methods = worker.payment_methods || [];
  const pref = methods.find(m => m.type === worker.preferred_method) || methods[0];
  const initials = worker.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  const firstName = worker.name?.split(' ')[0] || worker.name;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,900&display=swap" rel="stylesheet" />

      <div className="max-w-md mx-auto px-5 py-8">
        {/* Profile header — always visible */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mx-auto mb-3 text-2xl font-black text-black">{initials}</div>
          <h1 className="text-2xl font-black">{worker.name}</h1>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
            <span className="text-stone-500 text-sm">GigTab</span>
          </div>
        </div>

        {/* HOME: two options */}
        {mode === 'home' && (
          <div className="space-y-3">
            <button onClick={() => setMode('pay')} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base py-4 rounded-xl transition-all cursor-pointer">
              Pay {firstName}
            </button>
            <button onClick={() => setMode('job')} className="w-full bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-base py-4 rounded-xl border border-stone-700 transition-all cursor-pointer">
              Assign {firstName} a Job
            </button>

            {methods.length > 0 && (
              <div className="mt-6">
                <p className="text-stone-600 text-[10px] uppercase tracking-wider font-bold mb-2">Accepts</p>
                <div className="flex gap-2">
                  {methods.map(m => (
                    <div key={m.type} className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: M[m.type]?.color }} />
                      <span className="text-stone-400 text-xs">{M[m.type]?.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {methods.length === 0 && (
              <div className="bg-amber-950/20 border border-amber-800/20 rounded-xl p-4 mt-4">
                <p className="text-amber-400 text-sm font-semibold">{firstName} hasn't set up payment methods yet</p>
                <p className="text-stone-500 text-xs mt-1">Ask them to finish their GigTab profile so you can pay them.</p>
              </div>
            )}
          </div>
        )}

        {/* PAY NOW */}
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

            {methods.length > 0 && (
              <div className="space-y-2.5">
                {/* Preferred method = big button */}
                {pref && (() => {
                  const meta = M[pref.type];
                  const link = payLink(pref.type, pref.handle, amount || '0', note || `Pay ${worker.name}`);
                  if (pref.type === 'zelle') {
                    return (
                      <div className="rounded-xl px-5 py-4" style={{ backgroundColor: meta.color }}>
                        <p className={`font-bold text-base ${meta.txtClass}`}>Zelle: {pref.handle}</p>
                        <p className={`text-sm mt-1 opacity-80 ${meta.txtClass}`}>{amount ? `Send $${parseFloat(amount).toFixed(2)}` : 'Open your banking app'} to the above</p>
                      </div>
                    );
                  }
                  return (
                    <a href={link || '#'} target="_blank" rel="noopener noreferrer"
                      className={`block w-full font-bold text-base py-4 rounded-xl text-center transition-transform hover:scale-[1.01] active:scale-[0.99] ${meta.txtClass}`}
                      style={{ backgroundColor: meta.color }}>
                      {amount ? `Pay $${parseFloat(amount).toFixed(2)} with ${meta.label}` : `Open ${meta.label}`}
                    </a>
                  );
                })()}

                {/* Other methods */}
                {methods.filter(m => m !== pref).map(m => {
                  const meta = M[m.type];
                  const link = payLink(m.type, m.handle, amount || '0', note || `Pay ${worker.name}`);
                  if (m.type === 'zelle') {
                    return <div key={m.type} className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-3"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} /><span className="text-stone-300 text-sm">Zelle: {m.handle}</span></div></div>;
                  }
                  return (
                    <a key={m.type} href={link || '#'} target="_blank" rel="noopener noreferrer"
                      className="block w-full bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-xl px-4 py-3.5 text-center transition-colors">
                      <div className="flex items-center justify-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} /><span className="text-stone-300 text-sm font-semibold">{amount ? `$${parseFloat(amount).toFixed(2)} via ${meta.label}` : meta.label}</span></div>
                    </a>
                  );
                })}
              </div>
            )}

            {methods.length === 0 && (
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

              <div>
                <span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">What's the job?</span>
                <input value={job.title} onChange={e => setJob({...job, title: e.target.value})} placeholder="Presale at YogaSix Sienna"
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50" />
              </div>

              <div>
                <span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">When?</span>
                <input type="date" value={job.job_date} onChange={e => setJob({...job, job_date: e.target.value})}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none focus:border-emerald-500/50" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">Start</span>
                  <input type="time" value={job.start_time} onChange={e => setJob({...job, start_time: e.target.value})}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">End</span>
                  <input type="time" value={job.end_time} onChange={e => setJob({...job, end_time: e.target.value})}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none focus:border-emerald-500/50" />
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">Hourly rate ($)</span>
                <input type="number" value={job.hourly_rate} onChange={e => setJob({...job, hourly_rate: e.target.value})} placeholder="15"
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none focus:border-emerald-500/50" />
              </div>

              <div>
                <span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">Notes (optional)</span>
                <input value={job.notes} onChange={e => setJob({...job, notes: e.target.value})} placeholder="Wear a Degree Wellness shirt"
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50" />
              </div>

              {job.start_time && job.end_time && job.hourly_rate && (() => {
                const hrs = Math.round(((new Date(`2000-01-01T${job.end_time}`) - new Date(`2000-01-01T${job.start_time}`)) / 3600000) * 4) / 4;
                const total = hrs * parseFloat(job.hourly_rate);
                return (
                  <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-lg p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400">{hrs} hrs × ${job.hourly_rate}/hr</span>
                      <span className="text-emerald-400 font-bold text-lg">${total.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <button onClick={createJob} disabled={sending || !job.title}
              className={`w-full font-bold text-base py-4 rounded-xl transition-all cursor-pointer ${!job.title ? 'bg-stone-800 text-stone-600' : 'bg-emerald-500 hover:bg-emerald-400 text-black'}`}>
              {sending ? 'Sending...' : user ? `Send Job to ${firstName}` : `Sign in & Send Job to ${firstName}`}
            </button>

            {!user && <p className="text-stone-600 text-xs text-center">You'll sign in with Google so {firstName} knows who the job is from.</p>}
          </div>
        )}

        {/* JOB SENT CONFIRMATION */}
        {mode === 'job-sent' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 className="text-stone-100 font-bold text-xl mb-2">Job sent to {firstName}!</h2>
            <p className="text-stone-500 text-sm mb-6">They'll see it in their GigTab. Once the work is done and hours are confirmed, you'll be able to pay with one tap.</p>
            <button onClick={() => setMode('home')} className="text-emerald-400 font-semibold text-sm cursor-pointer hover:text-emerald-300">Back to {firstName}'s profile</button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <a href="/" className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-400 text-xs transition-colors">
            <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
            Get your own GigTab — free payment profile
          </a>
        </div>
      </div>
    </div>
  );
}
