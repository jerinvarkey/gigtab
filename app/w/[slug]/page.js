'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

function getSb(){return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{flowType:'implicit'}});}
function payUrl(m,h,a,n){const e=encodeURIComponent(n||'GigTab');if(m==='venmo')return(h.includes('@')||/^\d{7}/.test(h.replace(/\D/g,'')))?`https://venmo.com/?txn=pay&recipients=${encodeURIComponent(h)}&amount=${a}&note=${e}`:`https://venmo.com/${h.replace('@','')}?txn=pay&amount=${a}&note=${e}`;if(m==='paypal')return(h.includes('@')||/^\d/.test(h))?null:`https://paypal.me/${h}/${a}`;if(m==='cashapp')return`https://cash.app/$${h.replace('$','')}/${a}`;return null;}
const PL={venmo:{l:'Venmo',c:'#008CFF'},paypal:{l:'PayPal',c:'#0070BA'},cashapp:{l:'Cash App',c:'#00D632'},zelle:{l:'Zelle',c:'#6D1ED4'}};

function Toast({msg}){if(!msg)return null;return<div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#FF6B42] text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-lg z-50">{msg}</div>;}

export default function ProfilePage({params}){
  const{slug}=params;
  const[profile,setProfile]=useState(null);const[loading,setLoading]=useState(true);const[mode,setMode]=useState('home');
  const[amount,setAmount]=useState('');const[note,setNote]=useState('');
  const[job,setJob]=useState({title:'',payer_name:'',job_date:'',start_time:'',end_time:'',hourly_rate:'15',notes:''});
  const[sending,setSending]=useState(false);const[user,setUser]=useState(null);const[gtUser,setGtUser]=useState(null);
  const[toast,setToast]=useState('');const show=m=>{setToast(m);setTimeout(()=>setToast(''),2000);};

  useEffect(()=>{const sb=getSb();sb.from('users').select('*').eq('slug',slug).maybeSingle().then(({data})=>{setProfile(data);setLoading(false);});sb.auth.getSession().then(({data:{session}})=>{if(session?.user){setUser(session.user);sb.from('users').select('*').eq('auth_id',session.user.id).maybeSingle().then(({data})=>setGtUser(data));}});},[slug]);

  const createJob=async()=>{if(!job.title||!job.payer_name)return;setSending(true);const sb=getSb();
    if(!user){localStorage.setItem('gt_pjob',JSON.stringify({...job,pid:profile.id,slug}));await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.href}});return;}
    let payerId=gtUser?.id;
    if(!payerId){const{data:nu}=await sb.from('users').insert({auth_id:user.id,name:user.user_metadata?.full_name||user.email,email:user.email,slug:(user.email?.split('@')[0]||'user').replace(/[^a-z0-9]/gi,'').slice(0,14)+Math.random().toString(36).slice(2,5),payment_methods:[],payer_names:[job.payer_name]}).select().maybeSingle();if(nu){payerId=nu.id;setGtUser(nu);}}
    else if(!gtUser.payer_names?.includes(job.payer_name)){await sb.from('users').update({payer_names:[...(gtUser.payer_names||[]),job.payer_name]}).eq('id',gtUser.id);}
    if(!payerId){setSending(false);return;}
    const{data:j}=await sb.from('jobs').insert({created_by:payerId,payer_name:job.payer_name,title:job.title,job_date:job.job_date||null,start_time:job.start_time||null,end_time:job.end_time||null,hourly_rate:job.hourly_rate?parseFloat(job.hourly_rate):null,notes:job.notes||null}).select().maybeSingle();
    if(j)await sb.from('job_workers').insert({job_id:j.id,worker_id:profile.id});
    setSending(false);setMode('sent');};

  useEffect(()=>{if(user&&typeof window!=='undefined'){const p=localStorage.getItem('gt_pjob');if(p){const j=JSON.parse(p);localStorage.removeItem('gt_pjob');if(j.slug===slug){(async()=>{const sb=getSb();let pid=gtUser?.id;if(!pid){const{data:nu}=await sb.from('users').insert({auth_id:user.id,name:user.user_metadata?.full_name||user.email,email:user.email,slug:(user.email?.split('@')[0]||'u').replace(/[^a-z0-9]/gi,'').slice(0,14)+Math.random().toString(36).slice(2,5),payment_methods:[],payer_names:[j.payer_name]}).select().maybeSingle();if(nu)pid=nu.id;}if(pid){const{data:jb}=await sb.from('jobs').insert({created_by:pid,payer_name:j.payer_name,title:j.title,job_date:j.job_date||null,start_time:j.start_time||null,end_time:j.end_time||null,hourly_rate:j.hourly_rate?parseFloat(j.hourly_rate):null,notes:j.notes||null}).select().maybeSingle();if(jb)await sb.from('job_workers').insert({job_id:jb.id,worker_id:j.pid});}setMode('sent');})();}}};},[user,gtUser]);

  if(loading)return<div className="min-h-screen bg-[#FFF9F5] flex items-center justify-center"><div className="animate-pulse text-[#8C8580]">Loading...</div></div>;
  if(!profile)return<div className="min-h-screen bg-[#FFF9F5] flex flex-col items-center justify-center p-6 text-center"><p className="text-4xl mb-4">🔍</p><h1 className="font-extrabold text-xl mb-2">Not found</h1><p className="text-[#8C8580] text-sm mb-6">This GigTab doesn't exist.</p><a href="/" className="bg-[#FF6B42] text-white font-bold text-sm px-6 py-3 rounded-xl">Create yours free →</a></div>;

  const methods=profile.payment_methods||[];const prefM=methods.find(m=>m.type===profile.preferred_method)||methods[0];
  const initials=profile.name?.split(' ').map(n=>n[0]).join('').toUpperCase()||'?';const fn=profile.name?.split(' ')[0]||profile.name;
  const pa=parseFloat(amount);const ok=!isNaN(pa)&&pa>0;const da=ok?pa.toFixed(2):null;

  const payBtn=(m,big)=>{const p=PL[m.type];if(!p)return null;const lk=da?payUrl(m.type,m.handle,da,note||`To ${profile.name}`):null;const cl=typeof({venmo:true,cashapp:true,zelle:false,paypal:h=>!h.includes('@')}[m.type])==='function'?{venmo:true,cashapp:true,zelle:false,paypal:h=>!h.includes('@')}[m.type](m.handle):{venmo:true,cashapp:true,zelle:false,paypal:false}[m.type];
    if(lk&&cl)return<a key={m.type} href={lk} target="_blank" rel="noopener noreferrer" className={`block w-full font-bold ${big?'text-base py-4':'text-sm py-3'} rounded-xl text-center text-white`} style={{backgroundColor:p.c}}>{da?`Pay $${da} with ${p.l} →`:`Open ${p.l}`}</a>;
    return<div key={m.type} className={`rounded-xl px-5 ${big?'py-4':'py-3'} border border-[#F0E8E0]`} style={big?{backgroundColor:p.c}:{}}><div className="flex items-center justify-between"><span className={`font-bold ${big?'text-base text-white':'text-sm text-[#2D2A26]'}`}>{p.l}</span><button onClick={()=>{navigator.clipboard?.writeText(m.handle);show('Copied!');}} className={`text-xs font-bold px-3 py-1 rounded-lg cursor-pointer ${big?'bg-white/20 text-white':'bg-[#FFF9F5] text-[#8C8580]'}`}>Copy</button></div><p className={`text-sm mt-1 font-mono ${big?'text-white/90':'text-[#8C8580]'}`}>{m.handle}</p><p className={`text-xs mt-1 ${big?'text-white/60':'text-[#C4BBB3]'}`}>{m.type==='zelle'?'Send via your banking app':'Send using info above'}{da?` — $${da}`:''}</p></div>;};

  return<div className="min-h-screen bg-[#FFF9F5]" style={{fontFamily:"'Nunito',system-ui,sans-serif"}}>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
    <Toast msg={toast}/>
    <nav className="max-w-md mx-auto px-5 pt-4 flex justify-between items-center">
      {mode!=='home'?<button onClick={()=>setMode('home')} className="text-[#8C8580] text-sm cursor-pointer font-bold hover:text-[#2D2A26]">← Back</button>:<div/>}
      <a href="/" className="flex items-center gap-1.5 text-[#8C8580] hover:text-[#FF6B42] text-xs font-bold"><div className="w-5 h-5 rounded-lg bg-[#FF6B42] flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>{user?'My GigTab':'Get GigTab'}</a>
    </nav>
    <div className="max-w-md mx-auto px-5 py-6">
      <div className="text-center mb-6"><div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF6B42] to-[#FF8F6B] flex items-center justify-center mx-auto mb-3 text-2xl font-black text-white">{initials}</div><h1 className="text-2xl font-black text-[#2D2A26]">{profile.name}</h1></div>

      {mode==='home'&&<div className="space-y-3">
        <button onClick={()=>setMode('pay')} className="w-full bg-[#FF6B42] hover:bg-[#e55a35] text-white font-bold text-base py-4 rounded-xl cursor-pointer">Pay {fn}</button>
        <button onClick={()=>setMode('job')} className="w-full bg-white hover:bg-gray-50 text-[#2D2A26] font-bold text-base py-4 rounded-xl border border-[#F0E8E0] cursor-pointer">Assign {fn} a Job</button>
        <p className="text-[#C4BBB3] text-xs text-center mt-3"><strong className="text-[#8C8580]">Pay</strong> = send money now. <strong className="text-[#8C8580]">Assign</strong> = schedule work, then pay after.</p>
        {methods.length>0&&<div className="mt-4"><p className="text-[#C4BBB3] text-[10px] uppercase tracking-wider font-bold mb-2">Accepts</p><div className="flex flex-wrap gap-2">{methods.map(m=><div key={m.type} className="flex items-center gap-1.5 bg-white border border-[#F0E8E0] rounded-lg px-3 py-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor:PL[m.type]?.c}}/><span className="text-[#8C8580] text-xs">{PL[m.type]?.l}</span></div>)}</div></div>}
      </div>}

      {mode==='pay'&&<div className="space-y-4">
        <div className="bg-white border border-[#F0E8E0] rounded-2xl p-5"><p className="text-[#8C8580] text-xs font-bold uppercase tracking-wider mb-3">How much?</p><div className="flex items-center gap-3 mb-4"><span className="text-[#C4BBB3] text-3xl font-bold">$</span><input type="number" min="0.01" step="0.01" value={amount} onChange={e=>{const v=e.target.value;if(v===''||parseFloat(v)>=0)setAmount(v);}} placeholder="0.00" className="flex-1 bg-transparent text-4xl font-black text-[#2D2A26] placeholder:text-[#E0D8D0] focus:outline-none"/></div><input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="What's this for? (optional)" className="w-full bg-[#FFF9F5] border border-[#F0E8E0] rounded-xl px-4 py-3 text-[#2D2A26] text-sm placeholder:text-[#C4BBB3] focus:outline-none focus:border-[#FF6B42]"/></div>
        {methods.length>0?<div className="space-y-2.5"><p className="text-[#C4BBB3] text-[10px] uppercase tracking-wider font-bold">Choose how to pay</p>{prefM&&payBtn(prefM,true)}{methods.filter(m=>m!==prefM).map(m=>payBtn(m,false))}</div>:<div className="bg-[#FFF8ED] border border-[#F5A623]/30 rounded-xl p-4"><p className="text-[#F5A623] text-sm font-bold">{fn} hasn't added payment methods yet.</p></div>}
      </div>}

      {mode==='job'&&<div className="space-y-4">
        <div className="bg-white border border-[#F0E8E0] rounded-2xl p-5 space-y-4">
          <div><span className="text-xs font-bold text-[#8C8580] mb-1.5 block uppercase tracking-wider">Who's paying? *</span>{gtUser?.payer_names?.length>0&&<div className="flex flex-wrap gap-2 mb-2">{gtUser.payer_names.map(n=><button key={n} onClick={()=>setJob({...job,payer_name:n})} className={`text-xs px-3 py-1.5 rounded-lg cursor-pointer font-bold ${job.payer_name===n?'bg-[#FFF0EB] text-[#FF6B42] border border-[#FF6B42]':'bg-[#FFF9F5] text-[#8C8580] border border-[#F0E8E0]'}`}>{n}</button>)}</div>}<input value={job.payer_name} onChange={e=>setJob({...job,payer_name:e.target.value})} placeholder="Company name or your name" className="w-full bg-[#FFF9F5] border border-[#F0E8E0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B42]"/></div>
          <div><span className="text-xs font-bold text-[#8C8580] mb-1.5 block uppercase tracking-wider">What's the job? *</span><input value={job.title} onChange={e=>setJob({...job,title:e.target.value})} placeholder="e.g. Presale event at YogaSix" className="w-full bg-[#FFF9F5] border border-[#F0E8E0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B42]"/></div>
          <div><span className="text-xs font-bold text-[#8C8580] mb-1.5 block uppercase tracking-wider">When?</span><input type="date" value={job.job_date} onChange={e=>setJob({...job,job_date:e.target.value})} className="w-full bg-[#FFF9F5] border border-[#F0E8E0] rounded-xl px-4 py-3 text-sm focus:outline-none"/></div>
          <div className="grid grid-cols-2 gap-3"><div><span className="text-xs font-bold text-[#8C8580] mb-1.5 block uppercase tracking-wider">Start</span><input type="time" value={job.start_time} onChange={e=>setJob({...job,start_time:e.target.value})} className="w-full bg-[#FFF9F5] border border-[#F0E8E0] rounded-xl px-4 py-3 text-sm focus:outline-none"/></div><div><span className="text-xs font-bold text-[#8C8580] mb-1.5 block uppercase tracking-wider">End</span><input type="time" value={job.end_time} onChange={e=>setJob({...job,end_time:e.target.value})} className="w-full bg-[#FFF9F5] border border-[#F0E8E0] rounded-xl px-4 py-3 text-sm focus:outline-none"/></div></div>
          <div><span className="text-xs font-bold text-[#8C8580] mb-1.5 block uppercase tracking-wider">Rate ($/hr)</span><input type="number" min="0" value={job.hourly_rate} onChange={e=>setJob({...job,hourly_rate:e.target.value})} className="w-full bg-[#FFF9F5] border border-[#F0E8E0] rounded-xl px-4 py-3 text-sm focus:outline-none"/></div>
          <div><span className="text-xs font-bold text-[#8C8580] mb-1.5 block uppercase tracking-wider">Notes</span><input value={job.notes} onChange={e=>setJob({...job,notes:e.target.value})} placeholder="Instructions for the worker" className="w-full bg-[#FFF9F5] border border-[#F0E8E0] rounded-xl px-4 py-3 text-sm placeholder:text-[#C4BBB3] focus:outline-none"/></div>
          {job.start_time&&job.end_time&&job.hourly_rate&&parseFloat(job.hourly_rate)>0&&(()=>{const h=Math.round(((new Date(`2000-01-01T${job.end_time}`)-new Date(`2000-01-01T${job.start_time}`))/3600000)*4)/4;return h>0?<div className="bg-[#E8F8F0] border border-[#22B573]/20 rounded-xl p-3"><div className="flex justify-between text-sm"><span className="text-[#8C8580]">{h} hrs × ${job.hourly_rate}/hr</span><span className="text-[#22B573] font-extrabold text-lg">${(h*parseFloat(job.hourly_rate)).toFixed(2)}</span></div></div>:null;})()}
        </div>
        <button onClick={createJob} disabled={sending||!job.title||!job.payer_name} className={`w-full font-bold text-base py-4 rounded-xl cursor-pointer ${!job.title||!job.payer_name?'bg-[#F0E8E0] text-[#C4BBB3]':'bg-[#FF6B42] hover:bg-[#e55a35] text-white'}`}>{sending?'Sending...':user?`Send Job to ${fn}`:`Sign in & Send Job`}</button>
        {!user&&<p className="text-[#C4BBB3] text-xs text-center">Sign in with Google so {fn} knows who you are.</p>}
      </div>}

      {mode==='sent'&&<div className="text-center py-8"><div className="w-16 h-16 rounded-full bg-[#E8F8F0] flex items-center justify-center mx-auto mb-4"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22B573" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div><h2 className="font-extrabold text-xl mb-2">Job sent to {fn}!</h2><p className="text-[#8C8580] text-sm mb-6">They'll see it in their GigTab. After the work, you can approve hours and pay.</p><div className="space-y-3"><a href="/" className="block text-[#FF6B42] font-bold text-sm">Go to my dashboard →</a><button onClick={()=>{setMode('home');setJob({title:'',payer_name:job.payer_name,job_date:'',start_time:'',end_time:'',hourly_rate:'15',notes:''});}} className="text-[#8C8580] text-sm cursor-pointer">Back to {fn}'s profile</button></div></div>}

      <div className="mt-12 pt-6 border-t border-[#F0E8E0] text-center"><a href="/" className="inline-flex items-center gap-2 text-[#8C8580] hover:text-[#FF6B42] text-sm font-bold"><div className="w-5 h-5 rounded-lg bg-[#FF6B42] flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>Get your own GigTab — free</a></div>
    </div>
  </div>;
}
