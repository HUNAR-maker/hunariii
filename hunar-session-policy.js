/* HUNAR session policy v2
   Keep authentication for the current browser tab only.
   Refreshing an authenticated page keeps the session and that page.
   Opening the public HUNAR entry point from Google, another site, a bookmark,
   or a fresh direct navigation does NOT automatically sign the user in.
*/
(function(){
  'use strict';

  // Supabase must keep the session for refreshes in THIS tab, not localStorage.
  try{
    if(window.supabase && typeof window.supabase.createClient==='function' && !window.__hunarSessionClientPatched){
      const originalCreateClient=window.supabase.createClient.bind(window.supabase);
      window.supabase.createClient=function(url,key,options){
        const opts=options||{};
        const auth={...(opts.auth||{}),persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.sessionStorage,storageKey:'hunar-auth-session'};
        return originalCreateClient(url,key,{...opts,auth});
      };
      window.__hunarSessionClientPatched=true;
    }
  }catch(error){console.warn('HUNAR session policy setup:',error)}

  const AUTH_ROUTES=new Set(['dashboard','profile','performance','identity-verification','help','settings','account','myservices','find-freelancers','find-freelancer','marketplace','messages','projects','applications','notifications','saved','contracts','workspace','post-project','create-service']);
  function routeName(){return String(location.hash.slice(1)||'home').split('?')[0].replace(/^\//,'')||'home'}

  // IMPORTANT: arriving at HUNAR's public root is NOT an automatic sign-in event.
  // If the user reached the root from Google/an external site, a bookmark, or a
  // direct address-bar entry, clear only this tab's stored auth before the app
  // boots. We use local scope so other devices/sessions are untouched.
  function suppressFreshPublicAutoLogin(){
    try{
      if(routeName()!=='home') return;
      const ref=document.referrer||'';
      const sameOrigin=ref && (()=>{try{return new URL(ref).origin===location.origin}catch(e){return false}})();
      if(sameOrigin) return; // internal HUNAR navigation should keep its session.
      sessionStorage.removeItem('hunar_last_authenticated_route');
      sessionStorage.removeItem('hunar-auth-session');
      sessionStorage.setItem('hunar_public_entry','1');
      if(window.supabaseClient && window.supabaseClient.auth){
        window.supabaseClient.auth.signOut({scope:'local'}).catch(()=>{});
      }
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
          try{
            sessionStorage.removeItem('hunar_last_authenticated_route');
            sessionStorage.removeItem('hunar_public_entry');
            sessionStorage.removeItem('hunar-auth-session');
          }catch(e){}
          return oldLogout.apply(this,arguments);
        };
        window.__hunarLogoutWrapped=true;
      }
      window.addEventListener('hashchange',rememberRoute,{passive:true});
      window.addEventListener('popstate',rememberRoute,{passive:true});
      window.addEventListener('beforeunload',rememberRoute,{passive:true});
      rememberRoute();

      // Never redirect a fresh public visit back into an authenticated route.
      // A same-tab authenticated URL (messages, dashboard, etc.) is left alone.
      setTimeout(function(){
        try{
          if(sessionStorage.getItem('hunar_public_entry')==='1' && routeName()==='home'){
            if(window.me){ window.me=null; window.productionUser=null; }
            if(typeof window.render==='function') window.render('home');
          }
        }catch(error){console.warn('HUNAR public entry render skipped:',error)}
      },50);
    }catch(error){console.warn('HUNAR session policy install:',error)}
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(installAfterApp,0));
  else setTimeout(installAfterApp,0);
})();
