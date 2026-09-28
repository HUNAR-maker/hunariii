/* HUNAR session policy v5
   Authentication belongs only to the currently open HUNAR browser tab.
   - Reloading the current HUNAR document keeps the session and current hash.
   - Switching to another app and returning to this same tab keeps the session.
   - A new HUNAR navigation (Google/external/direct URL) starts logged out.
   - A new tab starts logged out because sessionStorage is tab-scoped.
*/
(function(){
  'use strict';
  const STORAGE_KEY='hunar-auth-session';

  function navType(){
    try{return performance.getEntriesByType('navigation')[0]?.type||''}catch(e){return ''}
  }
  function isReload(){
    return navType()==='reload';
  }
  function sameOriginReferrer(){
    try{
      const ref=document.referrer;
      return !!ref && new URL(ref).origin===location.origin;
    }catch(e){return false}
  }
  function clearTabSession(){
    try{
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem('hunar_last_authenticated_route');
      sessionStorage.removeItem('hunar_public_entry');
    }catch(e){}
  }

  /* IMPORTANT:
     Do this before the Supabase client is created. A fresh navigation must
     not inherit the authentication from an older HUNAR visit in this tab.
  */
  try{
    const hasTabSession=!!sessionStorage.getItem(STORAGE_KEY);
    if(hasTabSession && !isReload() && !sameOriginReferrer()){
      clearTabSession();
    }
  }catch(e){}

  try{
    if(window.supabase && typeof window.supabase.createClient==='function' && !window.__hunarSessionClientPatched){
      const originalCreateClient=window.supabase.createClient.bind(window.supabase);
      window.supabase.createClient=function(url,key,options){
        const opts=options||{};
        const auth={
          ...(opts.auth||{}),
          persistSession:true,
          autoRefreshToken:true,
          detectSessionInUrl:false,
          storage:window.sessionStorage,
          storageKey:STORAGE_KEY
        };
        return originalCreateClient(url,key,{...opts,auth});
      };
      window.__hunarSessionClientPatched=true;
    }
  }catch(error){
    console.warn('HUNAR session policy setup:',error);
  }

  const AUTH_ROUTES=new Set([
    'dashboard','profile','performance','identity-verification','help','settings',
    'account','myservices','find-freelancers','find-freelancer','marketplace',
    'messages','projects','applications','notifications','saved','contracts',
    'workspace','post-project','create-service'
  ]);

  function routeName(){
    return String(location.hash.slice(1)||'home').split('?')[0].replace(/^\//,'')||'home';
  }

  function rememberRoute(){
    try{
      const route=routeName();
      if(window.me && AUTH_ROUTES.has(route)){
        sessionStorage.setItem('hunar_last_authenticated_route',location.hash.slice(1));
      }
    }catch(e){}
  }

  function installAfterApp(){
    try{
      const oldLogout=window.logout;
      if(typeof oldLogout==='function' && !window.__hunarLogoutWrapped){
        window.logout=function(){
          clearTabSession();
          return oldLogout.apply(this,arguments);
        };
        window.__hunarLogoutWrapped=true;
      }
      window.addEventListener('hashchange',rememberRoute,{passive:true});
      window.addEventListener('popstate',rememberRoute,{passive:true});
      window.addEventListener('beforeunload',rememberRoute,{passive:true});
      rememberRoute();
    }catch(error){
      console.warn('HUNAR session policy install:',error);
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(installAfterApp,0),{once:true});
  }else{
    setTimeout(installAfterApp,0);
  }
})();
