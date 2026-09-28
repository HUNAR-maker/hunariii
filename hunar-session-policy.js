/* HUNAR session policy v3
   Session is tab-scoped: refresh/return to the same open tab keeps the user
   exactly where they were, but a fresh public entry must never auto-login.
*/
(function(){
  'use strict';
  try{
    const hasTabSession=!!sessionStorage.getItem('hunar-auth-session');
    if(!hasTabSession){
      for(let i=localStorage.length-1;i>=0;i--){
        const k=localStorage.key(i)||'';
        if(k.startsWith('sb-') || k.toLowerCase().includes('supabase.auth')) localStorage.removeItem(k);
      }
    }
  }catch(e){}
  try{
    if(window.supabase && typeof window.supabase.createClient==='function' && !window.__hunarSessionClientPatched){
      const originalCreateClient=window.supabase.createClient.bind(window.supabase);
      window.supabase.createClient=function(url,key,options){
        const opts=options||{};
        const auth={...(opts.auth||{}),persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storage:window.sessionStorage,storageKey:'hunar-auth-session'};
        return originalCreateClient(url,key,{...opts,auth});
      };
      window.__hunarSessionClientPatched=true;
    }
  }catch(error){console.warn('HUNAR session policy setup:',error)}
  const AUTH_ROUTES=new Set(['dashboard','profile','performance','identity-verification','help','settings','account','myservices','find-freelancers','find-freelancer','marketplace','messages','projects','applications','notifications','saved','contracts','workspace','post-project','create-service']);
  function routeName(){return String(location.hash.slice(1)||'home').split('?')[0].replace(/^\//,'')||'home'}
  function suppressFreshPublicAutoLogin(){
    try{
      if(routeName()!=='home') return;
      const hasTabSession=!!sessionStorage.getItem('hunar-auth-session');
      const ref=document.referrer||'';
      const sameOrigin=ref && (()=>{try{return new URL(ref).origin===location.origin}catch(e){return false}})();
      if(hasTabSession || sameOrigin) return;
      sessionStorage.removeItem('hunar_last_authenticated_route');
      sessionStorage.removeItem('hunar_public_entry');
      sessionStorage.setItem('hunar_public_entry','1');
      if(window.supabaseClient?.auth) window.supabaseClient.auth.signOut({scope:'local'}).catch(()=>{});
    }catch(error){console.warn('HUNAR public-entry session reset skipped:',error)}
  }
  suppressFreshPublicAutoLogin();
  function rememberRoute(){
    try{
      const route=routeName();
      if(window.me && AUTH_ROUTES.has(route)){
        sessionStorage.removeItem('hunar_public_entry');
        sessionStorage.setItem('hunar_last_authenticated_route',location.hash.slice(1));
      }
    }catch(e){}
  }
  function installAfterApp(){
    try{
      const oldLogout=window.logout;
      if(typeof oldLogout==='function' && !window.__hunarLogoutWrapped){
        window.logout=function(){
          try{sessionStorage.removeItem('hunar_last_authenticated_route');sessionStorage.removeItem('hunar_public_entry');sessionStorage.removeItem('hunar-auth-session')}catch(e){}
          return oldLogout.apply(this,arguments);
        };
        window.__hunarLogoutWrapped=true;
      }
      window.addEventListener('hashchange',rememberRoute,{passive:true});
      window.addEventListener('popstate',rememberRoute,{passive:true});
      window.addEventListener('beforeunload',rememberRoute,{passive:true});
      rememberRoute();
    }catch(error){console.warn('HUNAR session policy install:',error)}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(installAfterApp,0));
  else setTimeout(installAfterApp,0);
})();
