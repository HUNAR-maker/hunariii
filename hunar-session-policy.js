/* HUNAR session policy v5
   Fresh navigation never restores an old authenticated session.
   Reload of the currently open HUNAR page preserves authentication and route.
   Returning to the already-open tab preserves it.
*/
(function(){
  'use strict';
  const STORAGE_KEY='hunar-auth-session';
  function navType(){try{return performance.getEntriesByType('navigation')[0]?.type||''}catch(e){return ''}}
  function isReload(){return navType()==='reload'}
  try{
    const existing=sessionStorage.getItem(STORAGE_KEY);
    if(existing && !isReload()){
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem('hunar_last_authenticated_route');
    }
    sessionStorage.setItem('hunar-tab-active','1');
  }catch(e){}
  try{
    if(window.supabase && typeof window.supabase.createClient==='function' && !window.__hunarSessionClientPatched){
      const original=window.supabase.createClient.bind(window.supabase);
      window.supabase.createClient=function(url,key,options){
        const opts=options||{};
        return original(url,key,{...opts,auth:{...(opts.auth||{}),persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storage:window.sessionStorage,storageKey:STORAGE_KEY}});
      };
      window.__hunarSessionClientPatched=true;
    }
  }catch(e){console.warn('HUNAR session policy setup:',e)}
})();