'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

function getSb() { return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { flowType: 'implicit' } }); }
const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtDate = d => { try { return new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); } catch { return d||''; } };
function makeSlug(n) { return n.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,14)+Math.random().toString(36).slice(2,5); }
function payUrl(method,handle,amount,note) { const n=encodeURIComponent(note||'GigTab'); if(method==='venmo') return (handle.includes('@')||/^\d{7}/.test(handle.replace(/\D/g,''))) ? `https://venmo.com/?txn=pay&recipients=${encodeURIComponent(handle)}&amount=${amount}&note=${n}` : `https://venmo.com/${handle.replace('@','')}?txn=pay&amount=${amount}&note=${n}`; if(method==='paypal') return (handle.includes('@')||/^\d/.test(handle)) ? null : `https://paypal.me/${handle}/${amount}`; if(method==='cashapp') return `https://cash.app/$${handle.replace('$','')}/${amount}`; return null; }
const PL={venmo:{l:'Venmo',c:'#008CFF',bg:'bg-[#008CFF]'},paypal:{l:'PayPal',c:'#0070BA',bg:'bg-[#0070BA]'},cashapp:{l:'Cash App',c:'#00D632',bg:'bg-[#00D632]'},zelle:{l:'Zelle',c:'#6D1ED4',bg:'bg-[#6D1ED4]'}};
const PI={venmo:{l:'Venmo',input:'Username, phone, or email',ph:'jerin-v',help:'Venmo app → profile icon → username under your name'},paypal:{l:'PayPal',input:'PayPal.me username or email',ph:'jerinv or j@email.com',help:'paypal.me/YOURNAME or your PayPal email'},cashapp:{l:'Cash App',input:'$cashtag (no $)',ph:'jerinv',help:'Cash App → profile → $cashtag at top'},zelle:{l:'Zelle',input:'Phone or email for Zelle',ph:'(713) 555-0123',help:'Phone/email enrolled in your banking app'}};

// ============================================================
// UI Components
// ============================================================
function Toast({msg}){if(!msg)return null;return<div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--gt-accent)] text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-lg z-50">{msg}</div>;}

const Btn=({children,onClick,v='primary',disabled,className='',href})=>{
  const vs={primary:'bg-[var(--gt-accent)] hover:bg-[#e55a35] text-white shadow-sm',secondary:'bg-white hover:bg-gray-50 text-[var(--gt-text)] border border-[var(--gt-border)] shadow-sm',ghost:'text-[var(--gt-muted)] hover:text-[var(--gt-text)] hover:bg-[var(--gt-accent-light)]',success:'bg-[var(--gt-success)] hover:bg-[#1da366] text-white',google:'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm'};
  const cls=`font-bold text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-2 ${vs[v]} ${disabled?'opacity-40 cursor-not-allowed':''} ${className}`;
  if(href)return<a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>;
  return<button onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
};

