/* HUNAR safety layer: additive defense-in-depth. Existing business flows remain unchanged. */
(function(){
  'use strict';
  const LIMITS={
    message_send:{limit:8,window:60},
    application_submit:{limit:3,window:300},
    contract_create:{limit:5,window:300},
    contract_accept:{limit:5,window:300},
    contract_fund:{limit:4,window:600},
    payment_verify:{limit:10,window:300},
    withdrawal_request:{limit:3,window:600},
    identity_submit:{limit:2,window:3600},
    project_create:{limit:10,window:600},
    service_write:{limit:10,window:600},
    portfolio_write:{limit:10,window:600}
  };
  const inflight=new Map();
  const cooldowns=new Map();
  const logKey='hunar_safety_client_errors';
  const now=()=>Date.now();
  const userId=()=>window.productionUser?.id||window.me?.id||null;
  const route=()=>String(location.hash||'#home').slice(1).split('?')[0]||'home';
  function localLog(type,message,context){
    try{
      const old=JSON.parse(localStorage.getItem(logKey)||'[]');
      old.push({type:String(type||'client_error').slice(0,80),message:String(message||'').slice(0,500),route:route(),at:new Date().toISOString(),context:context||{}});
      localStorage.setItem(logKey,JSON.stringify(old.slice(-30)));
    }catch(_e){}
  }
  async function remoteLog(type,message,context){
    localLog(type,message,context);
    try{
      if(window.supabaseClient?.rpc&&userId()) await window.supabaseClient.rpc('hunar_log_client_error',{p_error_type:type,p_message:String(message||'').slice(0,1000),p_route:route(),p_context:context||{}});
    }catch(_e){}
  }
  async function rateLimit(action){
    const cfg=LIMITS[action];
    if(!cfg||!window.supabaseClient?.rpc||!userId())return true;
    try{
      const r=await window.supabaseClient.rpc('hunar_check_rate_limit',{p_action:action,p_limit:cfg.limit,p_window_seconds:cfg.window});
      if(r.error)return true;
      return r.data!==false;
    }catch(_e){return true;}
  }
  function duplicateKey(action,args){
    let s='';try{s=JSON.stringify(args||{});}catch(_e){s='';}
    return action+'|'+s.slice(0,500);
  }
  async function guard(action,args,fn){
    const key=duplicateKey(action,args);
    if(inflight.has(key)) throw new Error('This request is already being processed. Please wait.');
    const cooldownUntil=cooldowns.get(key)||0;
    if(cooldownUntil>now()) throw new Error('Please wait a moment before sending the same request again.');
    if(!(await rateLimit(action))) throw new Error('Too many requests. Please wait a moment and try again.');
    inflight.set(key,true);
    cooldowns.set(key,now()+1500);
    try{return await fn();}
    catch(e){await remoteLog(action+'_failed',e?.message||String(e),{});throw e;}
    finally{inflight.delete(key);}
  }
  function wrap(obj,name,action,argsFn){
    if(!obj||typeof obj[name]!=='function'||obj[name].__hunarSafetyWrapped)return;
    const original=obj[name];
    const wrapped=function(...args){return guard(action,argsFn?argsFn(args):args,()=>original.apply(this,args));};
    wrapped.__hunarSafetyWrapped=true;
    obj[name]=wrapped;
  }
  function install(){
    const d=window.HunarData;if(!d)return false;
    wrap(d.messaging,'send','message_send',a=>({to:a[0],body:String(a[1]||'').slice(0,120),project:a[2]||null,conversation:a[3]||null}));
    wrap(d.applications,'create','application_submit',a=>({project:a[0]?.project_id||null}));
    wrap(d.projects,'create','project_create',a=>({title:String(a[0]?.title||'').slice(0,100)}));
    wrap(d.contracts,'create','contract_create',a=>({application:a[0]||null}));
    wrap(d.contracts,'createDirect','contract_create',a=>({freelancer:a[0]||null}));
    wrap(d.contracts,'accept','contract_accept',a=>({contract:a[0]||null}));
    wrap(d.contracts,'fundContract','contract_fund',a=>({contract:a[0]||null}));
    wrap(d.wallet,'verifyContractPayment','payment_verify',a=>({contract:a[0]||null}));
    wrap(d.wallet,'requestWithdrawal','withdrawal_request',a=>({amount:a[0]?.amount_etb||null,method:a[0]?.method||null}));
    wrap(d.verification,'submit','identity_submit',a=>({idType:a[0]?.idType||null}));
    wrap(d.services,'create','service_write',a=>({title:String(a[0]?.title||'').slice(0,100)}));
    wrap(d.services,'update','service_write',a=>({id:a[0]||null}));
    wrap(d.portfolios,'create','portfolio_write',a=>({title:String(a[0]?.title||'').slice(0,100)}));
    wrap(d.portfolios,'update','portfolio_write',a=>({id:a[0]||null}));
    return true;
  }
  function bindFormLoading(){
    document.addEventListener('submit',function(e){
      const form=e.target;if(!(form instanceof HTMLFormElement)||form.dataset.hunarSafetyBound)return;
      form.dataset.hunarSafetyBound='1';
      setTimeout(function(){
        if(!form.isConnected)return;
        form.querySelectorAll('button[type="submit"]').forEach(btn=>{
          if(btn.dataset.hunarBusy==='1')return;
          btn.dataset.hunarBusy='1';btn.dataset.hunarOriginalText=btn.textContent;btn.disabled=true;btn.textContent='Please wait…';
          setTimeout(function(){
            if(!btn.isConnected)return;
            btn.disabled=false;btn.textContent=btn.dataset.hunarOriginalText||btn.textContent;btn.dataset.hunarBusy='';
          },20000);
        });
      },0);
    },false);
  }
  window.HunarSafety={remoteLog,rateLimit,guard,limits:LIMITS,install};
  window.addEventListener('error',function(e){remoteLog('uncaught_error',e?.message||'Browser error',{file:e?.filename||'',line:e?.lineno||0}).catch(()=>{});},{capture:true});
  window.addEventListener('unhandledrejection',function(e){const reason=e?.reason;remoteLog('unhandled_rejection',reason?.message||String(reason||'Unhandled promise rejection'),{}).catch(()=>{});});
  bindFormLoading();
  if(!install()){
    let tries=0;const timer=setInterval(function(){if(install()||++tries>20)clearInterval(timer)},100);
  }
})();

