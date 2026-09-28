/* HUNAR session policy
   Keep authentication for the current browser tab only.
   Refreshing/revisiting HUNAR in the same tab keeps the Supabase session and the
   last authenticated route. A new tab/window does not inherit the session.
*/
(function(){
  'use strict';

  // This runs BEFORE the main HUNAR inline application script because the Pages
  // workflow injects this file into <head>. Force Supabase Auth to use
  // sessionStorage rather than its default localStorage.
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
        window.logout=function(){
          try{sessionStorage.removeItem('hunar_last_authenticated_route')}catch(e){}
          return oldLogout.apply(this,arguments);
        };
        window.__hunarLogoutWrapped=true;
      }

      window.addEventListener('hashchange',rememberRoute,{passive:true});
      window.addEventListener('popstate',rememberRoute,{passive:true});
      window.addEventListener('beforeunload',rememberRoute,{passive:true});
      rememberRoute();

      // If the user left HUNAR in this same tab and later opened the site root,
      // return to the page they were using instead of landing on the homepage.
      // A fresh tab has a fresh sessionStorage, so it cannot auto-sign in.
      setTimeout(async function(){
        try{
          const client=window.supabaseClient;
          if(!client)return;
          const {data}=await client.auth.getSession();
          const session=data&&data.session;
          if(!session||!session.user)return;
          const current=routeName();
          const last=sessionStorage.getItem('hunar_last_authenticated_route');
          if((!location.hash || current==='home') && last){
            const lastRoute=String(last).split('?')[0];
            if(AUTH_ROUTES.has(lastRoute) && typeof window.go==='function') window.go(last);
          }
        }catch(error){console.warn('HUNAR route restore skipped:',error)}
      },700);
    }catch(error){console.warn('HUNAR session policy install:',error)}
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(installAfterApp,0));
  else setTimeout(installAfterApp,0);
})();
