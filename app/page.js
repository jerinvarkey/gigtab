'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

function getSb() { return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { flowType: 'implicit' } }); }
const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtDate = d => { try { return new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); } catch { return d||''; } };
function makeSlug(n) { return n.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,16)+Math.random().toString(36).slice(2,5); }
function calcHours(s,e) { if(!s||!e) return 0; return Math.round(((new Date(`2000-01-01T${e}`)-new Date(`2000-01-01T${s}`))/3600000)*4)/4; }
function payLink(method,handle,amount,note) { const n=encodeURIComponent(note||'GigTab'); if(method==='venmo') return (handle.includes('@')||/^\d{7}/.test(handle.replace(/\D/g,''))) ? `https://venmo.com/?txn=pay&recipients=${encodeURIComponent(handle)}&amount=${amount}&note=${n}` : `https://venmo.com/${handle.replace('@','')}?txn=pay&amount=${amount}&note=${n}`; if(method==='paypal') return (handle.includes('@')||/^\d/.test(handle)) ? null : `https://paypal.me/${handle}/${amount}`; if(method==='cashapp') return `https://cash.app/$${handle.replace('$','')}/${amount}`; return null; }

const PI = {
  venmo:{label:'Venmo',color:'#008CFF',input:'Venmo username, phone, or email',ph:'e.g. jerin-v or (713) 555-0123',help:'Venmo → profile icon (top-left) → username under your name. Phone/email also work.'},
  paypal:{label:'PayPal',color:'#0070BA',input:'PayPal.me username OR email',ph:'e.g. jerinv or jerin@email.com',help:'If you have paypal.me/yourname, enter the username. Otherwise use your PayPal email — payers see manual instructions.'},
  cashapp:{label:'Cash App',color:'#00D632',input:'$cashtag (no $)',ph:'e.g. jerinv',help:'Cash App → profile (top-right) → $cashtag at top.'},
  zelle:{label:'Zelle',color:'#6D1ED4',input:'Phone or email for Zelle',ph:'e.g. (713) 555-0123',help:'The phone/email enrolled in your banking app. No direct link exists for Zelle.'},
};

