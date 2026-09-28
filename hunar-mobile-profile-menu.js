/* HUNAR mobile profile/avatar menu — requested seven-item mobile menu only. */
(function(){
  'use strict';
  const ITEMS=[
    ['Profile','profile'],
    ['Performance','performance'],
    ['Identity Verification','identity-verification'],
    ['Help / Support','help'],
    ['Settings','settings'],
    ['Account','account'],
    ['Log Out','logout']
  ];
  let menu=null;
  function isMobile(){return window.matchMedia('(max-width: 600px)').matches;}
  function close(){if(menu){menu.remove();menu=null;}}
  function goTo(route){
    close();
    if(route==='logout'){
      if(typeof window.logout==='function') return window.logout();
      if(typeof window.signOut==='function') return window.signOut();
      if(typeof window.supabaseClient!=='undefined' && window.supabaseClient?.auth) return window.supabaseClient.auth.signOut();
      return;
    }
    if(typeof window.go==='function') return window.go(route);
    if(typeof window.navigate==='function') return window.navigate(route);
  }
  function open(anchor){
    close();
    menu=document.createElement('div');
    menu.className='hunar-mobile-profile-menu';
    menu.setAttribute('role','menu');
    ITEMS.forEach(([label,route])=>{
      const b=document.createElement('button');
      b.type='button'; b.textContent=label; b.setAttribute('role','menuitem');
      if(route==='logout') b.className='logoutItem';
      b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();goTo(route);});
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    const r=anchor.getBoundingClientRect();
    const width=Math.min(240,window.innerWidth-24);
    menu.style.width=width+'px';
    menu.style.top=Math.min(window.innerHeight-menu.offsetHeight-12,r.bottom+8)+'px';
    menu.style.left=Math.max(12,Math.min(window.innerWidth-width-12,r.right-width))+'px';
  }
  function bind(){
    if(!isMobile()) return;
    const trigger=document.querySelector('.profileTrigger');
    if(!trigger || trigger.dataset.hunarMobileMenuBound==='1') return;
    trigger.dataset.hunarMobileMenuBound='1';
    trigger.addEventListener('click',function(e){
      e.preventDefault(); e.stopImmediatePropagation();
      if(menu) close(); else open(trigger);
    },true);
  }
  document.addEventListener('click',function(e){
    if(menu && !menu.contains(e.target) && !e.target.closest('.profileTrigger')) close();
  });
  window.addEventListener('resize',close);
  window.addEventListener('scroll',close,true);
  const observer=new MutationObserver(bind);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  bind();
})();