/* HUNAR session/mobile correction: preserve an existing Supabase session on refresh,
   restore the original route after startup, and keep the mobile profile menu accessible. */
(function(){
  'use strict';
  const initialRoute=(location.hash.slice(1).split('?')[0]||'home');
  const authRoutes=new Set(['signin','signup','register','forgot-password','reset-password','auth-callback','google-role']);
  let savedSession=null;
  let explicitLogout=false;
  let restored=false;

  function installStyles(){
    if(document.getElementById('hunar-mobile-profile-fix'))return;
    const style=document.createElement('style');
    style.id='hunar-mobile-profile-fix';
    style.textContent=`
      @media(max-width:600px){
        #right .profileTrigger{display:inline-flex!important;align-items:center!important;justify-content:center!important;visibility:visible!important;opacity:1!important;}
        #right .profileMenu{right:0;min-width:215px;max-width:calc(100vw - 24px);}
        #right .profileMenu button{white-space:nowrap!important;overflow:visible!important;line-height:1.25!important;}
      }
      @media(min-width:901px){
        .dash .side .dashLink{white-space:nowrap!important;overflow:visible!important;line-height:1.25!important;min-height:42px!important;}
        .dash .welcome h1,.dash .welcome p{color:#14221b!important;opacity:1!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function patchLogout(){
    if(typeof window.logout!=='function'||window.logout.__hunarSessionPatched)return;
    const original=window.logout;
    const wrapped=function(...args){
      explicitLogout=true;
      savedSession=null;
      try{sessionStorage.removeItem('hunar_refresh_session_backup');}catch(_e){}
      return original.apply(this,args);
    };
    wrapped.__hunarSessionPatched=true;
    window.logout=wrapped;
  }

  async function captureSession(){
    if(!window.supabaseClient?.auth)return false;
    try{
      const {data}=await window.supabaseClient.auth.getSession();
      if(data?.session?.access_token&&data?.session?.refresh_token&&!explicitLogout){
        savedSession=data.session;
        try{sessionStorage.setItem('hunar_refresh_session_backup',JSON.stringify({access_token:data.session.access_token,refresh_token:data.session.refresh_token}));}catch(_e){}
      }
      return true;
    }catch(_e){return false;}
  }

  async function restoreSession(){
    if(restored||explicitLogout||!window.supabaseClient?.auth)return false;
    let backup=savedSession;
    if(!backup){
      try{backup=JSON.parse(sessionStorage.getItem('hunar_refresh_session_backup')||'null');}catch(_e){backup=null;}
    }
    if(!backup?.access_token||!backup?.refresh_token)return false;
    try{
      const current=await window.supabaseClient.auth.getSession();
      if(current?.data?.session?.user)return false;
      const result=await window.supabaseClient.auth.setSession({access_token:backup.access_token,refresh_token:backup.refresh_token});
      if(result?.error||!result?.data?.session?.user)return false;
      restored=true;
      window.productionUser=result.data.session.user;
      try{
        if(window.HunarData?.accounts?.me){
          const account=await window.HunarData.accounts.me();
          window.me={id:account.id,role:account.role,email:account.email||result.data.session.user.email,phone:account.phone||'',emailVerified:!!(account.email_verified||result.data.session.user.email_confirmed_at),phoneVerified:!!account.phone_verified};
        }
      }catch(_e){
        window.me={id:result.data.session.user.id,role:result.data.session.user.user_metadata?.role||'freelancer',email:result.data.session.user.email||''};
      }
      try{if(typeof window.syncProductionData==='function')await window.syncProductionData();}catch(_e){}
      installStyles();
      if(!authRoutes.has(initialRoute)&&typeof window.render==='function')window.render(initialRoute);
      else if(typeof window.nav==='function')window.nav();
      return true;
    }catch(_e){return false;}
  }

  const timer=setInterval(async function(){
    installStyles();
    patchLogout();
    if(!window.supabaseClient?.auth)return;
    if(!savedSession&&!restored&&!explicitLogout){await captureSession();}
    if(savedSession&&!restored&&!explicitLogout){
      const routeNow=location.hash.slice(1).split('?')[0]||'home';
      /* The legacy startup bootstrap signs out once on a normal page load. If that
         happened, immediately restore the persisted session instead of logging out. */
      if(routeNow!== 'auth-callback') await restoreSession();
    }
    if(restored||explicitLogout){clearInterval(timer);}
  },250);
  window.addEventListener('beforeunload',function(){try{if(!explicitLogout&&savedSession)sessionStorage.setItem('hunar_refresh_session_backup',JSON.stringify({access_token:savedSession.access_token,refresh_token:savedSession.refresh_token}));}catch(_e){}});
})();