const Badge = ({children,color='gray'}) => { const c={gray:'bg-stone-800 text-stone-400',green:'bg-emerald-900/60 text-emerald-300',yellow:'bg-amber-900/50 text-amber-300',red:'bg-red-900/50 text-red-300',blue:'bg-sky-900/50 text-sky-300',purple:'bg-violet-900/50 text-violet-300'}; return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c[color]}`}>{children}</span>; };
const Card = ({children,className=''}) => <div className={`bg-stone-900/80 border border-stone-800 rounded-xl p-4 ${className}`}>{children}</div>;
const Btn = ({children,onClick,v='primary',disabled,className='',href}) => { const vs={primary:'bg-emerald-500 hover:bg-emerald-400 text-black',secondary:'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700',ghost:'text-stone-400 hover:bg-stone-800',danger:'bg-red-500/20 text-red-400'}; const cls = `font-semibold text-sm px-4 py-2.5 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center gap-2 ${vs[v]} ${disabled?'opacity-40':''} ${className}`; if(href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>; return <button onClick={onClick} disabled={disabled} className={cls}>{children}</button>; };
const Input = ({label,...p}) => <label className="block">{label&&<span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">{label}</span>}<input {...p} className={`w-full bg-stone-900 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 ${p.className||''}`}/></label>;
const Select = ({label,children,...p}) => <label className="block">{label&&<span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">{label}</span>}<select {...p} className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none">{children}</select></label>;
function Toast({msg}){if(!msg) return null; return <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-sm font-bold px-4 py-2 rounded-lg shadow-lg z-50">{msg}</div>;}

// ============================================================
// LANDING
// ============================================================
function Landing({supabase}) {
  const [email,setEmail]=useState('');const [loading,setLoading]=useState(false);const [sent,setSent]=useState(false);
  const google = async()=>{setLoading(true);await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});};
  const magic = async()=>{if(!email)return;setLoading(true);const{error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin}});setLoading(false);if(!error)setSent(true);};
  if(sent) return <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6" style={{backgroundImage:'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)'}}><div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div><h2 className="text-stone-100 font-bold text-lg mb-2">Check your email</h2><p className="text-stone-500 text-sm">Link sent to <span className="text-stone-300">{email}</span></p><button onClick={()=>setSent(false)} className="mt-4 text-stone-600 text-sm cursor-pointer">Try again</button></div>;
  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6" style={{backgroundImage:'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)'}}>
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><h1 className="text-3xl font-black text-stone-100">GigTab</h1></div>
        <p className="text-stone-400 text-lg font-bold mb-2">One link for all your payment info.</p>
        <p className="text-stone-600 text-sm max-w-sm mx-auto">Add your Venmo, PayPal, Zelle, Cash App. Share one link. Anyone can pay you or assign you work. Everything tracked.</p>
      </div>
      <Card className="w-full max-w-sm space-y-4">
        <button onClick={google} disabled={loading} className="w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold text-sm px-4 py-3 rounded-lg border border-gray-300 inline-flex items-center justify-center gap-2 cursor-pointer"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Sign up free with Google</button>
        <div className="flex items-center gap-3"><div className="flex-1 h-px bg-stone-800"/><span className="text-stone-600 text-xs">or email</span><div className="flex-1 h-px bg-stone-800"/></div>
        <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" />
        <Btn onClick={magic} disabled={loading||!email} className="w-full">{loading?'Sending...':'Send Sign-In Link'}</Btn>
      </Card>
    </div>
  );
}

// ============================================================
// SETUP
// ============================================================
function Setup({user,supabase,onDone}) {
  const [name,setName]=useState(user.user_metadata?.full_name||'');const [loading,setLoading]=useState(false);
  const create=async()=>{if(!name.trim())return;setLoading(true);await supabase.from('users').insert({auth_id:user.id,name:name.trim(),slug:makeSlug(name),email:user.email,payment_methods:[],payer_names:[]});setLoading(false);onDone();};
  return <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6" style={{backgroundImage:'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)'}}><Card className="w-full max-w-sm space-y-5"><div className="text-center"><div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center mx-auto mb-3"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><h2 className="text-xl font-bold text-stone-100">Create your GigTab</h2><p className="text-stone-500 text-sm mt-1">Enter your name. Next you'll add payment methods.</p></div><Input label="Your full name" value={name} onChange={e=>setName(e.target.value)} placeholder="First Last" /><Btn onClick={create} disabled={loading||!name.trim()} className="w-full">{loading?'Creating...':'Create My GigTab'}</Btn></Card></div>;
}

// ============================================================
// DASHBOARD — unified, payer + receiver
// ============================================================
function Dash({gtUser,supabase,reload,signOut}) {
  const [tab,setTab]=useState(gtUser.payment_methods?.length===0?'methods':'incoming');
  const [myJobs,setMyJobs]=useState([]); // jobs assigned TO me (via job_workers)
  const [myAssigned,setMyAssigned]=useState([]); // jobs I created
  const [myJobWorkers,setMyJobWorkers]=useState([]); // job_worker records for my incoming
  const [assignedWorkers,setAssignedWorkers]=useState([]); // job_worker records for jobs I created
  const [workerProfiles,setWorkerProfiles]=useState({}); // user profiles by id
  const [payments,setPayments]=useState([]);
  const [methods,setMethods]=useState(gtUser.payment_methods||[]);
  const [pref,setPref]=useState(gtUser.preferred_method||null);
  const [adding,setAdding]=useState(false);const [editing,setEditing]=useState(null);
  const [nm,setNm]=useState({type:'venmo',handle:''});const [showHelp,setShowHelp]=useState(false);
  const [phone,setPhone]=useState(gtUser.phone||'');const [phoneSaved,setPhoneSaved]=useState(false);
  const [hrs,setHrs]=useState('');const [loggingJw,setLoggingJw]=useState(null);
  const [toast,setToast]=useState('');
  const show=m=>{setToast(m);setTimeout(()=>setToast(''),2000);};
  const baseUrl=typeof window!=='undefined'?window.location.origin:'';
  const profileUrl=`${baseUrl}/w/${gtUser.slug}`;

  const loadAll = useCallback(async()=>{
    const sb=supabase;
    // Jobs assigned to me
    const {data:jw}=await sb.from('job_workers').select('*').eq('worker_id',gtUser.id).order('created_at',{ascending:false});
    setMyJobWorkers(jw||[]);
    if(jw?.length){
      const jids=[...new Set(jw.map(j=>j.job_id))];
      const {data:jbs}=await sb.from('jobs').select('*').in('id',jids);
      setMyJobs(jbs||[]);
    } else setMyJobs([]);
    // Jobs I created
    const {data:aj}=await sb.from('jobs').select('*').eq('created_by',gtUser.id).order('created_at',{ascending:false});
    setMyAssigned(aj||[]);
    if(aj?.length){
      const ajids=aj.map(j=>j.id);
      const {data:aw}=await sb.from('job_workers').select('*').in('job_id',ajids);
      setAssignedWorkers(aw||[]);
      // Load worker profiles
      const wids=[...new Set((aw||[]).map(w=>w.worker_id))];
      if(wids.length){const {data:wp}=await sb.from('users').select('id,name,email,payment_methods,preferred_method').in('id',wids);const m={};(wp||[]).forEach(u=>m[u.id]=u);setWorkerProfiles(m);}
    } else { setMyAssigned([]); setAssignedWorkers([]); }
    // Payments (both sent and received)
    const {data:pr}=await sb.from('payments').select('*').or(`payer_id.eq.${gtUser.id},worker_id.eq.${gtUser.id}`).order('paid_at',{ascending:false});
    setPayments(pr||[]);
  },[gtUser.id]);

  useEffect(()=>{loadAll();},[loadAll]);
  // Refresh on tab change
  const changeTab=t=>{setTab(t);loadAll();};

  const save=async u=>{await supabase.from('users').update(u).eq('id',gtUser.id);reload();};
  const updateJw=async(id,u)=>{await supabase.from('job_workers').update(u).eq('id',id);loadAll();};

  // Payment method management
  const addOrUpdate=()=>{if(!nm.handle)return;let u;if(editing){u=methods.map(m=>m.id===editing?{...m,type:nm.type,handle:nm.handle}:m);}else{const ex=methods.find(m=>m.type===nm.type);if(ex){u=methods.map(m=>m.type===nm.type?{...m,handle:nm.handle}:m);}else{u=[...methods,{type:nm.type,handle:nm.handle,id:Math.random().toString(36).substr(2,9)}];}}setMethods(u);if(!pref)setPref(nm.type);setAdding(false);setEditing(null);setShowHelp(false);setNm({type:'venmo',handle:''});save({payment_methods:u,preferred_method:pref||nm.type});show('Saved!');};
  const startEdit=m=>{setNm({type:m.type,handle:m.handle});setEditing(m.id);setAdding(true);};
  const removeM=id=>{const u=methods.filter(m=>m.id!==id);setMethods(u);save({payment_methods:u});show('Removed');};
  const availTypes=Object.keys(PI).filter(t=>editing||!methods.find(m=>m.type===t));
  const pi=PI[nm.type];

  // Approve + pay
  const approveWorker=(jwId)=>{updateJw(jwId,{status:'approved',approved_at:new Date().toISOString(),approved_by:gtUser.id});show('Approved!');};
  const markPaid=async(jw,job)=>{
    const w=workerProfiles[jw.worker_id];
    const amt=jw.hours_logged*(job.hourly_rate||0);
    if(amt<=0) return;
    await supabase.from('payments').insert({job_worker_id:jw.id,job_id:job.id,payer_id:gtUser.id,worker_id:jw.worker_id,payer_name:job.payer_name,amount:amt,method:w?.preferred_method||'manual'});
    await supabase.from('job_workers').update({status:'paid'}).eq('id',jw.id);
    loadAll();show('Marked as paid!');
  };

  // Earnings
  const yr=new Date().getFullYear();
  const received={};payments.filter(p=>p.worker_id===gtUser.id&&new Date(p.paid_at).getFullYear()===yr).forEach(p=>{const k=p.payer_name||'?';if(!received[k])received[k]=0;received[k]+=p.amount;});

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100" style={{backgroundImage:'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.03) 0%, transparent 50%)'}}>
      <Toast msg={toast}/>
      <header className="sticky top-0 z-40 bg-stone-950/80 backdrop-blur-xl border-b border-stone-800/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><span className="font-black text-sm">GigTab</span></div>
          <div className="flex items-center gap-3"><span className="text-stone-500 text-xs">{gtUser.name}</span><button onClick={signOut} className="text-stone-500 hover:text-red-400 text-xs cursor-pointer">Sign Out</button></div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        {/* Profile link */}
        <div className="bg-emerald-950/30 border border-emerald-700/30 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2"><p className="text-emerald-400 text-xs font-bold uppercase tracking-wider">My GigTab Link</p>{methods.length===0&&<Badge color="yellow">Add payment method ↓</Badge>}</div>
          <div className="flex gap-2"><div className="flex-1 bg-stone-900 rounded-lg px-3 py-2 text-sm text-emerald-300 font-mono truncate">{profileUrl}</div><button onClick={()=>{navigator.clipboard?.writeText(profileUrl);show('Link copied!');}} className="bg-emerald-500 text-black text-xs font-bold px-4 rounded-lg cursor-pointer hover:bg-emerald-400">Copy</button></div>
          <p className="text-stone-600 text-xs mt-2">Share with anyone who needs to <strong className="text-stone-500">pay you</strong> or <strong className="text-stone-500">assign you work</strong>.</p>
        </div>

        {methods.length===0&&tab!=='methods'&&<div className="bg-amber-950/20 border border-amber-800/20 rounded-xl p-4 mb-4"><p className="text-amber-400 text-sm font-semibold">Add a payment method first</p><p className="text-stone-500 text-xs mt-1">Your link won't work until you add one.</p><button onClick={()=>changeTab('methods')} className="text-emerald-400 text-sm font-semibold mt-2 cursor-pointer">Set up now →</button></div>}

        {/* Tabs */}
        <div className="flex gap-1 bg-stone-900 rounded-lg p-1 mb-5">
          {[{k:'incoming',l:'My Jobs'},{k:'outgoing',l:'Jobs I Assigned'},{k:'methods',l:'Payment'},{k:'earnings',l:'Earnings'}].map(t=>(
            <button key={t.k} onClick={()=>changeTab(t.k)} className={`flex-1 text-[11px] font-semibold py-2 rounded-md cursor-pointer transition-colors ${tab===t.k?'bg-stone-800 text-emerald-400':'text-stone-500 hover:text-stone-300'}`}>
              {t.l}
              {t.k==='incoming'&&myJobWorkers.filter(jw=>jw.status==='pending').length>0&&<span className="ml-1 bg-amber-500 text-black text-[9px] font-bold px-1.5 rounded-full">{myJobWorkers.filter(jw=>jw.status==='pending').length}</span>}
              {t.k==='outgoing'&&assignedWorkers.filter(jw=>jw.status==='hours_submitted').length>0&&<span className="ml-1 bg-violet-500 text-white text-[9px] font-bold px-1.5 rounded-full">{assignedWorkers.filter(jw=>jw.status==='hours_submitted').length}</span>}
            </button>
          ))}
        </div>

        {/* INCOMING JOBS (assigned to me) */}
        {tab==='incoming'&&<div className="space-y-5">
          {myJobWorkers.length===0&&<Card className="text-center py-8"><p className="text-3xl mb-3">📋</p><p className="text-stone-300 font-semibold mb-1">No jobs assigned to you yet</p><p className="text-stone-500 text-xs max-w-xs mx-auto mb-4">When someone uses your GigTab link to assign you work, it appears here.</p><button onClick={()=>{navigator.clipboard?.writeText(profileUrl);show('Link copied!');}} className="bg-emerald-500 text-black font-semibold text-sm px-6 py-2.5 rounded-lg cursor-pointer">Copy My Link</button></Card>}

          {['pending','accepted','hours_submitted','approved','paid'].map(st=>{
            const group=myJobWorkers.filter(jw=>jw.status===st);if(!group.length)return null;
            const labels={pending:'New Invitations',accepted:'Active — Log hours when done',hours_submitted:'Waiting for approval',approved:'Approved — Payment coming',paid:'Paid'};
            const colors={pending:'text-amber-400',accepted:'text-sky-400',hours_submitted:'text-violet-400',approved:'text-emerald-400',paid:'text-emerald-400'};
            return <div key={st}><p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${colors[st]}`}>{labels[st]} ({group.length})</p>
            {group.map(jw=>{const job=myJobs.find(j=>j.id===jw.job_id);if(!job)return null;const pay=payments.find(p=>p.job_worker_id===jw.id);
            return <Card key={jw.id} className="mb-3">
              <p className="text-stone-200 font-semibold">{job.title}</p>
              <p className="text-stone-500 text-xs">From <strong className="text-stone-400">{job.payer_name}</strong>{job.job_date?` · ${fmtDate(job.job_date)}`:''}</p>
              {job.start_time&&job.end_time&&<p className="text-stone-600 text-xs">{job.start_time}–{job.end_time}{job.hourly_rate?` · ${fmt(job.hourly_rate)}/hr`:''}</p>}
              {job.hourly_rate&&job.start_time&&job.end_time&&(()=>{const h=calcHours(job.start_time,job.end_time);return h>0?<p className="text-emerald-400/70 text-xs font-medium mt-0.5">Est. {fmt(h*job.hourly_rate)}</p>:null;})()}
              {job.notes&&<p className="text-stone-600 text-xs mt-1 italic">"{job.notes}"</p>}

              {st==='pending'&&<div className="flex gap-2 mt-3"><Btn onClick={()=>updateJw(jw.id,{status:'accepted'})}>Accept</Btn><Btn onClick={()=>updateJw(jw.id,{status:'declined'})} v="ghost">Decline</Btn></div>}

              {st==='accepted'&&(loggingJw===jw.id?<div className="mt-3 space-y-3"><Input label="Hours worked" type="number" min="0.25" step="0.25" value={hrs} onChange={e=>setHrs(e.target.value)} placeholder="3.5"/>{hrs&&job.hourly_rate&&parseFloat(hrs)>0&&<p className="text-emerald-400 text-sm font-bold">{hrs} hrs × {fmt(job.hourly_rate)} = {fmt(parseFloat(hrs)*job.hourly_rate)}</p>}<div className="flex gap-2"><Btn onClick={()=>{if(!hrs||parseFloat(hrs)<=0)return;updateJw(jw.id,{hours_logged:parseFloat(hrs),status:'hours_submitted'});setLoggingJw(null);setHrs('');}}>Submit Hours</Btn><Btn onClick={()=>setLoggingJw(null)} v="ghost">Cancel</Btn></div></div>:<div className="mt-3"><Btn onClick={()=>setLoggingJw(jw.id)} v="secondary">Log Hours</Btn></div>)}

              {(st==='hours_submitted'||st==='approved')&&jw.hours_logged&&<div className="mt-3 bg-stone-800/30 rounded-lg px-3 py-2"><div className="flex justify-between text-sm"><span className="text-stone-400">{jw.hours_logged}h{job.hourly_rate?` × ${fmt(job.hourly_rate)}`:''}</span>{job.hourly_rate&&<span className="text-stone-200 font-bold">{fmt(jw.hours_logged*job.hourly_rate)}</span>}</div></div>}

              {st==='paid'&&pay&&<div className="mt-3 bg-emerald-900/20 border border-emerald-800/30 rounded-lg px-3 py-2"><div className="flex justify-between text-sm"><span className="text-emerald-400">Paid</span><span className="text-emerald-300 font-bold">{fmt(pay.amount)}</span></div></div>}
            </Card>;})}
            </div>;
          })}
        </div>}

        {/* OUTGOING JOBS (I assigned) */}
        {tab==='outgoing'&&<div className="space-y-5">
          {myAssigned.length===0&&<Card className="text-center py-8"><p className="text-3xl mb-3">📤</p><p className="text-stone-300 font-semibold mb-1">No jobs assigned yet</p><p className="text-stone-500 text-xs max-w-xs mx-auto">To assign someone work, go to their GigTab profile link and click "Assign a Job."</p></Card>}

          {myAssigned.map(job=>{
            const jws=assignedWorkers.filter(jw=>jw.job_id===job.id);
            return <Card key={job.id} className="mb-3">
              <div className="flex justify-between items-start mb-2"><div><p className="text-stone-200 font-semibold">{job.title}</p><p className="text-stone-500 text-xs">Paying as <strong className="text-stone-400">{job.payer_name}</strong>{job.job_date?` · ${fmtDate(job.job_date)}`:''}</p>{job.start_time&&job.end_time&&<p className="text-stone-600 text-xs">{job.start_time}–{job.end_time}{job.hourly_rate?` · ${fmt(job.hourly_rate)}/hr`:''}</p>}</div></div>

              {jws.length>0&&<div className="mt-3 pt-3 border-t border-stone-800 space-y-3">
                {jws.map(jw=>{
                  const w=workerProfiles[jw.worker_id];
                  const amt=jw.hours_logged&&job.hourly_rate?jw.hours_logged*job.hourly_rate:0;
                  const pm=w?.payment_methods?.find(m=>m.type===w.preferred_method)||w?.payment_methods?.[0];
                  const link=pm&&amt>0?payLink(pm.type,pm.handle,amt.toFixed(2),`${job.payer_name} - ${job.title}`):null;
                  const canLink=pm&&(typeof({venmo:true,cashapp:true,zelle:false,paypal:h=>!h.includes('@')}[pm?.type])==='function'?{venmo:true,cashapp:true,zelle:false,paypal:h=>!h.includes('@')}[pm?.type](pm.handle):{venmo:true,cashapp:true,zelle:false,paypal:false}[pm?.type]);

                  return <div key={jw.id} className="bg-stone-800/30 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <div><p className="text-stone-200 text-sm font-semibold">{w?.name||'Worker'}</p><p className="text-stone-600 text-[10px]">{w?.email||''}</p></div>
                      <Badge color={jw.status==='paid'?'green':jw.status==='approved'?'green':jw.status==='hours_submitted'?'purple':jw.status==='accepted'?'blue':jw.status==='declined'?'red':'yellow'}>{jw.status.replace('_',' ')}{jw.hours_logged?` · ${jw.hours_logged}h`:''}</Badge>
                    </div>

                    {jw.status==='hours_submitted'&&<div className="mt-2 space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-stone-400">{jw.hours_logged}h{job.hourly_rate?` × ${fmt(job.hourly_rate)}`:''}</span>{amt>0&&<span className="text-stone-200 font-bold">{fmt(amt)}</span>}</div>
                      <div className="flex gap-2"><Btn onClick={()=>approveWorker(jw.id)}>Approve {jw.hours_logged}h</Btn><Btn v="ghost" onClick={()=>updateJw(jw.id,{status:'accepted',hours_logged:null})}>Reject</Btn></div>
                    </div>}

                    {jw.status==='approved'&&amt>0&&<div className="mt-2 space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-stone-400">Approved: {jw.hours_logged}h</span><span className="text-emerald-400 font-bold">{fmt(amt)}</span></div>
                      <div className="flex flex-wrap gap-2">
                        {link&&canLink?<Btn v="primary" href={link}>Pay {fmt(amt)} via {PI[pm.type]?.label} →</Btn>:pm?<div className="text-xs text-stone-400"><span className="font-semibold">{PI[pm.type]?.label}:</span> {pm.handle} — send {fmt(amt)}</div>:<p className="text-amber-400 text-xs">No payment method on file</p>}
                        <Btn onClick={()=>markPaid(jw,job)} v="secondary">Mark Paid</Btn>
                      </div>
                    </div>}

                    {jw.status==='paid'&&<div className="mt-2"><p className="text-emerald-400 text-xs font-medium">Paid {fmt(amt)}</p></div>}
                  </div>;
                })}
              </div>}
            </Card>;
          })}
        </div>}

        {/* PAYMENT METHODS */}
        {tab==='methods'&&<div className="space-y-5">
          <div><h3 className="text-stone-200 font-bold text-sm mb-1">Payment Methods</h3><p className="text-stone-500 text-xs">Show on your GigTab link. Anyone you share it with can pay you.</p></div>
          {methods.length===0&&!adding&&<Card className="text-center py-6 border-amber-800/30"><p className="text-amber-400 font-semibold text-sm mb-2">Add your first payment method</p><p className="text-stone-500 text-xs mb-4">Your link won't work until you add one.</p><Btn onClick={()=>{setAdding(true);setEditing(null);setNm({type:'venmo',handle:''});}}>Add Payment Method</Btn></Card>}
          {methods.map(m=><Card key={m.id}><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{backgroundColor:PI[m.type]?.color}}/><div><p className="text-stone-200 text-sm font-semibold">{PI[m.type]?.label}</p><p className="text-stone-500 text-xs font-mono">{m.handle}</p></div>{pref===m.type&&<Badge color="green">Preferred</Badge>}</div><div className="flex gap-3"><button onClick={()=>startEdit(m)} className="text-[10px] text-stone-500 hover:text-emerald-400 cursor-pointer">Edit</button>{pref!==m.type&&<button onClick={()=>{setPref(m.type);save({preferred_method:m.type});show('Updated');}} className="text-[10px] text-stone-500 hover:text-emerald-400 cursor-pointer">Prefer</button>}<button onClick={()=>removeM(m.id)} className="text-[10px] text-stone-600 hover:text-red-400 cursor-pointer">Remove</button></div></div></Card>)}
          {adding?<Card className="space-y-4"><p className="text-stone-300 text-sm font-semibold">{editing?'Edit':'Add'} payment method</p><Select label="Platform" value={nm.type} onChange={e=>{setNm({type:e.target.value,handle:''});setShowHelp(false);}}>{(editing?Object.keys(PI):availTypes).map(t=><option key={t} value={t}>{PI[t].label}</option>)}</Select><div><span className="text-[10px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider">{pi?.input}</span><input value={nm.handle} onChange={e=>setNm({...nm,handle:e.target.value})} placeholder={pi?.ph} className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50"/></div><button onClick={()=>setShowHelp(!showHelp)} className="text-emerald-400 text-xs font-medium cursor-pointer">{showHelp?'Hide help':`Where do I find my ${pi?.label} info?`}</button>{showHelp&&<div className="bg-emerald-950/20 border border-emerald-800/20 rounded-lg px-3.5 py-3"><p className="text-stone-300 text-xs leading-relaxed">{pi?.help}</p></div>}<div className="flex gap-2"><Btn onClick={addOrUpdate} disabled={!nm.handle}>{editing?'Update':'Save'}</Btn><Btn onClick={()=>{setAdding(false);setEditing(null);setShowHelp(false);setNm({type:'venmo',handle:''});}} v="ghost">Cancel</Btn></div></Card>:methods.length>0&&availTypes.length>0&&<button onClick={()=>{setAdding(true);setEditing(null);setNm({type:availTypes[0],handle:''});}} className="text-emerald-400 text-sm font-semibold cursor-pointer">+ Add Another</button>}
          <Card><div className="flex items-end gap-3"><div className="flex-1"><Input label="Phone (optional)" value={phone} onChange={e=>{setPhone(e.target.value);setPhoneSaved(false);}} placeholder="(713) 555-0123"/></div><button onClick={()=>{save({phone});setPhoneSaved(true);setTimeout(()=>setPhoneSaved(false),2000);}} className={`text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer ${phoneSaved?'bg-emerald-500/20 text-emerald-400':'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}>{phoneSaved?'Saved!':'Save'}</button></div></Card>
        </div>}

        {/* EARNINGS */}
        {tab==='earnings'&&<div className="space-y-5">
          <div><h3 className="text-stone-200 font-bold text-sm mb-1">Earnings ({yr})</h3><p className="text-stone-500 text-xs">Per payer. 1099 required if one payer pays you $2,000+ in a year.</p></div>
          {Object.keys(received).length===0&&<Card className="text-center py-6"><p className="text-stone-500 text-sm">No payments received yet.</p></Card>}
          {Object.entries(received).sort((a,b)=>b[1]-a[1]).map(([p,t])=><Card key={p}><div className="flex justify-between items-center mb-2"><span className="text-stone-200 text-sm font-bold">{p}</span><div className="flex items-center gap-2"><span className={`font-bold text-sm ${t>=2000?'text-red-400':'text-stone-300'}`}>{fmt(t)}</span>{t>=2000&&<Badge color="red">1099</Badge>}</div></div><div className="h-1.5 bg-stone-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${t>=2000?'bg-red-500':'bg-emerald-500'}`} style={{width:`${Math.min(100,(t/2000)*100)}%`}}/></div><p className="text-stone-700 text-[10px] mt-1 text-right">{t>=2000?`$${(t-2000).toFixed(2)} over`:`$${(2000-t).toFixed(2)} to $2,000`}</p></Card>)}
          <div className="bg-sky-950/20 border border-sky-800/20 rounded-xl px-3.5 py-2.5"><p className="text-sky-400 text-xs font-bold">$2,000 per-payer threshold (2026)</p><p className="text-stone-500 text-[10px]">Income is taxable regardless. This tracks when a 1099 is required.</p></div>
        </div>}
      </main>
    </div>
  );
}

// ============================================================
// MAIN
// ============================================================
export default function App() {
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

  if(loading) return <div className="min-h-screen bg-stone-950 flex items-center justify-center"><div className="animate-pulse text-stone-500 text-sm">Loading...</div></div>;
  if(!user) return <Landing supabase={supabase}/>;
  if(gtUser===false) return <Setup user={user} supabase={supabase} onDone={()=>loadU(user)}/>;
  if(gtUser) return <Dash gtUser={gtUser} supabase={supabase} reload={()=>loadU(user)} signOut={signOut}/>;
  return null;
}
