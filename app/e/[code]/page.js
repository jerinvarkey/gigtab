'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

function getSb(){return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{flowType:'implicit'}});}
function payUrl(m,h,a,n){const e=encodeURIComponent(n||'GigTab');if(m==='venmo')return(h.includes('@')||/^\d{7}/.test(h.replace(/\D/g,'')))?`https://venmo.com/?txn=pay&recipients=${encodeURIComponent(h)}&amount=${a}&note=${e}`:`https://venmo.com/${h.replace('@','')}?txn=pay&amount=${a}&note=${e}`;if(m==='paypal')return(h.includes('@')||/^\d/.test(h))?null:`https://paypal.me/${h}/${a}`;if(m==='cashapp')return`https://cash.app/$${h.replace('$','')}/${a}`;return null;}
const PL={venmo:{l:'Venmo',c:'#008CFF'},paypal:{l:'PayPal',c:'#0070BA'},cashapp:{l:'Cash App',c:'#00D632'},zelle:{l:'Zelle',c:'#6D1ED4'}};
const fmt=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);

function Toast({msg}){if(!msg)return null;return<div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#FF6B42] text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-lg z-50">{msg}</div>;}

export default function EventPage({params}){
  const{code}=params;
  const[event,setEvent]=useState(null);const[creator,setCreator]=useState(null);const[loading,setLoading]=useState(true);
  const[toast,setToast]=useState('');const show=m=>{setToast(m);setTimeout(()=>setToast(''),2000);};

  useEffect(()=>{
    const sb=getSb();
    sb.from('events').select('*').eq('invite_code',code).maybeSingle().then(async({data:ev})=>{
      if(ev){
        setEvent(ev);
        const{data:u}=await sb.from('users').select('*').eq('id',ev.created_by).maybeSingle();
        setCreator(u);
      }
      setLoading(false);
    });
  },[code]);

  if(loading)return<div className="min-h-screen bg-[#FFF9F5] flex items-center justify-center"><div className="animate-pulse text-[#8C8580]">Loading...</div></div>;
  if(!event||!creator)return<div className="min-h-screen bg-[#FFF9F5] flex flex-col items-center justify-center p-6 text-center"><p className="text-4xl mb-4">🔍</p><h1 className="font-extrabold text-xl mb-2">Event not found</h1><p className="text-[#8C8580] text-sm mb-6">This link may have expired or doesn't exist.</p><a href="/" className="bg-[#FF6B42] text-white font-bold text-sm px-6 py-3 rounded-xl">Get GigTab →</a></div>;

  const methods=creator.payment_methods||[];
  const prefM=methods.find(m=>m.type===creator.preferred_method)||methods[0];
  const initials=creator.name?.split(' ').map(n=>n[0]).join('').toUpperCase()||'?';
  const fn=creator.name?.split(' ')[0]||creator.name;
  const amt=event.amount.toFixed(2);

  const payBtn=(m,big)=>{
    const p=PL[m.type];if(!p)return null;
    const lk=payUrl(m.type,m.handle,amt,event.title);
    const cl=typeof({venmo:true,cashapp:true,zelle:false,paypal:h=>!h.includes('@')}[m.type])==='function'?{venmo:true,cashapp:true,zelle:false,paypal:h=>!h.includes('@')}[m.type](m.handle):{venmo:true,cashapp:true,zelle:false,paypal:false}[m.type];
    if(lk&&cl)return<a key={m.type} href={lk} target="_blank" rel="noopener noreferrer" className={`block w-full font-bold ${big?'text-base py-4':'text-sm py-3'} rounded-xl text-center text-white`} style={{backgroundColor:p.c}}>Pay ${amt} with {p.l} →</a>;
    return<div key={m.type} className={`rounded-xl px-5 ${big?'py-4':'py-3'}`} style={big?{backgroundColor:p.c}:{border:'1px solid #F0E8E0'}}>
      <div className="flex items-center justify-between"><span className={`font-bold ${big?'text-base text-white':'text-sm text-[#2D2A26]'}`}>{p.l}</span><button onClick={()=>{navigator.clipboard?.writeText(m.handle);show('Copied!');}} className={`text-xs font-bold px-3 py-1 rounded-lg cursor-pointer ${big?'bg-white/20 text-white':'bg-[#FFF9F5] text-[#8C8580]'}`}>Copy</button></div>
      <p className={`text-sm mt-1 font-mono ${big?'text-white/90':'text-[#8C8580]'}`}>{m.handle}</p>
      <p className={`text-xs mt-1 ${big?'text-white/60':'text-[#C4BBB3]'}`}>{m.type==='zelle'?'Send via your banking app':'Send using info above'} — ${amt}</p>
    </div>;
  };

  return<div className="min-h-screen bg-[#FFF9F5]" style={{fontFamily:"'Nunito',system-ui,sans-serif"}}>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
    <Toast msg={toast}/>
    <nav className="max-w-md mx-auto px-5 pt-4 flex justify-end">
      <a href="/" className="flex items-center gap-1.5 text-[#8C8580] hover:text-[#FF6B42] text-xs font-bold"><div className="w-5 h-5 rounded-lg bg-[#FF6B42] flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>Get GigTab</a>
    </nav>

    <div className="max-w-md mx-auto px-5 py-8">
      {/* Event card */}
      <div className="bg-white border border-[#F0E8E0] rounded-3xl p-6 text-center mb-6 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF6B42] to-[#FF8F6B] flex items-center justify-center mx-auto mb-4 text-xl font-black text-white">{initials}</div>
        <p className="text-[#8C8580] text-sm font-bold mb-1">{fn} is collecting for</p>
        <h1 className="text-2xl font-black text-[#2D2A26] mb-2">{event.title}</h1>
        <div className="bg-[#FFF0EB] rounded-2xl px-6 py-4 inline-block">
          <p className="text-4xl font-black text-[#FF6B42]">{fmt(event.amount)}</p>
          <p className="text-[#8C8580] text-xs font-bold mt-1">per person</p>
        </div>
        {event.notes&&<p className="text-[#8C8580] text-sm mt-4 italic">"{event.notes}"</p>}
      </div>

      {/* Payment options */}
      {methods.length>0?(
        <div className="space-y-3">
          <p className="text-[#8C8580] text-xs font-bold uppercase tracking-wider text-center mb-2">Pay {fn} ${amt}</p>
          {prefM&&payBtn(prefM,true)}
          {methods.filter(m=>m!==prefM).map(m=>payBtn(m,false))}
        </div>
      ):(
        <div className="bg-[#FFF8ED] border border-[#F5A623]/30 rounded-xl p-5 text-center">
          <p className="text-[#F5A623] font-bold text-sm">{fn} hasn't set up payment methods yet</p>
          <p className="text-[#8C8580] text-xs mt-1">Let them know to finish their GigTab profile.</p>
        </div>
      )}

      <div className="mt-12 pt-6 border-t border-[#F0E8E0] text-center">
        <a href="/" className="inline-flex items-center gap-2 text-[#8C8580] hover:text-[#FF6B42] text-sm font-bold">
          <div className="w-5 h-5 rounded-lg bg-[#FF6B42] flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
          Create your own — it's free
        </a>
      </div>
    </div>
  </div>;
}
