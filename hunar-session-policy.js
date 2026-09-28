/* HUNAR session policy v4
   Keep auth only for the currently open HUNAR tab.
   - Reload of an existing HUNAR page keeps the session and route.
   - Returning to an already-open HUNAR tab keeps the session.
   - A new navigation into HUNAR (Google/external site/direct URL) starts logged out.
*/
(function(){
  'use strict';
  const STORAGE_KEY='hunar-auth-session';
  function navigationType(){
    try{return performance.getEntriesByType('navigation')[0]?.type||''}catch(e){return ''}
  }
  function isReload(){return navigationType()==='reload'}
  function isSameOriginReferrer(){
    try{const r=document.referrer;if(!r)return false;return new URL(r).origin===location.origin}catch(e){return false}
  }
  function clearTabAuth(){
    try{
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem('hunar_last_authenticated_route');
      sessionStorage.removeItem('hunar_public_entry');
    }catch(e){}
  }
  try{
    const existing=!!sessionStorage.getItem(STORAGE_KEY);
    const sameOrigin=isSameOriginReferrer();
    const reload=isReload();
    /* A reload is the one navigation that must preserve the current session. */
    /* A fresh navigation into HUNAR from Google/external/direct URL must not. */
    if(existing && !reload && !sameOrigin) clearTabAuth();
  }catch(e){}

  try{
    if(window.supabase && typeof window.supabase.createClient==='function' && !window.__hunarSessionClientPatched){
      const originalCreateClient=window.supabase.createClient.bind(window.supabase);
      window.supabase.createClient=function(url,key,options){
        const opts=options||{};
        const auth={...(opts.auth||{}),persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storage:window.sessionStorage,storageKey:STORAGE_KEY};
        return originalCreateClient(url,key,{...opts,auth});
      };
      window.__hunarSessionClientPatched=true;
    }
  }catch(error){console.warn('HUNAR session policy setup:',error)}

  const AUTH_ROUTES=new Set(['dashboard','profile','performance','identity-verification','help','settings','account','myservices','find-freelancers','find-freelancer','marketplace','messages','projects','applications','notifications','saved','contracts','workspace','post-project','create-service']);
  function routeName(){return String(location.hash.slice(1)||'home').split('?')[0].replace(/^\//,'')||'home'}
  function rememberRoute(){
    try{
      const route=routeName();
      if(window.me && AUTH_ROUTES.has(route)) sessionStorage.setItem('hunar_last_authenticated_route',location.hash.slice(1));
    }catch(e){}
  }
  function installAfterApp(){
    try{
      const oldLogout=window.logout;
      if(typeof oldLogout==='function' && !window.__hunarLogoutWrapped){
        window.logout=function(){clearTabAuth();return oldLogout.apply(this,arguments)};
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