const Card=({children,className=''})=><div className={`bg-white border border-[var(--gt-border)] rounded-2xl p-5 shadow-sm ${className}`}>{children}</div>;
const Input=({label,...p})=><label className="block">{label&&<span className="text-xs font-bold text-[var(--gt-muted)] mb-1.5 block uppercase tracking-wider">{label}</span>}<input {...p} className={`w-full bg-[var(--gt-bg)] border border-[var(--gt-border)] rounded-xl px-4 py-3 text-[var(--gt-text)] text-sm placeholder:text-[var(--gt-light)] focus:outline-none focus:border-[var(--gt-accent)] focus:ring-2 focus:ring-[var(--gt-accent-light)] transition-all ${p.className||''}`}/></label>;
const Select=({label,children,...p})=><label className="block">{label&&<span className="text-xs font-bold text-[var(--gt-muted)] mb-1.5 block uppercase tracking-wider">{label}</span>}<select {...p} className="w-full bg-[var(--gt-bg)] border border-[var(--gt-border)] rounded-xl px-4 py-3 text-[var(--gt-text)] text-sm focus:outline-none focus:border-[var(--gt-accent)]">{children}</select></label>;
const Badge=({children,color='gray'})=>{const c={gray:'bg-gray-100 text-gray-600',green:'bg-[var(--gt-success-light)] text-[var(--gt-success)]',yellow:'bg-[var(--gt-warn-light)] text-[var(--gt-warn)]',red:'bg-red-50 text-red-500',blue:'bg-[var(--gt-info-light)] text-[var(--gt-info)]',accent:'bg-[var(--gt-accent-light)] text-[var(--gt-accent)]'};return<span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${c[color]}`}>{children}</span>;};
function Modal({open,onClose,title,children}){if(!open)return null;return<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}><div className="absolute inset-0 bg-black/30"/><div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between p-5 border-b border-[var(--gt-border)]"><h3 className="text-lg font-extrabold text-[var(--gt-text)]">{title}</h3><button onClick={onClose} className="text-[var(--gt-light)] hover:text-[var(--gt-text)] text-2xl cursor-pointer leading-none">×</button></div><div className="p-5">{children}</div></div></div>;}

// ============================================================
// LANDING PAGE
// ============================================================
function Landing({supabase}){
  const [email,setEmail]=useState('');const [loading,setLoading]=useState(false);const [sent,setSent]=useState(false);
  const google=async()=>{setLoading(true);await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});};
  const magic=async()=>{if(!email)return;setLoading(true);const{error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin}});setLoading(false);if(!error)setSent(true);};

  if(sent)return<div className="min-h-screen bg-[var(--gt-bg)] flex flex-col items-center justify-center p-6"><Card className="max-w-sm w-full text-center space-y-4"><div className="w-14 h-14 rounded-full bg-[var(--gt-success-light)] flex items-center justify-center mx-auto"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gt-success)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div><h2 className="text-xl font-extrabold">Check your email!</h2><p className="text-[var(--gt-muted)] text-sm">We sent a link to <strong className="text-[var(--gt-text)]">{email}</strong></p><button onClick={()=>setSent(false)} className="text-[var(--gt-accent)] text-sm font-bold cursor-pointer">Try a different email</button></Card></div>;

  return(
    <div className="min-h-screen bg-[var(--gt-bg)]">
      {/* Nav */}
      <nav className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl bg-[var(--gt-accent)] flex items-center justify-center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><span className="font-black text-lg text-[var(--gt-text)]">GigTab</span></div>
        <button onClick={google} disabled={loading} className="bg-[var(--gt-accent)] text-white font-bold text-sm px-5 py-2.5 rounded-xl cursor-pointer hover:bg-[#e55a35] transition-colors">Sign Up Free</button>
      </nav>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-5 pt-12 pb-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-black text-[var(--gt-text)] leading-tight mb-4">Stop asking<br/><span className="text-[var(--gt-accent)]">"what's your Venmo?"</span></h1>
        <p className="text-lg text-[var(--gt-muted)] max-w-md mx-auto mb-8">One link for all your payment info. Share it with anyone. Pay people, split costs, hire gig workers.</p>

        <Card className="max-w-sm mx-auto space-y-3">
          <button onClick={google} disabled={loading} className="w-full bg-white hover:bg-gray-50 text-gray-700 font-bold text-sm px-5 py-3 rounded-xl border border-gray-300 shadow-sm cursor-pointer inline-flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
          <div className="flex items-center gap-3"><div className="flex-1 h-px bg-[var(--gt-border)]"/><span className="text-[var(--gt-light)] text-xs font-bold">OR</span><div className="flex-1 h-px bg-[var(--gt-border)]"/></div>
          <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com"/>
          <Btn onClick={magic} disabled={loading||!email} className="w-full">{loading?'Sending...':'Get Started with Email'}</Btn>
        </Card>
      </div>

      {/* How it works */}
      <div className="max-w-3xl mx-auto px-5 pb-16">
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {icon:'💸',title:'Pay Anyone',desc:'Enter their phone or name. Send money to their Venmo, PayPal, Zelle, or Cash App. Never ask for payment info again.'},
            {icon:'🎟',title:'Split & Collect',desc:'Create an event like "Basketball $9 each." Share the link. Everyone sees your payment info and the exact amount.'},
            {icon:'📋',title:'Hire & Track',desc:'Post a gig, invite workers, log hours, approve, and pay. Perfect for temp workers, babysitters, contractors.'},
          ].map((f,i)=><Card key={i} className="text-center"><p className="text-3xl mb-3">{f.icon}</p><h3 className="font-extrabold text-base mb-1">{f.title}</h3><p className="text-[var(--gt-muted)] text-sm">{f.desc}</p></Card>)}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SETUP
// ============================================================
function Setup({user,supabase,onDone}){
  const [name,setName]=useState(user.user_metadata?.full_name||'');const [loading,setLoading]=useState(false);
  const create=async()=>{if(!name.trim())return;setLoading(true);await supabase.from('users').insert({auth_id:user.id,name:name.trim(),slug:makeSlug(name),email:user.email,payment_methods:[],payer_names:[]});setLoading(false);onDone();};
  return<div className="min-h-screen bg-[var(--gt-bg)] flex flex-col items-center justify-center p-6">
    <Card className="w-full max-w-sm space-y-5">
      <div className="text-center"><div className="w-14 h-14 rounded-2xl bg-[var(--gt-accent)] flex items-center justify-center mx-auto mb-3"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><h2 className="text-xl font-extrabold">Welcome to GigTab!</h2><p className="text-[var(--gt-muted)] text-sm mt-1">What should people call you?</p></div>
      <Input label="Your name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/>
      <Btn onClick={create} disabled={loading||!name.trim()} className="w-full">{loading?'Setting up...':'Create My GigTab'}</Btn>
    </Card>
  </div>;
}

// ============================================================
// DASHBOARD
// ============================================================
function Dash({u,supabase,reload,signOut}){
  const [page,setPage]=useState('home');
  const [toast,setToast]=useState('');
  const show=m=>{setToast(m);setTimeout(()=>setToast(''),2000);};
  const [jobs,setJobs]=useState([]);const [myJw,setMyJw]=useState([]);const [myJobs,setMyJobs]=useState([]);const [jwForMyJobs,setJwForMyJobs]=useState([]);const [workerMap,setWorkerMap]=useState({});
  const [events,setEvents]=useState([]);const [contacts,setContacts]=useState([]);const [contactUsers,setContactUsers]=useState({});
  const [payments,setPayments]=useState([]);
  const [methods,setMethods]=useState(u.payment_methods||[]);const [pref,setPref]=useState(u.preferred_method||null);
  const baseUrl=typeof window!=='undefined'?window.location.origin:'';

  const loadAll=useCallback(async()=>{
    // Jobs assigned to me
    const {data:jw}=await supabase.from('job_workers').select('*').eq('worker_id',u.id);setMyJw(jw||[]);
    if(jw?.length){const ids=[...new Set(jw.map(j=>j.job_id))];const {data:jb}=await supabase.from('jobs').select('*').in('id',ids);setMyJobs(jb||[]);}else setMyJobs([]);
    // Jobs I created
    const {data:cj}=await supabase.from('jobs').select('*').eq('created_by',u.id).order('created_at',{ascending:false});setJobs(cj||[]);
    if(cj?.length){const ids=cj.map(j=>j.id);const {data:jw2}=await supabase.from('job_workers').select('*').in('job_id',ids);setJwForMyJobs(jw2||[]);
    const wids=[...new Set((jw2||[]).map(w=>w.worker_id))];if(wids.length){const{data:wp}=await supabase.from('users').select('id,name,email,payment_methods,preferred_method').in('id',wids);const m={};(wp||[]).forEach(x=>m[x.id]=x);setWorkerMap(m);}}
    // Events
    const {data:ev}=await supabase.from('events').select('*').eq('created_by',u.id).order('created_at',{ascending:false});setEvents(ev||[]);
    // Contacts
    const {data:ct}=await supabase.from('contacts').select('*').eq('owner_id',u.id);setContacts(ct||[]);
    if(ct?.length){const cids=ct.map(c=>c.contact_id);const{data:cu}=await supabase.from('users').select('id,name,email,slug,payment_methods,preferred_method').in('id',cids);const m={};(cu||[]).forEach(x=>m[x.id]=x);setContactUsers(m);}
    // Payments
    const {data:py}=await supabase.from('payments').select('*').or(`payer_id.eq.${u.id},receiver_id.eq.${u.id}`).order('paid_at',{ascending:false});setPayments(py||[]);
  },[u.id]);

  useEffect(()=>{loadAll();},[loadAll]);

  const save=async up=>{await supabase.from('users').update(up).eq('id',u.id);reload();};
  const nav=p=>{setPage(p);loadAll();};

  // Payment method management
  const [addingPm,setAddingPm]=useState(false);const [editPm,setEditPm]=useState(null);const [nmPm,setNmPm]=useState({type:'venmo',handle:''});const [helpPm,setHelpPm]=useState(false);
  const savePm=()=>{if(!nmPm.handle)return;let up;if(editPm){up=methods.map(m=>m.id===editPm?{...m,type:nmPm.type,handle:nmPm.handle}:m);}else{const ex=methods.find(m=>m.type===nmPm.type);up=ex?methods.map(m=>m.type===nmPm.type?{...m,handle:nmPm.handle}:m):[...methods,{type:nmPm.type,handle:nmPm.handle,id:Math.random().toString(36).substr(2,9)}];}setMethods(up);if(!pref)setPref(nmPm.type);setAddingPm(false);setEditPm(null);setHelpPm(false);setNmPm({type:'venmo',handle:''});save({payment_methods:up,preferred_method:pref||nmPm.type});show('Saved!');};
  const availPmTypes=Object.keys(PI).filter(t=>editPm||!methods.find(m=>m.type===t));
  const pi=PI[nmPm.type];

  // Job creation
  const [showNewJob,setShowNewJob]=useState(false);
  const [nj,setNj]=useState({title:'',payer_name:'',job_date:'',start_time:'',end_time:'',hourly_rate:'15',notes:''});
  const createJob=async()=>{if(!nj.title||!nj.payer_name)return;const{data:j}=await supabase.from('jobs').insert({created_by:u.id,payer_name:nj.payer_name,title:nj.title,job_date:nj.job_date||null,start_time:nj.start_time||null,end_time:nj.end_time||null,hourly_rate:nj.hourly_rate?parseFloat(nj.hourly_rate):null,notes:nj.notes||null}).select().maybeSingle();
  if(j&&!u.payer_names?.includes(nj.payer_name)){await supabase.from('users').update({payer_names:[...(u.payer_names||[]),nj.payer_name]}).eq('id',u.id);reload();}
  setShowNewJob(false);setNj({title:'',payer_name:nj.payer_name,job_date:'',start_time:'',end_time:'',hourly_rate:'15',notes:''});loadAll();show('Job created! Copy the invite link to share.');};

  // Event creation
  const [showNewEvent,setShowNewEvent]=useState(false);
  const [ne,setNe]=useState({title:'',amount:'',notes:''});
  const createEvent=async()=>{if(!ne.title||!ne.amount)return;await supabase.from('events').insert({created_by:u.id,title:ne.title,amount:parseFloat(ne.amount),notes:ne.notes||null});setShowNewEvent(false);setNe({title:'',amount:'',notes:''});loadAll();show('Event created!');};

  // Job worker actions
  const updateJw=async(id,up)=>{await supabase.from('job_workers').update(up).eq('id',id);loadAll();};
  const markPaid=async(jw,job)=>{const w=workerMap[jw.worker_id];const amt=jw.hours_logged*(job.hourly_rate||0);if(amt<=0)return;await supabase.from('payments').insert({payer_id:u.id,receiver_id:jw.worker_id,job_worker_id:jw.id,payer_name:job.payer_name,amount:amt,method:w?.preferred_method||'manual'});await supabase.from('job_workers').update({status:'paid'}).eq('id',jw.id);await supabase.from('contacts').upsert({owner_id:u.id,contact_id:jw.worker_id},{onConflict:'owner_id,contact_id'});loadAll();show('Marked paid!');};

  // Header
  const Header=()=><header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[var(--gt-border)]"><div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
    <button onClick={()=>nav('home')} className="flex items-center gap-2 cursor-pointer"><div className="w-8 h-8 rounded-xl bg-[var(--gt-accent)] flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><span className="font-black text-base">GigTab</span></button>
    <div className="flex items-center gap-3"><button onClick={()=>nav('profile')} className="text-sm font-bold text-[var(--gt-accent)] cursor-pointer hover:underline">{u.name}</button><button onClick={signOut} className="text-[var(--gt-light)] hover:text-red-400 text-xs font-bold cursor-pointer">Sign Out</button></div>
  </div></header>;

  // HOME
  if(page==='home') return <div className="min-h-screen bg-[var(--gt-bg)]"><Toast msg={toast}/><Header/>
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-3">
        <button onClick={()=>nav('pay')} className="bg-white border border-[var(--gt-border)] rounded-2xl p-5 text-left cursor-pointer hover:border-[var(--gt-accent)] hover:shadow-md transition-all group">
          <p className="text-2xl mb-2">💸</p><p className="font-extrabold text-base group-hover:text-[var(--gt-accent)]">Pay Someone</p><p className="text-[var(--gt-muted)] text-xs mt-1">Send money to anyone with their payment info on file</p>
        </button>
        <button onClick={()=>setShowNewEvent(true)} className="bg-white border border-[var(--gt-border)] rounded-2xl p-5 text-left cursor-pointer hover:border-[var(--gt-accent)] hover:shadow-md transition-all group">
          <p className="text-2xl mb-2">🎟</p><p className="font-extrabold text-base group-hover:text-[var(--gt-accent)]">Create Event</p><p className="text-[var(--gt-muted)] text-xs mt-1">Split a cost — basketball, dinner, group trip</p>
        </button>
        <button onClick={()=>setShowNewJob(true)} className="bg-white border border-[var(--gt-border)] rounded-2xl p-5 text-left cursor-pointer hover:border-[var(--gt-accent)] hover:shadow-md transition-all group">
          <p className="text-2xl mb-2">📋</p><p className="font-extrabold text-base group-hover:text-[var(--gt-accent)]">Create Job</p><p className="text-[var(--gt-muted)] text-xs mt-1">Hire someone for a shift or gig</p>
        </button>
      </div>

      {/* Profile link */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0"><p className="text-xs font-bold text-[var(--gt-muted)] uppercase tracking-wider mb-1">My Payment Link</p><p className="text-sm font-bold text-[var(--gt-accent)] truncate">{baseUrl}/w/{u.slug}</p></div>
          <button onClick={()=>{navigator.clipboard?.writeText(`${baseUrl}/w/${u.slug}`);show('Link copied!');}} className="bg-[var(--gt-accent-light)] text-[var(--gt-accent)] font-bold text-xs px-4 py-2 rounded-xl cursor-pointer hover:bg-[var(--gt-accent)] hover:text-white transition-colors">Copy</button>
        </div>
        {methods.length===0&&<p className="text-[var(--gt-warn)] text-xs font-bold mt-2 cursor-pointer" onClick={()=>nav('profile')}>⚠ Add a payment method so people can pay you →</p>}
      </Card>

      {/* Pending items */}
      {myJw.filter(j=>j.status==='pending').length>0&&<Card className="border-[var(--gt-warn)] border-2"><p className="font-extrabold text-sm mb-3">🔔 You have {myJw.filter(j=>j.status==='pending').length} job invitation{myJw.filter(j=>j.status==='pending').length>1?'s':''}</p><Btn onClick={()=>nav('myjobs')}>View Invitations</Btn></Card>}
      {jwForMyJobs.filter(j=>j.status==='hours_submitted').length>0&&<Card className="border-[var(--gt-info)] border-2"><p className="font-extrabold text-sm mb-3">⏰ {jwForMyJobs.filter(j=>j.status==='hours_submitted').length} worker{jwForMyJobs.filter(j=>j.status==='hours_submitted').length>1?'s':''} waiting for your approval</p><Btn onClick={()=>nav('jobsout')}>Review & Approve</Btn></Card>}

      {/* Recent activity */}
      {payments.length>0&&<div><p className="text-xs font-bold text-[var(--gt-muted)] uppercase tracking-wider mb-3">Recent Activity</p>
      {payments.slice(0,5).map(p=><div key={p.id} className="flex items-center justify-between py-3 border-b border-[var(--gt-border)] last:border-0"><div><p className="text-sm font-bold">{p.payer_id===u.id?`Paid ${p.payer_name||'someone'}`:`Received from ${p.payer_name||'someone'}`}</p>{p.note&&<p className="text-[var(--gt-muted)] text-xs">{p.note}</p>}</div><p className={`font-extrabold text-sm ${p.payer_id===u.id?'text-red-400':'text-[var(--gt-success)]'}`}>{p.payer_id===u.id?'-':'+'}${p.amount.toFixed(2)}</p></div>)}</div>}

      {/* Nav to other sections */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={()=>nav('myjobs')} className="bg-white border border-[var(--gt-border)] rounded-xl p-4 text-left cursor-pointer hover:border-[var(--gt-accent)] transition-colors"><p className="font-bold text-sm">My Jobs</p><p className="text-[var(--gt-muted)] text-xs">Jobs assigned to you</p></button>
        <button onClick={()=>nav('jobsout')} className="bg-white border border-[var(--gt-border)] rounded-xl p-4 text-left cursor-pointer hover:border-[var(--gt-accent)] transition-colors"><p className="font-bold text-sm">Jobs I Assigned</p><p className="text-[var(--gt-muted)] text-xs">Manage & pay workers</p></button>
        <button onClick={()=>nav('events')} className="bg-white border border-[var(--gt-border)] rounded-xl p-4 text-left cursor-pointer hover:border-[var(--gt-accent)] transition-colors"><p className="font-bold text-sm">My Events</p><p className="text-[var(--gt-muted)] text-xs">Payment requests you created</p></button>
        <button onClick={()=>nav('profile')} className="bg-white border border-[var(--gt-border)] rounded-xl p-4 text-left cursor-pointer hover:border-[var(--gt-accent)] transition-colors"><p className="font-bold text-sm">My Profile</p><p className="text-[var(--gt-muted)] text-xs">Payment methods & link</p></button>
      </div>

      {/* Create modals */}
      <Modal open={showNewJob} onClose={()=>setShowNewJob(false)} title="Create a Job">
        <div className="space-y-4">
          <div><span className="text-xs font-bold text-[var(--gt-muted)] mb-1.5 block uppercase tracking-wider">Paying as *</span>
          {u.payer_names?.length>0&&<div className="flex flex-wrap gap-2 mb-2">{u.payer_names.map(n=><button key={n} onClick={()=>setNj({...nj,payer_name:n})} className={`text-xs px-3 py-1.5 rounded-lg cursor-pointer font-bold ${nj.payer_name===n?'bg-[var(--gt-accent-light)] text-[var(--gt-accent)] border border-[var(--gt-accent)]':'bg-[var(--gt-bg)] text-[var(--gt-muted)] border border-[var(--gt-border)]'}`}>{n}</button>)}</div>}
          <input value={nj.payer_name} onChange={e=>setNj({...nj,payer_name:e.target.value})} placeholder="Company name or your name" className="w-full bg-[var(--gt-bg)] border border-[var(--gt-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--gt-accent)]"/></div>
          <Input label="Job title *" value={nj.title} onChange={e=>setNj({...nj,title:e.target.value})} placeholder="Presale at YogaSix"/>
          <Input label="Date" type="date" value={nj.job_date} onChange={e=>setNj({...nj,job_date:e.target.value})}/>
          <div className="grid grid-cols-2 gap-3"><Input label="Start" type="time" value={nj.start_time} onChange={e=>setNj({...nj,start_time:e.target.value})}/><Input label="End" type="time" value={nj.end_time} onChange={e=>setNj({...nj,end_time:e.target.value})}/></div>
          <Input label="Rate ($/hr)" type="number" min="0" value={nj.hourly_rate} onChange={e=>setNj({...nj,hourly_rate:e.target.value})}/>
          <Input label="Notes" value={nj.notes} onChange={e=>setNj({...nj,notes:e.target.value})} placeholder="Instructions for workers"/>
          <Btn onClick={createJob} disabled={!nj.title||!nj.payer_name} className="w-full">Create Job</Btn>
        </div>
      </Modal>

      <Modal open={showNewEvent} onClose={()=>setShowNewEvent(false)} title="Create an Event">
        <div className="space-y-4">
          <Input label="What is it? *" value={ne.title} onChange={e=>setNe({...ne,title:e.target.value})} placeholder="Basketball Tuesday"/>
          <Input label="Amount each person owes *" type="number" min="0.01" step="0.01" value={ne.amount} onChange={e=>setNe({...ne,amount:e.target.value})} placeholder="9.00"/>
          <Input label="Notes" value={ne.notes} onChange={e=>setNe({...ne,notes:e.target.value})} placeholder="At the park at 6pm"/>
          <Btn onClick={createEvent} disabled={!ne.title||!ne.amount} className="w-full">Create Event</Btn>
          <p className="text-[var(--gt-muted)] text-xs text-center">You'll get a shareable link to drop in your group chat.</p>
        </div>
      </Modal>
    </main>
  </div>;

  // PAY SOMEONE
  if(page==='pay') return <div className="min-h-screen bg-[var(--gt-bg)]"><Toast msg={toast}/><Header/><main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
    <div className="flex items-center gap-3"><button onClick={()=>nav('home')} className="text-[var(--gt-muted)] text-sm cursor-pointer font-bold hover:text-[var(--gt-text)]">← Home</button><h2 className="font-extrabold text-lg">Pay Someone</h2></div>
    {contacts.length>0&&<div><p className="text-xs font-bold text-[var(--gt-muted)] uppercase tracking-wider mb-3">Your Contacts</p>{contacts.map(c=>{const cu=contactUsers[c.contact_id];if(!cu)return null;return<div key={c.id} className="flex items-center justify-between py-3 border-b border-[var(--gt-border)] last:border-0"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[var(--gt-accent-light)] flex items-center justify-center text-sm font-bold text-[var(--gt-accent)]">{cu.name?.charAt(0)}</div><div><p className="font-bold text-sm">{cu.name}</p><p className="text-[var(--gt-muted)] text-xs">{cu.email}</p></div></div><a href={`/w/${cu.slug}`} className="bg-[var(--gt-accent)] text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer hover:bg-[#e55a35]">Pay</a></div>;})}</div>}
    <Card><p className="font-bold text-sm mb-2">Pay someone new?</p><p className="text-[var(--gt-muted)] text-xs mb-3">Ask them for their GigTab link, or search by name:</p><Input placeholder="Search by name or email..." /></Card>
  </main></div>;

  // MY JOBS (assigned to me)
  if(page==='myjobs') return <div className="min-h-screen bg-[var(--gt-bg)]"><Toast msg={toast}/><Header/><main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
    <div className="flex items-center gap-3"><button onClick={()=>nav('home')} className="text-[var(--gt-muted)] text-sm cursor-pointer font-bold">← Home</button><h2 className="font-extrabold text-lg">My Jobs</h2></div>
    {myJw.length===0&&<Card className="text-center py-8"><p className="text-3xl mb-3">📋</p><p className="font-bold mb-1">No jobs yet</p><p className="text-[var(--gt-muted)] text-xs">When someone assigns you work, it shows here.</p></Card>}
    {['pending','accepted','hours_submitted','approved','paid'].map(st=>{const g=myJw.filter(j=>j.status===st);if(!g.length)return null;const lb={pending:'New Invitations',accepted:'Active',hours_submitted:'Hours Submitted',approved:'Approved',paid:'Paid'};const cl={pending:'text-[var(--gt-warn)]',accepted:'text-[var(--gt-info)]',hours_submitted:'text-purple-500',approved:'text-[var(--gt-success)]',paid:'text-[var(--gt-success)]'};
    return<div key={st}><p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${cl[st]}`}>{lb[st]} ({g.length})</p>{g.map(jw=>{const job=myJobs.find(j=>j.id===jw.job_id);if(!job)return null;
    return<Card key={jw.id} className="mb-3"><p className="font-bold">{job.title}</p><p className="text-[var(--gt-muted)] text-xs">From <strong>{job.payer_name}</strong>{job.job_date?` · ${fmtDate(job.job_date)}`:''}{job.hourly_rate?` · ${fmt(job.hourly_rate)}/hr`:''}</p>
    {st==='pending'&&<div className="flex gap-2 mt-3"><Btn onClick={()=>updateJw(jw.id,{status:'accepted'})}>Accept</Btn><Btn onClick={()=>updateJw(jw.id,{status:'declined'})} v="ghost">Decline</Btn></div>}
    {st==='accepted'&&<div className="mt-3"><Btn onClick={()=>{const h=prompt('How many hours did you work?');if(h&&parseFloat(h)>0)updateJw(jw.id,{hours_logged:parseFloat(h),status:'hours_submitted'});}} v="secondary">Log Hours</Btn></div>}
    {jw.hours_logged&&<div className="mt-2 bg-[var(--gt-bg)] rounded-xl px-4 py-2"><div className="flex justify-between text-sm"><span className="text-[var(--gt-muted)]">{jw.hours_logged}h{job.hourly_rate?` × ${fmt(job.hourly_rate)}`:''}</span>{job.hourly_rate&&<span className="font-bold">{fmt(jw.hours_logged*job.hourly_rate)}</span>}</div></div>}
    </Card>;})}</div>;})}
  </main></div>;

  // JOBS I ASSIGNED (outgoing)
  if(page==='jobsout') return <div className="min-h-screen bg-[var(--gt-bg)]"><Toast msg={toast}/><Header/><main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
    <div className="flex items-center justify-between"><div className="flex items-center gap-3"><button onClick={()=>nav('home')} className="text-[var(--gt-muted)] text-sm cursor-pointer font-bold">← Home</button><h2 className="font-extrabold text-lg">Jobs I Assigned</h2></div><Btn onClick={()=>setShowNewJob(true)}>+ New Job</Btn></div>
    {jobs.length===0&&<Card className="text-center py-8"><p className="text-3xl mb-3">📤</p><p className="font-bold mb-1">No jobs yet</p><p className="text-[var(--gt-muted)] text-xs">Create a job and share the invite link.</p></Card>}
    {jobs.map(job=>{const jws=jwForMyJobs.filter(j=>j.job_id===job.id);const inviteUrl=`${baseUrl}/job/${job.invite_code}`;
    return<Card key={job.id} className="mb-3">
      <div className="flex justify-between items-start mb-2"><div><p className="font-bold">{job.title}</p><p className="text-[var(--gt-muted)] text-xs">{job.payer_name}{job.job_date?` · ${fmtDate(job.job_date)}`:''}{job.hourly_rate?` · ${fmt(job.hourly_rate)}/hr`:''}</p></div></div>
      {/* Invite link */}
      <div className="bg-[var(--gt-bg)] rounded-xl px-3 py-2 flex items-center gap-2 mb-3"><span className="text-xs text-[var(--gt-muted)] truncate flex-1">{inviteUrl}</span><button onClick={()=>{navigator.clipboard?.writeText(inviteUrl);show('Invite link copied!');}} className="text-[var(--gt-accent)] text-xs font-bold cursor-pointer whitespace-nowrap">Copy Link</button></div>
      {/* Workers */}
      {jws.length>0&&<div className="space-y-2">{jws.map(jw=>{const w=workerMap[jw.worker_id];const amt=jw.hours_logged&&job.hourly_rate?jw.hours_logged*job.hourly_rate:0;const pm=w?.payment_methods?.find(m=>m.type===w.preferred_method)||w?.payment_methods?.[0];const link=pm&&amt>0?payUrl(pm.type,pm.handle,amt.toFixed(2),`${job.payer_name} - ${job.title}`):null;
      return<div key={jw.id} className="bg-[var(--gt-bg)] rounded-xl p-3">
        <div className="flex justify-between items-center mb-1"><p className="font-bold text-sm">{w?.name||'Worker'}</p><Badge color={jw.status==='paid'?'green':jw.status==='approved'?'green':jw.status==='hours_submitted'?'yellow':jw.status==='accepted'?'blue':'gray'}>{jw.status.replace('_',' ')}</Badge></div>
        {jw.status==='hours_submitted'&&<div className="mt-2"><div className="flex justify-between text-sm mb-2"><span className="text-[var(--gt-muted)]">{jw.hours_logged}h{job.hourly_rate?` × ${fmt(job.hourly_rate)}`:''}</span>{amt>0&&<span className="font-bold">{fmt(amt)}</span>}</div><div className="flex gap-2"><Btn onClick={()=>{updateJw(jw.id,{status:'approved',approved_at:new Date().toISOString()});show('Approved!');}}>Approve</Btn><Btn onClick={()=>updateJw(jw.id,{status:'accepted',hours_logged:null})} v="ghost">Reject</Btn></div></div>}
        {jw.status==='approved'&&amt>0&&<div className="mt-2"><div className="flex justify-between text-sm mb-2"><span className="text-[var(--gt-muted)]">Approved {jw.hours_logged}h</span><span className="font-bold text-[var(--gt-success)]">{fmt(amt)}</span></div><div className="flex flex-wrap gap-2">{link?<Btn href={link} v="success">Pay {fmt(amt)} via {PL[pm.type]?.l} →</Btn>:pm?<p className="text-xs text-[var(--gt-muted)]">{PL[pm.type]?.l}: {pm.handle} — send {fmt(amt)}</p>:<p className="text-xs text-[var(--gt-warn)]">Worker needs to add payment method. <button onClick={()=>{navigator.clipboard?.writeText(`${baseUrl}/w/${w?.slug||''}`);show('Profile link copied!');}} className="text-[var(--gt-accent)] font-bold cursor-pointer">Copy their setup link</button></p>}<Btn onClick={()=>markPaid(jw,job)} v="secondary">Mark Paid</Btn></div></div>}
        {jw.status==='paid'&&<p className="text-[var(--gt-success)] text-xs font-bold mt-1">Paid {fmt(amt)}</p>}
      </div>;})}
      </div>}
      {jws.length===0&&<p className="text-[var(--gt-muted)] text-xs">No workers yet. Share the invite link above.</p>}
    </Card>;})}
    <Modal open={showNewJob} onClose={()=>setShowNewJob(false)} title="Create a Job"><div className="space-y-4">
      <div><span className="text-xs font-bold text-[var(--gt-muted)] mb-1.5 block uppercase tracking-wider">Paying as *</span>{u.payer_names?.length>0&&<div className="flex flex-wrap gap-2 mb-2">{u.payer_names.map(n=><button key={n} onClick={()=>setNj({...nj,payer_name:n})} className={`text-xs px-3 py-1.5 rounded-lg cursor-pointer font-bold ${nj.payer_name===n?'bg-[var(--gt-accent-light)] text-[var(--gt-accent)] border border-[var(--gt-accent)]':'bg-[var(--gt-bg)] text-[var(--gt-muted)] border border-[var(--gt-border)]'}`}>{n}</button>)}</div>}<input value={nj.payer_name} onChange={e=>setNj({...nj,payer_name:e.target.value})} placeholder="Company or your name" className="w-full bg-[var(--gt-bg)] border border-[var(--gt-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--gt-accent)]"/></div>
      <Input label="Job title *" value={nj.title} onChange={e=>setNj({...nj,title:e.target.value})} placeholder="Presale at YogaSix"/><Input label="Date" type="date" value={nj.job_date} onChange={e=>setNj({...nj,job_date:e.target.value})}/><div className="grid grid-cols-2 gap-3"><Input label="Start" type="time" value={nj.start_time} onChange={e=>setNj({...nj,start_time:e.target.value})}/><Input label="End" type="time" value={nj.end_time} onChange={e=>setNj({...nj,end_time:e.target.value})}/></div><Input label="Rate ($/hr)" type="number" value={nj.hourly_rate} onChange={e=>setNj({...nj,hourly_rate:e.target.value})}/><Btn onClick={createJob} disabled={!nj.title||!nj.payer_name} className="w-full">Create Job</Btn>
    </div></Modal>
  </main></div>;

  // EVENTS
  if(page==='events') return <div className="min-h-screen bg-[var(--gt-bg)]"><Toast msg={toast}/><Header/><main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
    <div className="flex items-center justify-between"><div className="flex items-center gap-3"><button onClick={()=>nav('home')} className="text-[var(--gt-muted)] text-sm cursor-pointer font-bold">← Home</button><h2 className="font-extrabold text-lg">My Events</h2></div><Btn onClick={()=>setShowNewEvent(true)}>+ New Event</Btn></div>
    {events.length===0&&<Card className="text-center py-8"><p className="text-3xl mb-3">🎟</p><p className="font-bold mb-1">No events yet</p><p className="text-[var(--gt-muted)] text-xs">Create one and share the link in your group chat.</p></Card>}
    {events.map(ev=>{const evUrl=`${baseUrl}/e/${ev.invite_code}`;return<Card key={ev.id} className="mb-3"><div className="flex justify-between items-start"><div><p className="font-bold">{ev.title}</p><p className="text-[var(--gt-accent)] font-extrabold text-lg">{fmt(ev.amount)} each</p>{ev.notes&&<p className="text-[var(--gt-muted)] text-xs mt-0.5">{ev.notes}</p>}</div></div><div className="bg-[var(--gt-bg)] rounded-xl px-3 py-2 flex items-center gap-2 mt-3"><span className="text-xs text-[var(--gt-muted)] truncate flex-1">{evUrl}</span><button onClick={()=>{navigator.clipboard?.writeText(evUrl);show('Event link copied!');}} className="text-[var(--gt-accent)] text-xs font-bold cursor-pointer whitespace-nowrap">Copy Link</button></div></Card>;})}
    <Modal open={showNewEvent} onClose={()=>setShowNewEvent(false)} title="Create Event"><div className="space-y-4"><Input label="What is it? *" value={ne.title} onChange={e=>setNe({...ne,title:e.target.value})} placeholder="Basketball Tuesday"/><Input label="Amount each *" type="number" min="0.01" value={ne.amount} onChange={e=>setNe({...ne,amount:e.target.value})} placeholder="9.00"/><Input label="Notes" value={ne.notes} onChange={e=>setNe({...ne,notes:e.target.value})} placeholder="At the park at 6pm"/><Btn onClick={createEvent} disabled={!ne.title||!ne.amount} className="w-full">Create Event</Btn></div></Modal>
  </main></div>;

  // PROFILE
  if(page==='profile') return <div className="min-h-screen bg-[var(--gt-bg)]"><Toast msg={toast}/><Header/><main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
    <div className="flex items-center gap-3"><button onClick={()=>nav('home')} className="text-[var(--gt-muted)] text-sm cursor-pointer font-bold">← Home</button><h2 className="font-extrabold text-lg">My Profile</h2></div>

    <Card><p className="text-xs font-bold text-[var(--gt-muted)] uppercase tracking-wider mb-2">My Payment Link</p><div className="flex gap-2"><div className="flex-1 bg-[var(--gt-bg)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--gt-accent)] truncate">{baseUrl}/w/{u.slug}</div><button onClick={()=>{navigator.clipboard?.writeText(`${baseUrl}/w/${u.slug}`);show('Copied!');}} className="bg-[var(--gt-accent)] text-white font-bold text-xs px-4 rounded-xl cursor-pointer">Copy</button></div><p className="text-[var(--gt-muted)] text-xs mt-2">Anyone with this link can pay you or assign you work.</p></Card>

    <div><h3 className="font-extrabold text-sm mb-3">Payment Methods</h3>
    {methods.length===0&&!addingPm&&<Card className="border-[var(--gt-warn)] border-2 text-center py-6"><p className="font-bold mb-2">Add a payment method</p><p className="text-[var(--gt-muted)] text-xs mb-3">Your link won't work until you add at least one.</p><Btn onClick={()=>{setAddingPm(true);setEditPm(null);setNmPm({type:'venmo',handle:''});}}>Add Payment Method</Btn></Card>}
    {methods.map(m=><Card key={m.id} className="mb-2"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{backgroundColor:PL[m.type]?.c}}/><div><p className="font-bold text-sm">{PL[m.type]?.l}</p><p className="text-[var(--gt-muted)] text-xs font-mono">{m.handle}</p></div>{pref===m.type&&<Badge color="green">Preferred</Badge>}</div><div className="flex gap-3"><button onClick={()=>{setNmPm({type:m.type,handle:m.handle});setEditPm(m.id);setAddingPm(true);}} className="text-[10px] text-[var(--gt-muted)] hover:text-[var(--gt-accent)] cursor-pointer font-bold">Edit</button>{pref!==m.type&&<button onClick={()=>{setPref(m.type);save({preferred_method:m.type});show('Updated');}} className="text-[10px] text-[var(--gt-muted)] hover:text-[var(--gt-accent)] cursor-pointer font-bold">Prefer</button>}<button onClick={()=>{const up=methods.filter(x=>x.id!==m.id);setMethods(up);save({payment_methods:up});show('Removed');}} className="text-[10px] text-[var(--gt-light)] hover:text-red-400 cursor-pointer font-bold">Remove</button></div></div></Card>)}
    {addingPm?<Card className="space-y-4"><p className="font-bold text-sm">{editPm?'Edit':'Add'} payment method</p><Select label="Platform" value={nmPm.type} onChange={e=>{setNmPm({type:e.target.value,handle:''});setHelpPm(false);}}>{(editPm?Object.keys(PI):availPmTypes).map(t=><option key={t} value={t}>{PI[t].l}</option>)}</Select><div><span className="text-xs font-bold text-[var(--gt-muted)] mb-1.5 block uppercase tracking-wider">{pi?.input}</span><input value={nmPm.handle} onChange={e=>setNmPm({...nmPm,handle:e.target.value})} placeholder={pi?.ph} className="w-full bg-[var(--gt-bg)] border border-[var(--gt-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--gt-accent)]"/></div><button onClick={()=>setHelpPm(!helpPm)} className="text-[var(--gt-accent)] text-xs font-bold cursor-pointer">{helpPm?'Hide':'Where do I find this?'}</button>{helpPm&&<div className="bg-[var(--gt-accent-light)] rounded-xl px-4 py-3"><p className="text-xs text-[var(--gt-text)]">{pi?.help}</p></div>}<div className="flex gap-2"><Btn onClick={savePm} disabled={!nmPm.handle}>{editPm?'Update':'Save'}</Btn><Btn onClick={()=>{setAddingPm(false);setEditPm(null);setHelpPm(false);}} v="ghost">Cancel</Btn></div></Card>:methods.length>0&&availPmTypes.length>0&&<button onClick={()=>{setAddingPm(true);setEditPm(null);setNmPm({type:availPmTypes[0],handle:''});}} className="text-[var(--gt-accent)] text-sm font-bold cursor-pointer">+ Add Another</button>}
    </div>

    {/* Earnings */}
    <div><h3 className="font-extrabold text-sm mb-3">Earnings ({new Date().getFullYear()})</h3>
    {(()=>{const yr=new Date().getFullYear();const by={};payments.filter(p=>p.receiver_id===u.id&&new Date(p.paid_at).getFullYear()===yr).forEach(p=>{const k=p.payer_name||'?';if(!by[k])by[k]=0;by[k]+=p.amount;});const entries=Object.entries(by).sort((a,b)=>b[1]-a[1]);
    if(!entries.length)return<Card><p className="text-[var(--gt-muted)] text-sm text-center">No earnings this year yet.</p></Card>;
    return entries.map(([name,total])=><Card key={name} className="mb-2"><div className="flex justify-between items-center mb-1"><span className="font-bold text-sm">{name}</span><div className="flex items-center gap-2"><span className={`font-extrabold text-sm ${total>=2000?'text-red-400':'text-[var(--gt-text)]'}`}>{fmt(total)}</span>{total>=2000&&<Badge color="red">1099</Badge>}</div></div><div className="h-2 bg-[var(--gt-bg)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${total>=2000?'bg-red-400':'bg-[var(--gt-success)]'}`} style={{width:`${Math.min(100,(total/2000)*100)}%`}}/></div><p className="text-[var(--gt-light)] text-[10px] mt-1 text-right">{total>=2000?`$${(total-2000).toFixed(2)} over $2k threshold`:`$${(2000-total).toFixed(2)} to $2k threshold`}</p></Card>);
    })()}
    <div className="bg-[var(--gt-info-light)] rounded-xl px-4 py-3"><p className="text-[var(--gt-info)] text-xs font-bold">$2,000 threshold per payer (2026 law)</p></div>
    </div>
  </main></div>;

  return null;
}

