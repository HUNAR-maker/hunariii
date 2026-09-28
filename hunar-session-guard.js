/* HUNAR session guard: preserve the authenticated session across refresh/background-resume. */
(function(){
  'use strict';
  let explicitLogout=false;
  let busy=false;

  function currentRoute(){return (location.hash||'#home').slice(1).split('?')[0]||'home';}
  function authRoute(r){return ['signin','signup','register','forgot-password','reset-password','auth-callback','google-role'].includes(r);}

  function patchLogout(){
    if(typeof window.logout!=='function'||window.logout.__hunarSessionGuard)return;
    const original=window.logout;
    window.logout=function(){
      explicitLogout=true;
      return original.apply(this,arguments);
    };
    window.logout.__hunarSessionGuard=true;
  }

  async function restore(){
    if(explicitLogout||busy||!window.supabaseClient?.auth)return;
    busy=true;
    try{
      let result=await window.supabaseClient.auth.getSession();
      let session=result?.data?.session||null;

      // If the access token expired while the mobile browser was suspended,
      // explicitly refresh it before treating the user as signed out.
      if(!session?.user){
        const refreshed=await window.supabaseClient.auth.refreshSession();
        if(!refreshed?.error)session=refreshed?.data?.session||null;
      }
      if(!session?.user||explicitLogout)return;

      window.productionUser=session.user;

      // Rebuild the lightweight account state when the page was restored by
      // the browser without running the normal dashboard bootstrap first.
      if(!window.me&&typeof window.getHunarOnboardingState==='function'){
        try{
          const state=await window.getHunarOnboardingState(session.user,null);
          if(state?.complete&&state.account){
            const a=state.account;
            window.me={id:a.id,role:a.role,email:a.email||session.user.email,phone:a.phone||'',emailVerified:!!(a.email_verified||session.user.email_confirmed_at),phoneVerified:!!a.phone_verified};
          }
        }catch(_e){}
      }

      const route=currentRoute();
      if(window.me&&!authRoute(route)&&typeof window.render==='function')window.render(route);
    }catch(_e){
      // A transient network/background-resume failure must never log the user out.
    }finally{busy=false;}
  }

  function start(){
    patchLogout();
    if(!window.supabaseClient?.auth){setTimeout(start,300);return;}
    patchLogout();
    restore();
    window.addEventListener('pageshow',()=>setTimeout(restore,80),{passive:true});
    window.addEventListener('focus',()=>setTimeout(restore,120),{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(restore,120);},{passive:true});
    window.supabaseClient.auth.onAuthStateChange((event)=>{
      if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')setTimeout(restore,0);
      // Do not react to SIGNED_OUT by redirecting or signing out again.
      // Only the explicit Log Out button sets explicitLogout=true.
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
