'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

function getSupabase() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function getPayLink(method, handle, amount, note) {
  const n = encodeURIComponent(note || 'Payment');
  if (method === 'venmo') return `https://venmo.com/${handle}?txn=pay&amount=${amount}&note=${n}`;
  if (method === 'paypal') return `https://paypal.me/${handle}/${amount}`;
  if (method === 'cashapp') return `https://cash.app/$${handle}/${amount}`;
  return null;
}

const methodMeta = {
  venmo: { label: 'Venmo', color: '#008CFF', bg: 'bg-[#008CFF]', prefix: '@' },
  paypal: { label: 'PayPal', color: '#0070BA', bg: 'bg-[#0070BA]', prefix: '' },
  cashapp: { label: 'Cash App', color: '#00D632', bg: 'bg-[#00D632]', prefix: '$' },
  zelle: { label: 'Zelle', color: '#6D1ED4', bg: 'bg-[#6D1ED4]', prefix: '' },
};

export default function PublicProfile({ params }) {
  const { slug } = params;
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const supabase = getSupabase();
    supabase.from('workers').select('name, slug, payment_methods, preferred_method')
      .eq('slug', slug).maybeSingle()
      .then(({ data }) => { setWorker(data); setLoading(false); });
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center">
      <div className="animate-pulse text-stone-500 text-sm">Loading...</div>
    </div>
  );

  if (!worker) return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6">
      <div className="text-4xl mb-4 opacity-40">🔍</div>
      <h1 className="text-stone-300 font-bold text-lg mb-2">Profile not found</h1>
      <p className="text-stone-500 text-sm">This GigTab profile doesn't exist or hasn't been set up yet.</p>
    </div>
  );

  const methods = worker.payment_methods || [];
  const preferred = methods.find(m => m.type === worker.preferred_method) || methods[0];
  const initials = worker.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,700;9..40,900&display=swap" rel="stylesheet" />

      <div className="max-w-md mx-auto px-5 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mx-auto mb-4 text-2xl font-black text-black">
            {initials}
          </div>
          <h1 className="text-2xl font-black text-stone-100">{worker.name}</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <span className="text-stone-500 text-sm">GigTab Profile</span>
          </div>
        </div>

        {/* Amount input (optional) */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 mb-5">
          <p className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-3">Pay {worker.name?.split(' ')[0]}</p>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-stone-500 text-2xl font-bold">$</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent text-3xl font-black text-stone-100 placeholder:text-stone-700 focus:outline-none"
            />
          </div>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="What's this for? (optional)"
            className="w-full bg-stone-800/50 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-300 text-sm placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Payment buttons */}
        {methods.length > 0 ? (
          <div className="space-y-3">
            {/* Preferred method gets the big button */}
            {preferred && (() => {
              const meta = methodMeta[preferred.type] || {};
              const link = getPayLink(preferred.type, preferred.handle, amount || '0', note || `Pay ${worker.name}`);
              return (
                <a href={link || '#'} target="_blank" rel="noopener noreferrer"
                  className={`block w-full ${meta.bg} text-white font-bold text-base py-4 rounded-xl text-center transition-transform hover:scale-[1.02] active:scale-[0.98]`}
                  style={preferred.type === 'cashapp' ? { color: 'black' } : {}}>
                  {amount ? `Pay $${parseFloat(amount).toFixed(2)} with ${meta.label}` : `Pay with ${meta.label}`}
                </a>
              );
            })()}

            {/* Other methods */}
            {methods.filter(m => m !== preferred).map(m => {
              const meta = methodMeta[m.type] || {};
              const link = getPayLink(m.type, m.handle, amount || '0', note || `Pay ${worker.name}`);
              if (m.type === 'zelle') {
                return (
                  <div key={m.type} className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: meta.color }} />
                        <span className="text-stone-300 text-sm font-medium">{meta.label}</span>
                      </div>
                      <span className="text-stone-400 text-sm font-mono">{m.handle}</span>
                    </div>
                    <p className="text-stone-600 text-xs mt-1">Open your banking app and send to the above</p>
                  </div>
                );
              }
              return (
                <a key={m.type} href={link || '#'} target="_blank" rel="noopener noreferrer"
                  className="block w-full bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-xl px-4 py-3.5 text-center transition-colors">
                  <div className="flex items-center justify-center gap-2.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: meta.color }} />
                    <span className="text-stone-300 text-sm font-semibold">
                      {amount ? `$${parseFloat(amount).toFixed(2)} via ${meta.label}` : `Pay with ${meta.label}`}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 text-center">
            <p className="text-stone-500 text-sm">{worker.name?.split(' ')[0]} hasn't set up payment methods yet.</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 text-center">
          <a href="/" className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-400 text-xs transition-colors">
            <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            Powered by GigTab — Get your own payment profile
          </a>
        </div>
      </div>
    </div>
  );
}