// ============================================================
// MAIN
// ============================================================
export default function App(){
  const sbRef=useRef(null);if(!sbRef.current)sbRef.current=getSb();const supabase=sbRef.current;
  const [user,setUser]=useState(null);const [gtUser,setGtUser]=useState(null);const [loading,setLoading]=useState(true);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{if(session?.user){setUser(session.user);loadU(session.user);}else setLoading(false);});
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,session)=>{if(session?.user){setUser(session.user);loadU(session.user);}else{setUser(null);setGtUser(null);setLoading(false);}});
    return()=>subscription.unsubscribe();
  },[]);

  const loadU=async u=>{
    const{data:w}=await supabase.from('users').select('*').eq('auth_id',u.id).limit(1).maybeSingle();
    if(w){setGtUser(w);setLoading(false);return;}
    if(u.email){const{data:w2}=await supabase.from('users').select('*').eq('email',u.email).is('auth_id',null).limit(1).maybeSingle();if(w2){await supabase.from('users').update({auth_id:u.id}).eq('id',w2.id);setGtUser({...w2,auth_id:u.id});setLoading(false);return;}}
    setGtUser(false);setLoading(false);
  };
  const signOut=async()=>{await supabase.auth.signOut();setUser(null);setGtUser(null);};

  if(loading)return<div className="min-h-screen bg-[var(--gt-bg)] flex items-center justify-center"><div className="animate-pulse text-[var(--gt-muted)] text-sm">Loading...</div></div>;
  if(!user)return<Landing supabase={supabase}/>;
  if(gtUser===false)return<Setup user={user} supabase={supabase} onDone={()=>loadU(user)}/>;
  if(gtUser)return<Dash u={gtUser} supabase={supabase} reload={()=>loadU(user)} signOut={signOut}/>;
  return null;
}
