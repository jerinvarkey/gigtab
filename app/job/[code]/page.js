'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

function getSb(){return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{flowType:'implicit'}});}
const fmt=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const fmtDate=d=>{try{return new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});}catch{return d||'';}};
function calcHours(s,e){if(!s||!e)return 0;return Math.round(((new Date(`2000-01-01T${e}`)-new Date(`2000-01-01T${s}`))/3600000)*4)/4;}
function makeSlug(n){return n.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,14)+Math.random().toString(36).slice(2,5);}

export default function JobInvitePage({params}){
  const{code}=params;
  const[job,setJob]=useState(null);const[creator,setCreator]=useState(null);const[loading,setLoading]=useState(true);
  const[user,setUser]=useState(null);const[gtUser,setGtUser]=useState(null);
  const[status,setStatus]=useState('view'); // view|joining|joined|already
  const[existing,setExisting]=useState(null);

  useEffect(()=>{
    const sb=getSb();
    sb.from('jobs').select('*').eq('invite_code',code).maybeSingle().then(async({data:j})=>{
      if(j){
        setJob(j);
        const{data:u}=await sb.from('users').select('name,email').eq('id',j.created_by).maybeSingle();
        setCreator(u);
      }
      setLoading(false);
    });
    sb.auth.getSession().then(({data:{session}})=>{
      if(session?.user){
        setUser(session.user);
        sb.from('users').select('*').eq('auth_id',session.user.id).maybeSingle().then(({data})=>setGtUser(data));
      }
    });
  },[code]);

  // Check if already joined
  useEffect(()=>{
    if(gtUser&&job){
      const sb=getSb();
      sb.from('job_workers').select('*').eq('job_id',job.id).eq('worker_id',gtUser.id).maybeSingle().then(({data})=>{
        if(data)setExisting(data);
      });
    }
  },[gtUser,job]);

  // Handle join after OAuth redirect
  useEffect(()=>{
    if(user&&typeof window!=='undefined'){
      const pending=localStorage.getItem('gt_join_job');
      if(pending){
        const p=JSON.parse(pending);
        localStorage.removeItem('gt_join_job');
        if(p.code===code)joinJob();
      }
    }
  },[user,gtUser]);

  const joinJob=async()=>{
    if(!job)return;
    setStatus('joining');
    const sb=getSb();

    // Ensure user has a GigTab account
    let uid=gtUser?.id;
    if(!uid&&user){
      const{data:nu}=await sb.from('users').insert({
        auth_id:user.id,name:user.user_metadata?.full_name||user.email,email:user.email,
        slug:makeSlug(user.user_metadata?.full_name||user.email?.split('@')[0]||'user'),
        payment_methods:[],payer_names:[]
      }).select().maybeSingle();
      if(nu){uid=nu.id;setGtUser(nu);}
    }

    if(!uid){setStatus('view');return;}

    // Check if already a worker
    const{data:ex}=await sb.from('job_workers').select('*').eq('job_id',job.id).eq('worker_id',uid).maybeSingle();
    if(ex){setExisting(ex);setStatus('already');return;}

    // Add as worker
    await sb.from('job_workers').insert({job_id:job.id,worker_id:uid,status:'accepted'});
    setStatus('joined');
  };

  const handleJoin=async()=>{
    if(!user){
      localStorage.setItem('gt_join_job',JSON.stringify({code}));
      await getSb().auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.href}});
      return;
    }
    joinJob();
  };

  if(loading)return<div className="min-h-screen bg-[#FFF9F5] flex items-center justify-center"><div className="animate-pulse text-[#8C8580]">Loading...</div></div>;
  if(!job)return<div className="min-h-screen bg-[#FFF9F5] flex flex-col items-center justify-center p-6 text-center"><p className="text-4xl mb-4">🔍</p><h1 className="font-extrabold text-xl mb-2">Job not found</h1><p className="text-[#8C8580] text-sm mb-6">This invite link may have expired.</p><a href="/" className="bg-[#FF6B42] text-white font-bold text-sm px-6 py-3 rounded-xl">Get GigTab →</a></div>;

  const hrs=job.start_time&&job.end_time?calcHours(job.start_time,job.end_time):0;
  const est=hrs>0&&job.hourly_rate?hrs*job.hourly_rate:0;

  return<div className="min-h-screen bg-[#FFF9F5]" style={{fontFamily:"'Nunito',system-ui,sans-serif"}}>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
    <nav className="max-w-md mx-auto px-5 pt-4 flex justify-end">
      <a href="/" className="flex items-center gap-1.5 text-[#8C8580] hover:text-[#FF6B42] text-xs font-bold"><div className="w-5 h-5 rounded-lg bg-[#FF6B42] flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>{user?'My GigTab':'Get GigTab'}</a>
    </nav>

    <div className="max-w-md mx-auto px-5 py-8">
      {/* Job card */}
      <div className="bg-white border border-[#F0E8E0] rounded-3xl p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Badge color="accent">Job Invite</Badge>
          <span className="text-[#8C8580] text-xs">from {creator?.name||'someone'}</span>
        </div>

        <h1 className="text-2xl font-black text-[#2D2A26] mb-1">{job.title}</h1>
        <p className="text-[#FF6B42] font-extrabold text-sm mb-4">Paying as {job.payer_name}</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {job.job_date&&<div className="bg-[#FFF9F5] rounded-xl p-3 text-center"><p className="text-[#C4BBB3] text-[10px] uppercase font-bold">Date</p><p className="font-bold text-sm">{fmtDate(job.job_date)}</p></div>}
          {job.hourly_rate&&<div className="bg-[#FFF9F5] rounded-xl p-3 text-center"><p className="text-[#C4BBB3] text-[10px] uppercase font-bold">Rate</p><p className="font-bold text-sm text-[#FF6B42]">{fmt(job.hourly_rate)}/hr</p></div>}
          {job.start_time&&job.end_time&&<div className="bg-[#FFF9F5] rounded-xl p-3 text-center"><p className="text-[#C4BBB3] text-[10px] uppercase font-bold">Time</p><p className="font-bold text-sm">{job.start_time} – {job.end_time}</p></div>}
          {est>0&&<div className="bg-[#E8F8F0] rounded-xl p-3 text-center"><p className="text-[#C4BBB3] text-[10px] uppercase font-bold">Est. Pay</p><p className="font-extrabold text-sm text-[#22B573]">{fmt(est)}</p></div>}
        </div>

        {job.notes&&<div className="bg-[#FFF9F5] rounded-xl p-3 mb-4"><p className="text-[#8C8580] text-xs"><strong>Notes:</strong> {job.notes}</p></div>}
      </div>

      {/* Actions */}
      {status==='view'&&!existing&&(
        <div className="space-y-3">
          <button onClick={handleJoin} className="w-full bg-[#FF6B42] hover:bg-[#e55a35] text-white font-bold text-base py-4 rounded-xl cursor-pointer">
            {user?'Accept & Join This Job':'Sign In to Accept'}
          </button>
          {!user&&<p className="text-[#C4BBB3] text-xs text-center">You'll sign in with Google so the employer knows who you are.</p>}
          <p className="text-[#8C8580] text-xs text-center">After the job, you'll log your hours and get paid through GigTab.</p>
        </div>
      )}

      {status==='joining'&&(
        <div className="text-center py-6"><div className="animate-pulse text-[#8C8580] text-sm">Joining...</div></div>
      )}

      {(status==='joined')&&(
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-[#E8F8F0] flex items-center justify-center mx-auto mb-4"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22B573" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>
          <h2 className="font-extrabold text-xl mb-2">You're in!</h2>
          <p className="text-[#8C8580] text-sm mb-4">You've been added to this job. After you complete the work, go to your GigTab dashboard to log your hours.</p>
          <a href="/" className="bg-[#FF6B42] text-white font-bold text-sm px-6 py-3 rounded-xl inline-block">Go to My Dashboard →</a>
        </div>
      )}

      {(status==='already'||existing)&&status!=='joined'&&(
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-[#EBF3FC] flex items-center justify-center mx-auto mb-4"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A90D9" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg></div>
          <h2 className="font-extrabold text-xl mb-2">You're already on this job</h2>
          <p className="text-[#8C8580] text-sm mb-4">Go to your dashboard to see the details and log hours.</p>
          <a href="/" className="bg-[#FF6B42] text-white font-bold text-sm px-6 py-3 rounded-xl inline-block">My Dashboard →</a>
        </div>
      )}

      <div className="mt-12 pt-6 border-t border-[#F0E8E0] text-center">
        <a href="/" className="inline-flex items-center gap-2 text-[#8C8580] hover:text-[#FF6B42] text-sm font-bold">
          <div className="w-5 h-5 rounded-lg bg-[#FF6B42] flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
          Get your own GigTab — free
        </a>
      </div>
    </div>
  </div>;
}

function Badge({children,color='gray'}){const c={gray:'bg-gray-100 text-gray-600',accent:'bg-[#FFF0EB] text-[#FF6B42]',green:'bg-[#E8F8F0] text-[#22B573]'};return<span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${c[color]}`}>{children}</span>;}
